import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import releaseLifecycle from "../../../../config/release-lifecycle.json" with { type: "json" };
import { V072_RULES_VERSION } from "../../../../rules-assistant/v072-release-corpus.js";
import worker from "../../../../rules-assistant/admin-refinement-worker.js";
import {
  handleClientSourceLookupReview,
  sanitizeClientSourceLookupPayload
} from "../../../../rules-assistant/source-lookup-review.js";

function fakeDb() {
  const state = { batches: 0, runs: 0, batchStatements: [] };
  return {
    state,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            sql,
            params,
            async first() {
              return null;
            },
            async run() {
              state.runs += 1;
              return { meta: { changes: 1 } };
            }
          };
        }
      };
    },
    async batch(statements) {
      state.batches += 1;
      state.batchStatements.push(...statements);
      return [];
    }
  };
}

const CURRENT_RULES_VERSION = releaseLifecycle.current_release;
const HISTORICAL_REVIEW_VERSION = "v0.7.1";

const validPayload = {
  rulesVersion: CURRENT_RULES_VERSION,
  sessionId: "session_12345",
  question: "Can I do this during Opening?",
  answer: "The AI ruling service is unavailable. The closest canonical passages are shown below.",
  rulingStatus: "explicit",
  mode: "ai_verified",
  model: "untrusted-client-value",
  sources: [
    {
      id: "S1",
      title: "Financial Capacity",
      sourcePath: "releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md",
      sourceUrl: "https://gauntlet.run/rulebook/#financial-capacity",
      excerpt: "Canonical source excerpt"
    }
  ]
};

describe("client source-lookup review capture", () => {
  it("takes the current review version from the release lifecycle and matching frozen corpus", () => {
    expect(CURRENT_RULES_VERSION).toBe(V072_RULES_VERSION);
    expect(releaseLifecycle.releases[CURRENT_RULES_VERSION].status).toBe("current");
    expect(releaseLifecycle.releases[CURRENT_RULES_VERSION].authority_set_id).toBe(
      releaseLifecycle.releases[CURRENT_RULES_VERSION].frozen_authority_set_id
    );
  });

  it("forces client fallback records to source-lookup semantics", () => {
    const record = sanitizeClientSourceLookupPayload(validPayload);
    expect(record.gameVersion).toBe(CURRENT_RULES_VERSION);
    expect(record.rulingStatus).toBe("source_lookup");
    expect(record.mode).toBe("source_lookup");
    expect(record.model).toBeNull();
    expect(record.sources).toHaveLength(1);
  });

  it("preserves historical v0.7.1 queued reviews under their own version", () => {
    const historical = sanitizeClientSourceLookupPayload({
      ...validPayload,
      rulesVersion: HISTORICAL_REVIEW_VERSION,
      sources: [{ ...validPayload.sources[0], sourcePath: "releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md" }]
    });
    expect(historical.gameVersion).toBe(HISTORICAL_REVIEW_VERSION);
    expect(historical.mode).toBe("source_lookup");
    expect(historical.model).toBeNull();
  });

  it.each(["v0.7.0", "v0.7.3-candidate", "", "v0.7.2-candidate"])(
    "rejects unsupported or unrecognized version %s", (rulesVersion) => {
      expect(() => sanitizeClientSourceLookupPayload({ ...validPayload, rulesVersion }))
        .toThrow(`Only ${CURRENT_RULES_VERSION} (current) or ${HISTORICAL_REVIEW_VERSION} (historical) source lookups`);
    }
  );

  it("allows the public site to preflight fallback review capture", async () => {
    const response = await handleClientSourceLookupReview(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      { method: "OPTIONS", headers: { Origin: "https://gauntlet.run" } }
    ), {});
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://gauntlet.run");
  });

  it("persists a valid public-site source lookup without invoking a model", async () => {
    const db = fakeDb();
    const response = await handleClientSourceLookupReview(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      {
        method: "POST",
        headers: {
          Origin: "https://gauntlet.run",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(validPayload)
      }
    ), { DB: db });
    expect(response.status).toBe(201);
    expect(db.state.batches).toBe(1);
    expect(db.state.runs).toBe(1);
    expect(db.state.batchStatements[0].params[8]).toBe(CURRENT_RULES_VERSION);
    expect(await response.json()).toMatchObject({ ok: true });
  });
  it("accepts the current browser queue payload through the deployed Worker entrypoint", async () => {
    const db = fakeDb();
    const response = await worker.fetch(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      {
        method: "POST",
        headers: { Origin: "https://gauntlet.run", "Content-Type": "application/json" },
        body: JSON.stringify(validPayload)
      }
    ), { DB: db, ALLOWED_ORIGINS: "https://gauntlet.run", OPENAI_API_KEY: "must-not-be-used" });
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.ok).toBe(true);
    expect(result.interactionId).toBeTruthy();
    expect(db.state.batchStatements[0].params[8]).toBe(CURRENT_RULES_VERSION);
    expect(db.state.batchStatements[0].params[10]).toBe("source_lookup");
    expect(db.state.batchStatements[0].params[14]).toBeNull();
  });

  it("rejects unsupported version through deployed route without writing to D1", async () => {
    const db = fakeDb();
    const response = await worker.fetch(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      {
        method: "POST",
        headers: { Origin: "https://gauntlet.run", "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, rulesVersion: "v0.7.3-candidate" })
      }
    ), { DB: db, ALLOWED_ORIGINS: "https://gauntlet.run" });
    expect(response.status).toBe(400);
    expect(db.state.batches).toBe(0);
  });

  it("keeps the origin and D1 availability checks fail-closed", async () => {
    const blockedDb = fakeDb();
    const blocked = await handleClientSourceLookupReview(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      {
        method: "POST",
        headers: { Origin: "https://example.invalid", "Content-Type": "application/json" },
        body: JSON.stringify(validPayload)
      }
    ), { DB: blockedDb });
    expect(blocked.status).toBe(403);
    expect(blockedDb.state.batches).toBe(0);

    const unavailable = await handleClientSourceLookupReview(new Request(
      "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/source-lookup-review",
      {
        method: "POST",
        headers: { Origin: "https://gauntlet.run", "Content-Type": "application/json" },
        body: JSON.stringify(validPayload)
      }
    ), {});
    expect(unavailable.status).toBe(503);
  });
});

