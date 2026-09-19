import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  sourceRequirementGroups,
  validateClassificationExpectations
} from "../scripts/v071-live-rules-qa-support.mjs";
import { validateSemanticBenchmark } from "../scripts/v071-semantic-rules-qa-support.mjs";
import { githubActionsQaAuthContract } from "./github-actions-qa-auth.js";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const standard = loadJson("./evals/rules-arbiter-gate3-blind-j.v071.json");
const player = loadJson("./evals/rules-arbiter-gate3-blind-j-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-j-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");

const priorPaths = ["a","b","c","d","e","f","g","h","i"].flatMap((letter) => [
  `./evals/rules-arbiter-gate3-blind-${letter}.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-player-language.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-clarifications.v071.json`
]);
const prior = priorPaths.map(loadJson);
const trancheI = prior.slice(-3);

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260918-20";
const I_FROZEN_BEHAVIOR = "v071-qa-20260918-19";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 blind tranche J certification freeze", () => {
  test("pins fresh semantic benchmarks to r20 and frozen v0.7.1 authority", () => {
    for (const dataset of [standard, player]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("J");
      expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
      expect(dataset.gradingMode).toBe("semantic-v1");
      expect(validateSemanticBenchmark(dataset)).toEqual([]);
      expect(validateClassificationExpectations(dataset)).toEqual([]);
    }
    expect(standard.cases).toHaveLength(61);
    expect(player.cases).toHaveLength(18);
  });

  test("pins clarification probes to r20 and the same authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("J");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(5);
  });

  test("preserves tranche I as immutable r19 evidence", () => {
    for (const dataset of trancheI) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("I");
      expect(dataset.behaviorRevision).toBe(I_FROZEN_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
    }
  });

  test("does not exactly reuse Gate 2 or Gate 3 A/B/C/D/E/F/G/H/I cases", () => {
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
      "blind-j-general-onward-can-start-battle",
      "blind-j-commandant-repel-if-able-edge",
      "blind-j-ambassador-cordiality-draw-after-acceptance",
      "blind-j-senator-political-capital-zero-hand",
      "blind-j-banker-line-credit-treasury-collateral",
      "blind-j-executive-takeover-cost-occupier",
      "blind-j-ranger-fieldcraft-cost",
      "blind-j-spymaster-new-mission-immediate-start",
      "blind-j-alchemist-materia-nonqualifying-gambit",
      "blind-j-spirit-walker-guardians-on-ritual-loss",
      "blind-j-grand-inquisitor-final-judgment-cost-floor",
      "blind-j-witch-hunter-pursuit-new-battle-attacker"
    ];
    const ids = new Set(standard.cases.map((item) => item.id));
    for (const id of leaderIds) expect(ids.has(id)).toBe(true);

    expect(standard.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
  });

  test("uses question-scoped semantic criteria and valid source requirements", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      expect(Object.hasOwn(item, "expectedAnswerPatterns"), item.id).toBe(false);
      expect(Object.hasOwn(item, "forbiddenAnswerPatterns"), item.id).toBe(false);
      expect(Array.isArray(item.semanticCriteria), item.id).toBe(true);
      expect(item.semanticCriteria, item.id).toHaveLength(1);

      if (["explicit","inferred"].includes(item.expectedClassification)) {
        const groups = sourceRequirementGroups(item);
        expect(groups.length, item.id).toBeGreaterThan(0);
        if (item.expectedClassification === "inferred") {
          expect(groups.length, item.id).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  test("every source-requirement group has at least one alternative present in frozen authority", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      if (!["explicit","inferred"].includes(item.expectedClassification)) continue;
      for (const group of sourceRequirementGroups(item)) {
        expect(
          group.some((pattern) => authorityText.includes(normalize(pattern))),
          `${item.id}: ${JSON.stringify(group)}`
        ).toBe(true);
      }
    }
  });

  test("keeps player-language probes genuinely terse", () => {
    expect(player.cases.every((item) => item.category === "player-language")).toBe(true);
    const questions = player.cases.map((item) => item.question);
    expect(questions.every((question) => question === question.toLowerCase())).toBe(true);
    expect(questions.filter((question) => question.split(/\s+/).length <= 10).length).toBeGreaterThanOrEqual(16);
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

  test("later Gate 3 workflow advancement does not invalidate this frozen tranche and remains OIDC-authorized", () => {
    const workflowPath = ".github/workflows/current-rules-arbiter-gate3-blind.yml";
    const workflow = readFileSync(new URL(`../${workflowPath}`, import.meta.url), "utf8");
    expect(workflow).toContain("name: Rules Arbiter Gate 3 blind tranche ");
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION:");
    expect(githubActionsQaAuthContract.workflowRefs).toContain(
      "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main"
    );
  });
});
