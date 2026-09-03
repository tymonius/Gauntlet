import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const migration = readFileSync(new URL("./migrations/0007_rules_intelligence.sql", import.meta.url), "utf8");
const worker = readFileSync(new URL("./review-intelligence.js", import.meta.url), "utf8");
const entry = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

test("migration stores answer-time diagnostics separately from reviewed conclusions", () => {
  expect(migration).toContain("CREATE TABLE IF NOT EXISTS rules_interaction_diagnostics");
  expect(migration).toContain("candidate_sources_json");
  expect(migration).toContain("verifier_json");
  expect(migration).toContain("CREATE TABLE IF NOT EXISTS rules_interaction_audits");
  expect(migration).toContain("historical_accuracy");
  expect(migration).toContain("current_validity");
  expect(migration).toContain("CREATE TABLE IF NOT EXISTS rules_interaction_audit_history");
});

test("audit import is version-aware and never automatically promotes precedent", () => {
  expect(worker).toContain("reviewedAgainstVersion");
  expect(worker).toContain("reviewedAgainstCorpusHash");
  expect(worker).toContain('loadArchivedCorpus(env, "v0.6.0")');
  expect(worker).toContain("byVersion");
  expect(worker).toContain("versioned_precedent_candidate");
  expect(worker).not.toContain("INSERT INTO rules_clarifications");
});

test("production entry preserves review, admin, and normal answer routes", () => {
  expect(entry).toContain('url.pathname === "/api/admin/review-audits"');
  expect(entry).toContain('request.method === "GET" && url.pathname === "/api/admin/interactions"');
  expect(entry).toContain("return handleReviewIntelligence(request, env)");
  expect(entry).toContain('request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)');
  expect(entry).toContain("new Response(addDeveloperToolChrome(addSiteFaviconLinks(ADMIN_PAGE, origin), origin)");
  expect(entry).toContain("return smartWorker.fetch(request, env, context)");
  expect(entry).toContain("return reliableWorker.fetch(request, env, context)");
});


test("automated v0.7.1 QA sessions stay out of normal review queues", () => {
  expect(worker).toContain("session_id NOT LIKE 'qa_v071_%'");
  expect(worker.match(/session_id NOT LIKE 'qa_v071_%'/g)?.length).toBeGreaterThanOrEqual(2);
});
