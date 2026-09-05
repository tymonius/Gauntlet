import { expect, test } from "vitest";
import worker from "./admin-refinement-worker.js";
import { adminRefinementRuntimeSource } from "./admin-refinement-runtime.js";

function scriptsFrom(html) {
  return [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

function fakeDb(interaction, audit = null) {
  return {
    prepare(sql) {
      const text = String(sql);
      return {
        bind() { return this; },
        async all() {
          if (text.includes("FROM rules_interactions") && !text.includes("JOIN")) return { results: [interaction] };
          if (text.includes("FROM rules_interaction_sources")) return { results: [] };
          if (text.includes("FROM rules_interaction_reviews")) return { results: [] };
          if (text.includes("FROM rules_interaction_audits")) return { results: audit ? [audit] : [] };
          if (text.includes("FROM rules_interaction_diagnostics")) return { results: [] };
          return { results: [] };
        }
      };
    }
  };
}

function refinementEnv(overrides = {}, audit = null) {
  const interaction = {
    id: "11111111-1111-4111-8111-111111111111",
    session_id: "session-a",
    sequence_index: 1,
    created_at: "2026-09-04T20:00:00.000Z",
    question: "When does this effect end?",
    answer: "The current rules do not specify this clearly.",
    review_status: "needs_correction",
    ruling_status: "provisional",
    ruling_status_v2: "provisional",
    confidence: "low",
    source_count: 0,
    feedback_rating: "incorrect",
    issue_types_json: "[\"retrieval_failure\"]",
    ...overrides
  };
  return {
    SITE_ORIGIN: "https://gauntlet.run",
    ADMIN_TOKEN: "test-token",
    DB: fakeDb(interaction, audit)
  };
}

function authorizedRequest(path) {
  return new Request(`https://gauntlet-rules-assistant.example${path}`, {
    headers: { Authorization: "Bearer test-token" }
  });
}

test("deployed admin response embeds the refinement runtime inline", async () => {
  const response = await worker.fetch(
    new Request("https://gauntlet-rules-assistant.example/admin"),
    { SITE_ORIGIN: "https://gauntlet.run" },
    {}
  );
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("text/html");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Security-Policy")).toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(html).toContain('id="rules-refinement-inline-runtime"');
  expect(html).toContain("Refinement runtime starting…");
  expect(html).toContain("Refinement runtime initialized; loading triage…");
  expect(html).toContain("Resolved by refinement");
  expect(html).not.toContain('src="/admin-refinement-runtime.js"');
  expect(html).toContain(adminRefinementRuntimeSource());

  const scripts = scriptsFrom(html);
  expect(scripts.length).toBeGreaterThanOrEqual(2);
  for (const source of scripts) expect(() => new Function(source)).not.toThrow();
});

test("Worker computes reviewed-backlog triage server-side", async () => {
  const response = await worker.fetch(
    authorizedRequest("/api/admin/refinement-triage?scope=reviewed_backlog"),
    refinementEnv(),
    {}
  );
  expect(response.status).toBe(200);
  const report = await response.json();
  expect(report.schema).toBe("gauntlet.rules-triage.v1");
  expect(report.scope).toBe("reviewed_backlog");
  expect(report.stats.eligible).toBe(1);
  expect(report.stats.high).toBe(1);
  expect(report.stats.resolvedByRefinement).toBe(0);
  expect(report.clusters[0].rootCause).toBe("retrieval");
});

test("Worker retires ledger-resolved interactions from active reviewed backlog", async () => {
  const response = await worker.fetch(
    authorizedRequest("/api/admin/refinement-triage?scope=reviewed_backlog"),
    refinementEnv({
      id: "f9ae058b-e4de-4140-bd1f-189879e77678",
      question: "Penance's opponent has an empty Hand. May they choose the discard option anyway?",
      issue_types_json: "[\"ambiguous_rule\"]",
      source_count: 1
    }),
    {}
  );
  expect(response.status).toBe(200);
  const report = await response.json();
  expect(report.stats.eligible).toBe(0);
  expect(report.stats.resolvedByRefinement).toBe(1);
  expect(report.clusters).toEqual([]);
  expect(report.resolvedByRefinement[0]).toEqual(expect.objectContaining({
    interactionId: "f9ae058b-e4de-4140-bd1f-189879e77678",
    resolutionId: "available-choice-rule-v071",
    resolutionSurface: "rules_authority"
  }));
});

test("Worker builds selected refinement scaffold server-side", async () => {
  const response = await worker.fetch(
    authorizedRequest("/api/admin/refinement-scaffold?scope=reviewed_backlog&rootCause=retrieval"),
    refinementEnv(),
    {}
  );
  expect(response.status).toBe(200);
  const scaffold = await response.json();
  expect(scaffold.schema).toBe("gauntlet.rules-refinement-scaffold.v1");
  expect(scaffold.rootCause).toBe("retrieval");
  expect(scaffold.cluster.interactionIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
  expect(scaffold.privacy.publicManifestOmits).toContain("player question text");
});

test("server refinement API preserves admin authorization", async () => {
  const response = await worker.fetch(
    new Request("https://gauntlet-rules-assistant.example/api/admin/refinement-triage?scope=reviewed_backlog"),
    refinementEnv(),
    {}
  );
  expect(response.status).toBe(401);
});
