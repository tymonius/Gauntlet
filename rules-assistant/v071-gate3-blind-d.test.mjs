import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { validateClassificationExpectations } from "../scripts/v071-live-rules-qa-support.mjs";
import { validateSemanticBenchmark } from "../scripts/v071-semantic-rules-qa-support.mjs";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const standard = loadJson("./evals/rules-arbiter-gate3-blind-d.v071.json");
const player = loadJson("./evals/rules-arbiter-gate3-blind-d-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-d-clarifications.v071.json");

const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");
const prior = [
  loadJson("./evals/rules-arbiter-gate3-blind-a.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-a-player-language.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-a-clarifications.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-b.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-b-player-language.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-b-clarifications.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-c.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-c-player-language.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-c-clarifications.v071.json")
];

const trancheC = prior[6];
const trancheCPlayer = prior[7];
const trancheCClarifications = prior[8];

const EXPECTED_BEHAVIOR = "v071-qa-20260915-14";
const C_FROZEN_BEHAVIOR = "v071-qa-20260914-13";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 blind tranche D freeze", () => {
  test("freezes semantic-v1 standard and player-language benchmarks to r14", () => {
    for (const dataset of [standard, player]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("D");
      expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
      expect(dataset.gradingMode).toBe("semantic-v1");
      expect(validateSemanticBenchmark(dataset)).toEqual([]);
      expect(validateClassificationExpectations(dataset)).toEqual([]);
    }
    expect(standard.cases).toHaveLength(55);
    expect(player.cases).toHaveLength(16);
  });

  test("covers all twelve Leaders explicitly", () => {
    const standardText = standard.cases
      .map((item) => `${item.question} ${(item.expectedSourcePatterns || []).join(" ")}`)
      .join("\n");
    for (const leader of [
      "General", "Commandant", "Ambassador", "Senator", "Banker", "Executive",
      "Ranger", "Spymaster", "Alchemist", "Spirit Walker", "Grand Inquisitor", "Witch Hunter"
    ]) {
      expect(standardText).toContain(leader);
    }
  });

  test("forbids legacy literal answer-pattern grading in semantic datasets", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      expect(Object.hasOwn(item, "expectedAnswerPatterns")).toBe(false);
      expect(Object.hasOwn(item, "forbiddenAnswerPatterns")).toBe(false);
      expect(Array.isArray(item.semanticCriteria)).toBe(true);
      expect(item.semanticCriteria.length).toBeGreaterThan(0);
    }
  });

  test("freezes clarification cases to the same candidate and authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("D");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(4);
  });

  test("has unique case ids and exact questions within tranche D", () => {
    const all = [...standard.cases, ...player.cases, ...clarifications.cases];
    const ids = all.map((item) => item.id);
    const questions = all.map((item) => normalize(item.question));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(questions).size).toBe(questions.length);
  });

  test("does not exactly reuse Gate 2 or Gate 3 A/B/C questions", () => {
    const priorQuestions = new Set([
      ...(gate2.cases || []),
      ...prior.flatMap((dataset) => dataset.cases || [])
    ].map((item) => normalize(item.question)));

    for (const item of [...standard.cases, ...player.cases, ...clarifications.cases]) {
      expect(priorQuestions.has(normalize(item.question)), item.id).toBe(false);
    }
  });

  test("keeps immutable tranche C pinned to r13", () => {
    for (const dataset of [trancheC, trancheCPlayer, trancheCClarifications]) {
      expect(dataset.behaviorRevision).toBe(C_FROZEN_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
    }
  });

  test("D workflow is isolated from C and uses semantic grading", () => {
    const workflow = readFileSync(
      new URL("../.github/workflows/rules-arbiter-gate3-blind-d.yml", import.meta.url),
      "utf8"
    );
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION: v071-qa-20260915-14");
    expect(workflow).toContain("rules-arbiter-gate3-blind-d.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-d-player-language.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-d-clarifications.v071.json");
    expect(workflow).toContain("run-v071-semantic-rules-qa.mjs");
    expect(workflow).toContain("rules-arbiter-gate3-blind-d-v0.7.1");
    expect(workflow).not.toContain("rules-arbiter-gate3-blind-c.v071.json");
  });
});
