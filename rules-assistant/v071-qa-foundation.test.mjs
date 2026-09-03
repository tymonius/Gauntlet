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

  test("v0.7.1 prompt prioritizes the immediately preceding exchange for ambiguous follow-ups", () => {
    expect(workerV071).toContain('For follow-up questions using words such as "that", "it", "this", "those"');
    expect(workerV071).toContain("IMMEDIATELY PRECEDING EXCHANGE — resolve ambiguous follow-ups here first");
    expect(workerV071).toContain("const immediateHistory = history.slice(-2)");
    expect(workerV071).toContain("const earlierHistory = history.slice(0, -2)");
  });

  test("v0.7.1 prompt preserves timing, zone, classification, and gap semantics", () => {
    expect(workerV071).toContain('export const BEHAVIOR_REVISION = "v071-qa-20260903-2"');
    expect(workerV071).toContain("additional Actions changes the number of available Actions, not the legal phase or timing");
    expect(workerV071).toContain("A bound card is outside normal zones");
    expect(workerV071).toContain("Never invent the target of an unlabeled numerical bonus");
    expect(workerV071).toContain('Do not label an explicit or inferred answer "Table ruling"');
    expect(workerV071).toContain('begin the answer with exactly "Provisional Arbiter Ruling:"');
    expect(workerV071).toContain('do not discuss retrieval mechanics or say "the supplied passages/text/sources"');
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
      if (item.expectedAnswerPatterns) expect(Array.isArray(item.expectedAnswerPatterns)).toBe(true);
      if (item.forbiddenAnswerPatterns) expect(Array.isArray(item.forbiddenAnswerPatterns)).toBe(true);
      if (item.category === "conversation") {
        expect(Array.isArray(item.history)).toBe(true);
        expect(item.history.length).toBeGreaterThan(0);
      }
    }
  });
});