describe("public fallback presentation regression", () => {
  it("queues failed remote questions for later review capture and removes internal annotations from display", () => {
    const app = readFileSync(resolve("apps/rules-arbiter/app.js"), "utf8");
    expect(app).toContain("/api/source-lookup-review");
    expect(app).toContain("SOURCE_LOOKUP_REVIEW_QUEUE_KEY");
    expect(app).toContain("rulesVersion: RULES_VERSION");
    expect(app).toContain('V072_RULES_VERSION as RULES_VERSION');
    expect(app).toContain("queueFallbackReview(question, fallback)");
    expect(app).toContain("flushFallbackReviewQueue");
    expect(app).toContain("replace(/<!--[\\s\\S]*?-->/g");
    expect(app).toContain("replace(/<![^>]*>/g");
    expect(app).toContain("playerFacingAnswer(result)");
  });

  it("routes current fallback review capture outside the paid answer path", () => {
    const entry = readFileSync(resolve("rules-assistant/worker-entry.js"), "utf8");
    expect(entry).toContain('url.pathname === "/api/source-lookup-review"');
    expect(entry).toContain("handleClientSourceLookupReview(request, env)");
  });

  it("builds the v0.7.1 search corpus from annotation-free Rulebook text while hashing the published bytes", () => {
    const corpus = readFileSync(resolve("legacy/rules-assistant/v071/v071-public-corpus.js"), "utf8");
    expect(corpus).toContain("const cleanRulebookMarkdown = stripRulebookAnnotations(rulebookMarkdown)");
    expect(corpus).toContain("rulebookMarkdown: cleanRulebookMarkdown");
    expect(corpus).toContain("sha256(rulebookBytes)");
  });
});
