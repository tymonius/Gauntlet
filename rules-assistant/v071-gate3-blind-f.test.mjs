import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { validateClassificationExpectations } from "../scripts/v071-live-rules-qa-support.mjs";
import { validateSemanticBenchmark } from "../scripts/v071-semantic-rules-qa-support.mjs";
import { githubActionsQaAuthContract } from "./github-actions-qa-auth.js";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const standard = loadJson("./evals/rules-arbiter-gate3-blind-f.v071.json");
const player = loadJson("./evals/rules-arbiter-gate3-blind-f-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-f-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");

const priorPaths = ["a","b","c","d","e"].flatMap((letter) => [
  `./evals/rules-arbiter-gate3-blind-${letter}.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-player-language.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-clarifications.v071.json`
]);
const prior = priorPaths.map(loadJson);
const trancheE = prior.slice(-3);

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260917-16";
const E_FROZEN_BEHAVIOR = "v071-qa-20260916-15";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 blind tranche F certification freeze", () => {
  test("pins fresh semantic benchmarks to r16 and frozen v0.7.1 authority", () => {
    for (const dataset of [standard, player]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("F");
      expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
      expect(dataset.gradingMode).toBe("semantic-v1");
      expect(validateSemanticBenchmark(dataset)).toEqual([]);
      expect(validateClassificationExpectations(dataset)).toEqual([]);
    }
    expect(standard.cases).toHaveLength(61);
    expect(player.cases).toHaveLength(18);
  });

  test("pins clarification probes to r16 and the same authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("F");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(5);
  });

  test("preserves tranche E as immutable r15 evidence", () => {
    for (const dataset of trancheE) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("E");
      expect(dataset.behaviorRevision).toBe(E_FROZEN_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
    }
  });

  test("does not exactly reuse Gate 2 or Gate 3 A/B/C/D/E cases", () => {
    const priorCases = [
      ...(gate2.cases || []),
      ...prior.flatMap((dataset) => dataset.cases || [])
    ];
    const priorQuestions = new Set(priorCases.map((item) => normalize(item.question)));
    const priorIds = new Set(priorCases.map((item) => String(item.id || "").trim()).filter(Boolean));
    const fresh = [...standard.cases, ...player.cases, ...clarifications.cases];
    const ids = fresh.map((item) => String(item.id || "").trim());
    const questions = fresh.map((item) => normalize(item.question));

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(questions).size).toBe(questions.length);
    for (const item of fresh) {
      expect(priorIds.has(item.id), item.id).toBe(false);
      expect(priorQuestions.has(normalize(item.question)), item.id).toBe(false);
    }
  });

  test("covers every required benchmark surface and all twelve Leaders", () => {
    const categories = new Set(standard.cases.map((item) => item.category));
    for (const category of [
      "core","military","diplomats","financiers","intelligence","mystics","inquisition",
      "leaders","cards","interaction","conversation","unsupported","out-of-scope"
    ]) expect(categories.has(category)).toBe(true);

    const leaderIds = [
      "blind-f-general-rally-defending-no",
      "blind-f-commandant-fortify-occupation-required",
      "blind-f-ambassador-cordiality-once-per-turn",
      "blind-f-senator-political-capital-limited-by-hand",
      "blind-f-banker-line-credit-seven-cost",
      "blind-f-executive-hostile-takeover-defender-no",
      "blind-f-ranger-fieldcraft-does-not-remove-edge",
      "blind-f-spymaster-new-mission-cannot-finish",
      "blind-f-alchemist-battle-sacrifice-draw-after-aftermath",
      "blind-f-spirit-walker-position-loss-not-preventable",
      "blind-f-grand-inquisitor-final-judgment-minimum-one",
      "blind-f-witch-hunter-pursuit-attacking-win-no"
    ];
    const ids = new Set(standard.cases.map((item) => item.id));
    for (const id of leaderIds) expect(ids.has(id)).toBe(true);

    expect(standard.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
  });

  test("requires semantic grading without legacy literal answer matching", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      expect(Object.hasOwn(item, "expectedAnswerPatterns"), item.id).toBe(false);
      expect(Object.hasOwn(item, "forbiddenAnswerPatterns"), item.id).toBe(false);
      expect(Array.isArray(item.semanticCriteria), item.id).toBe(true);
      expect(item.semanticCriteria.length, item.id).toBeGreaterThan(0);
    }
  });

  test("every scored source pattern exists in the frozen authority", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      if (!["explicit","inferred"].includes(item.expectedClassification)) continue;
      expect(Array.isArray(item.expectedSourcePatterns), item.id).toBe(true);
      expect(item.expectedSourcePatterns.length, item.id).toBeGreaterThan(0);
      for (const pattern of item.expectedSourcePatterns) {
        expect(authorityText.includes(normalize(pattern)), `${item.id}: ${pattern}`).toBe(true);
      }
    }
  });

  test("keeps player-language probes genuinely terse", () => {
    expect(player.cases.every((item) => item.category === "player-language")).toBe(true);
    const questions = player.cases.map((item) => item.question);
    expect(questions.some((question) => question === question.toLowerCase())).toBe(true);
    expect(questions.filter((question) => question.split(/\s+/).length <= 10).length).toBeGreaterThanOrEqual(10);
  });

  test("clarification probes present multiple plausible antecedents", () => {
    for (const item of clarifications.cases) {
      expect(Array.isArray(item.history), item.id).toBe(true);
      expect(item.history.length, item.id).toBeGreaterThanOrEqual(2);
      expect(/\b(?:that|this|it)\b/i.test(item.question), item.id).toBe(true);
    }
  });

  test("uses semantic-v2 evaluator behavior with semantic-v1 dataset schema", () => {
    const evaluator = readFileSync(new URL("./qa-semantic-evaluator.js", import.meta.url), "utf8");
    expect(evaluator).toContain('QA_SEMANTIC_EVALUATOR_REVISION = "semantic-v2"');
  });

  test("current Gate 3 workflow is pinned to F/r16 and is already OIDC-authorized", () => {
    const workflowPath = ".github/workflows/current-rules-arbiter-gate3-blind.yml";
    const workflow = readFileSync(new URL(`../${workflowPath}`, import.meta.url), "utf8");
    expect(workflow).toContain("name: Rules Arbiter Gate 3 blind tranche F");
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION: v071-qa-20260917-16");
    expect(workflow).toContain("rules-arbiter-gate3-blind-f.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-f-player-language.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-f-clarifications.v071.json");
    expect(workflow).toContain("run-v071-semantic-rules-qa.mjs");
    expect(workflow).toContain("rules-arbiter-gate3-blind-f-v0.7.1");
    expect(githubActionsQaAuthContract.workflowRefs).toContain(
      "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main"
    );
  });
});
