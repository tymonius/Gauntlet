import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import worker from "./smart-worker.js";

const source = readFileSync(new URL("./smart-worker.js", import.meta.url), "utf8");
const persistenceSource = readFileSync(new URL("./rules-persistence.js", import.meta.url), "utf8");

test("smart worker advertises the new intelligence capabilities", async () => {
  const response = await worker.fetch(new Request("https://rules.example/health"), {}, {});
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.structuredQuestionPlanning).toBe(true);
  expect(payload.relationshipAwareRetrieval).toBe(true);
  expect(payload.adaptiveReasoning).toBe(true);
  expect(payload.independentVerification).toBe(true);
  expect(payload.structuredGameStateSupported).toBe(true);
});

test("smart rules route retains origin and configuration guards", async () => {
  const noOrigin = await worker.fetch(new Request("https://rules.example/api/rules", {
    method: "POST",
    body: JSON.stringify({ question: "How many cards do I draw?" })
  }), {}, {});
  expect(noOrigin.status).toBe(403);

  const noKey = await worker.fetch(new Request("https://rules.example/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://rules.example" },
    body: JSON.stringify({ question: "How many cards do I draw?" })
  }), {}, {});
  expect(noKey.status).toBe(503);
});

test("complex answers use semantic planning, adaptive effort, verification, and one retrieval retry", () => {
  expect(source).toContain("planQuestion");
  expect(source).toContain("chooseReasoningEffort");
  expect(source).toContain("verifyDraft");
  expect(source).toContain("verification.missing_queries");
  expect(source).toContain("retryCount = 1");
  expect(persistenceSource).toContain("rules_interaction_diagnostics");
});
