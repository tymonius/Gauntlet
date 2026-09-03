import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const reviewIntelligence = readFileSync(new URL("./review-intelligence.js", import.meta.url), "utf8");
const workerV071 = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const adminPage = readFileSync(new URL("./admin-intelligence-page.js", import.meta.url), "utf8");
const benchmark = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-evals.v071.json", import.meta.url),
  "utf8"
));

describe("v0.7.1 Rules Arbiter QA foundation", () => {
  test("review exports use the actual current v0.7.1 published corpus", () => {
    expect(reviewIntelligence).toContain('from "./v071-public-corpus.js"');
    expect(reviewIntelligence).toContain("defaultV071SourceUrls");
    expect(reviewIntelligence).toContain("loadV071RulesCorpus");
    expect(reviewIntelligence).not.toContain("loadRulesCorpus(defaultSourceUrls");
    expect(reviewIntelligence).toContain("payload?.reviewedAgainstVersion || V071_RULES_VERSION");
    expect(adminPage).toContain("reviewedAgainstVersion:String(value.reviewedAgainstVersion||'v0.7.1')");
  });

  test("v0.7.1 answer logging preserves retrieval candidates for later review", () => {
    expect(workerV071).toContain('import { persistSmartInteraction } from "./rules-persistence.js"');
    expect(workerV071).toContain("const retrievalQuery = contextualQuery(question, history)");
    expect(workerV071).toContain("retrievalQueries: [retrievalQuery]");
    expect(workerV071).toContain("candidateSources: retrieval.map(toDiagnosticSource)");
    expect(workerV071).toContain("corpusHash: corpus.authoritySetId ||");
    expect(workerV071).toContain('mode: "source_lookup"');
    expect(workerV071).toContain("COALESCE(ruling_status_v2, ruling_status) AS ruling_status");
    expect(workerV071.match(/persistSmartInteraction\(env/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("benchmark has broad coverage and preserves every live review interaction", () => {
    expect(benchmark.schema).toBe("gauntlet.rules-arbiter-evals.v2");
    expect(benchmark.rulesVersion).toBe("v0.7.1");
    expect(benchmark.cases.length).toBeGreaterThanOrEqual(75);
    expect(benchmark.cases.length).toBeLessThanOrEqual(150);

    const ids = benchmark.cases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const categories = new Set(benchmark.cases.map((item) => item.category));
    for (const category of [
      "core", "military", "diplomats", "financiers", "intelligence",
      "mystics", "inquisition", "cards", "live-regression", "conversation"
    ]) {
      expect(categories.has(category)).toBe(true);
    }

    const liveInteractionIds = new Set(
      benchmark.cases.map((item) => item.interactionId).filter(Boolean)
    );
    for (const interactionId of [
      "eb878722-a732-492f-814e-df3c5ccded9a",
      "54962556-f04e-428b-89c5-2c193d47cf0f",
      "eaa82da6-30e8-4292-9ed1-d87726b2e855",
      "999db05a-01a7-4d4d-85fc-babf8f75d5a5",
      "ed7ece6c-b596-46b7-9438-7b9f7ff6f018",
      "b922bfa5-6fce-4567-84b0-8c35fbb4b40e"
    ]) {
      expect(liveInteractionIds.has(interactionId)).toBe(true);
    }

    for (const item of benchmark.cases) {
      expect(item.question).toBeTruthy();
      expect(Array.isArray(item.expectedSourcePatterns)).toBe(true);
      expect(item.expectedSourcePatterns.length).toBeGreaterThan(0);
      expect(["explicit", "inferred", "provisional", "out_of_scope"]).toContain(item.expectedClassification);
      if (item.category === "conversation") {
        expect(Array.isArray(item.history)).toBe(true);
        expect(item.history.length).toBeGreaterThan(0);
      }
    }
  });
});
