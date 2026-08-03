import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import worker from "./smart-worker.js";

const source = readFileSync(new URL("./smart-worker.js", import.meta.url), "utf8");
const persistenceSource = readFileSync(new URL("./rules-persistence.js", import.meta.url), "utf8");

test("smart worker advertises deterministic packets and the experimental accuracy gate", async () => {
  const response = await worker.fetch(new Request("https://rules.example/health"), {}, {});
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.deterministicRuleAnswers).toBe(true);
  expect(payload.explicitRulePackets).toBe(true);
  expect(payload.structuredSubjectContinuity).toBe(true);
  expect(payload.relationshipAwareRetrieval).toBe(true);
  expect(payload.semanticPlanningEnabled).toBe(false);
  expect(payload.independentVerificationEnabled).toBe(false);
  expect(payload.oneModelCallDefault).toBe(true);
  expect(payload.structuredGameStateSupported).toBe(true);
  expect(payload.experimental).toBe(true);
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

test("deterministic rulings run before the model and persist complete diagnostics", () => {
  expect(source).toContain("resolveDeterministicRuling");
  expect(source).toContain("buildRulePacket");
  expect(source).toContain("prioritizeRulePacketSources");
  expect(source).toContain('mode: "retrieval_only"');
  expect(source).toContain('executionPath: "deterministic"');
  expect(source.indexOf("resolveDeterministicRuling")).toBeLessThan(source.indexOf("answerQuestion({"));
  expect(source).not.toContain("verification.missing_queries");
  expect(source).not.toContain("retryCount = 1");
  expect(persistenceSource).toContain("rules_interaction_diagnostics");
});
