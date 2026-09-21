import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { githubActionsQaAuthContract } from "./github-actions-qa-auth.js";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-v-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");
const priorLetters = "abcdefghijklmnopqrstu".split("");
const priorPaths = priorLetters.flatMap((letter) => [
  `./evals/rules-arbiter-gate3-blind-${letter}.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-player-language.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-clarifications.v071.json`
]);
const prior = priorPaths.map(loadJson);

const EXPECTED_BEHAVIOR = "v071-qa-20260921-33";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 bounded clarification tranche V confirmation freeze", () => {
  test("pins five fresh clarification probes to r33 and frozen v0.7.1 authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("V");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(5);
  });

  test("does not exactly reuse Gate 2 or Gate 3 A through U questions", () => {
    const priorCases = [
      ...(gate2.cases || []),
      ...prior.flatMap((dataset) => dataset.cases || [])
    ];
    const priorQuestions = new Set(priorCases.map((item) => normalize(item.question)));
    const priorIds = new Set(priorCases.map((item) => String(item.id || "").trim()).filter(Boolean));
    expect(new Set(clarifications.cases.map((item) => item.id)).size).toBe(clarifications.cases.length);
    expect(new Set(clarifications.cases.map((item) => normalize(item.question))).size).toBe(clarifications.cases.length);
    for (const item of clarifications.cases) {
      expect(priorIds.has(item.id), item.id).toBe(false);
      expect(priorQuestions.has(normalize(item.question)), item.id).toBe(false);
    }
  });

  test("directly stresses the natural that-the-one grammar without broadening certification scope", () => {
    expect(clarifications.cases.every((item) =>
      Array.isArray(item.history)
      && item.history.length >= 2
      && /\b(?:that|this)\s+the\s+one\b/i.test(item.question)
    )).toBe(true);
  });

  test("current Gate 3 workflow is clarification-only and pinned to V/r33", () => {
    const workflow = readFileSync(new URL("../.github/workflows/current-rules-arbiter-gate3-blind.yml", import.meta.url), "utf8");
    expect(workflow).toContain("name: Rules Arbiter Gate 3 bounded clarification tranche V");
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION: v071-qa-20260921-33");
    expect(workflow).toContain("rules-arbiter-gate3-blind-v-clarifications.v071.json");
    expect(workflow).not.toContain("Run Gate 3 blind standard cases");
    expect(workflow).not.toContain("Run Gate 3 blind player-language cases");
    expect(githubActionsQaAuthContract.workflowRefs).toContain(
      "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main"
    );
  });
});
