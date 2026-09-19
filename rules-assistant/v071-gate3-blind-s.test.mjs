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

const standard = loadJson("./evals/rules-arbiter-gate3-blind-s.v071.json");
const player = loadJson("./evals/rules-arbiter-gate3-blind-s-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-s-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");

const priorLetters = "abcdefghijklmnopqr".split("");
const priorPaths = priorLetters.flatMap((letter) => [
  `./evals/rules-arbiter-gate3-blind-${letter}.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-player-language.v071.json`,
  `./evals/rules-arbiter-gate3-blind-${letter}-clarifications.v071.json`
]);
const prior = priorPaths.map(loadJson);

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260919-30";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 final blind tranche S certification freeze", () => {
  test("pins fresh semantic benchmarks to r30 and frozen v0.7.1 authority", () => {
    for (const dataset of [standard, player]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("S");
      expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
      expect(dataset.gradingMode).toBe("semantic-v1");
      expect(validateSemanticBenchmark(dataset)).toEqual([]);
      expect(validateClassificationExpectations(dataset)).toEqual([]);
    }
    expect(standard.cases).toHaveLength(33);
    expect(player.cases).toHaveLength(10);
  });

  test("pins clarification probes to r30 and the same authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("S");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(5);
  });

  test("does not exactly reuse Gate 2 or Gate 3 A through R questions", () => {
    const priorCases = [
      ...(gate2.cases || []),
      ...prior.flatMap((dataset) => dataset.cases || [])
    ];
    const priorQuestions = new Set(priorCases.map((item) => normalize(item.question)));
    const priorIds = new Set(priorCases.map((item) => String(item.id || "").trim()).filter(Boolean));
    const fresh = [...standard.cases, ...player.cases, ...clarifications.cases];

    expect(new Set(fresh.map((item) => item.id)).size).toBe(fresh.length);
    expect(new Set(fresh.map((item) => normalize(item.question))).size).toBe(fresh.length);
    for (const item of fresh) {
      expect(priorIds.has(item.id), item.id).toBe(false);
      expect(priorQuestions.has(normalize(item.question)), item.id).toBe(false);
    }
  });

  test("covers all twelve Leaders plus core, interaction, gap, and scope surfaces", () => {
    const ids = new Set(standard.cases.map((item) => item.id));
    for (const id of [
      "blind-s-general-onward",
      "blind-s-commandant-entrench",
      "blind-s-ambassador-cordiality-limit",
      "blind-s-senator-partial-recovery",
      "blind-s-banker-half-cap",
      "blind-s-executive-occupation-required",
      "blind-s-ranger-fieldcraft-action",
      "blind-s-spymaster-mission-control-action",
      "blind-s-alchemist-gambit-no-materia",
      "blind-s-spirit-walker-position-requirement",
      "blind-s-grand-inquisitor-purge-permission",
      "blind-s-witch-hunter-followup-attacker"
    ]) expect(ids.has(id)).toBe(true);

    const categories = new Set(standard.cases.map((item) => item.category));
    for (const category of [
      "core-rules","leaders","diplomats","financiers","intelligence","mystics",
      "inquisition","interaction","cards","unsupported","out-of-scope"
    ]) expect(categories.has(category)).toBe(true);
  });

  test("keeps semantic criteria strictly question-scoped and source requirements valid", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      expect(Object.hasOwn(item, "expectedAnswerPatterns"), item.id).toBe(false);
      expect(Object.hasOwn(item, "forbiddenAnswerPatterns"), item.id).toBe(false);
      expect(Array.isArray(item.semanticCriteria), item.id).toBe(true);
      expect(item.semanticCriteria, item.id).toHaveLength(1);

      if (["explicit","inferred"].includes(item.expectedClassification)) {
        const groups = sourceRequirementGroups(item);
        expect(groups.length, item.id).toBeGreaterThan(0);
        for (const group of groups) {
          expect(
            group.some((pattern) => authorityText.includes(normalize(pattern))),
            `${item.id}: ${JSON.stringify(group)}`
          ).toBe(true);
        }
      }
    }
  });

  test("keeps player-language probes terse and natural", () => {
    expect(player.cases.every((item) => item.category === "player-language")).toBe(true);
    expect(player.cases.every((item) => item.question === item.question.toLowerCase())).toBe(true);
    expect(player.cases.filter((item) => item.question.split(/\s+/).length <= 11).length).toBeGreaterThanOrEqual(8);
  });

  test("clarification probes preserve multiple plausible antecedents", () => {
    for (const item of clarifications.cases) {
      expect(Array.isArray(item.history), item.id).toBe(true);
      expect(item.history.length, item.id).toBeGreaterThanOrEqual(2);
      expect(/\b(?:that|this|it)\b/i.test(item.question), item.id).toBe(true);
    }
  });

  test("current Gate 3 workflow is pinned to S/r30 and remains OIDC-authorized", () => {
    const workflow = readFileSync(new URL("../.github/workflows/current-rules-arbiter-gate3-blind.yml", import.meta.url), "utf8");
    expect(workflow).toContain("name: Rules Arbiter Gate 3 blind tranche S");
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION: v071-qa-20260919-30");
    expect(workflow).toContain("rules-arbiter-gate3-blind-s.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-s-player-language.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-s-clarifications.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-s-v0.7.1");
    expect(githubActionsQaAuthContract.workflowRefs).toContain(
      "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main"
    );
  });
});
