import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  handleClientSourceLookupReview,
  sanitizeClientSourceLookupPayload
} from "./source-lookup-review.js";

function fakeDb() {
  const state = { batches: 0, runs: 0 };
  return {
    state,
    prepare() {
      return {
        bind() {
          return {
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
    async batch() {
      state.batches += 1;
      return [];
    }
  };
}

const validPayload = {
  rulesVersion: "v0.7.1",
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
      sourcePath: "releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md",
      sourceUrl: "https://gauntlet.run/rulebook/#financial-capacity",
      excerpt: "Canonical source excerpt"
    }
  ]
};

describe("client source-lookup review capture", () => {
  it("forces client fallback records to source-lookup semantics", () => {
    const record = sanitizeClientSourceLookupPayload(validPayload);
    expect(record.gameVersion).toBe("v0.7.1");
    expect(record.rulingStatus).toBe("source_lookup");
    expect(record.mode).toBe("source_lookup");
    expect(record.model).toBeNull();
    expect(record.sources).toHaveLength(1);
  });

  it("rejects non-current release payloads", () => {
    expect(() => sanitizeClientSourceLookupPayload({
      ...validPayload,
      rulesVersion: "v0.7.0"
    })).toThrow("Only v0.7.1 source lookups");
  });

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
    expect(await response.json()).toMatchObject({ ok: true });
  });
});

describe("public fallback presentation regression", () => {
  it("queues failed remote questions for later review capture and removes internal annotations from display", () => {
    const app = readFileSync(resolve("rules-arbiter/app.js"), "utf8");
    expect(app).toContain("/api/source-lookup-review");
    expect(app).toContain("SOURCE_LOOKUP_REVIEW_QUEUE_KEY");
    expect(app).toContain("queueFallbackReview(question, fallback)");
    expect(app).toContain("flushFallbackReviewQueue");
    expect(app).toContain("replace(/<!--[\\s\\S]*?-->/g");
    expect(app).toContain("replace(/<![^>]*>/g");
    expect(app).toContain("playerFacingAnswer(result)");
  });

  it("routes capture outside the paid v0.7.1 answer path", () => {
    const entry = readFileSync(resolve("rules-assistant/worker-entry.js"), "utf8");
    expect(entry).toContain('url.pathname === "/api/source-lookup-review"');
    expect(entry).toContain("handleClientSourceLookupReview(request, env)");
  });

  it("builds the v0.7.1 search corpus from annotation-free Rulebook text while hashing the published bytes", () => {
    const corpus = readFileSync(resolve("rules-assistant/v071-public-corpus.js"), "utf8");
    expect(corpus).toContain("const cleanRulebookMarkdown = stripRulebookAnnotations(rulebookMarkdown)");
    expect(corpus).toContain("rulebookMarkdown: cleanRulebookMarkdown");
    expect(corpus).toContain("sha256(rulebookBytes)");
  });
});
