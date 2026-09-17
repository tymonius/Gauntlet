import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { validateClassificationExpectations } from "../scripts/v071-live-rules-qa-support.mjs";
import { validateSemanticBenchmark } from "../scripts/v071-semantic-rules-qa-support.mjs";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const standard = loadJson("./evals/rules-arbiter-gate3-blind-e.v071.json");
const player = loadJson("./evals/rules-arbiter-gate3-blind-e-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-e-clarifications.v071.json");
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
  loadJson("./evals/rules-arbiter-gate3-blind-c-clarifications.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-d.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-d-player-language.v071.json"),
  loadJson("./evals/rules-arbiter-gate3-blind-d-clarifications.v071.json")
];

const trancheD = prior[9];
const trancheDPlayer = prior[10];
const trancheDClarifications = prior[11];

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260916-15";
const D_FROZEN_BEHAVIOR = "v071-qa-20260915-14";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

describe("Gate 3 blind tranche E certification freeze", () => {
  test("pins fresh semantic benchmarks to r15 and the frozen v0.7.1 authority", () => {
    for (const dataset of [standard, player]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("E");
      expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
      expect(dataset.gradingMode).toBe("semantic-v1");
      expect(validateSemanticBenchmark(dataset)).toEqual([]);
      expect(validateClassificationExpectations(dataset)).toEqual([]);
    }
    expect(standard.cases).toHaveLength(61);
    expect(player.cases).toHaveLength(18);
  });

  test("pins clarification probes to the same candidate and authority", () => {
    expect(clarifications.rulesVersion).toBe("v0.7.1");
    expect(clarifications.tranche).toBe("E");
    expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
    expect(clarifications.cases).toHaveLength(5);
  });

  test("preserves tranche D as immutable r14 evidence", () => {
    for (const dataset of [trancheD, trancheDPlayer, trancheDClarifications]) {
      expect(dataset.rulesVersion).toBe("v0.7.1");
      expect(dataset.tranche).toBe("D");
      expect(dataset.behaviorRevision).toBe(D_FROZEN_BEHAVIOR);
      expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
    }
  });

  test("does not exactly reuse Gate 2 or Gate 3 A/B/C/D cases", () => {
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

  test("covers required benchmark surfaces and every Leader", () => {
    const categories = new Set(standard.cases.map((item) => item.category));
    for (const category of [
      "core",
      "military",
      "diplomats",
      "financiers",
      "intelligence",
      "mystics",
      "inquisition",
      "leaders",
      "cards",
      "interaction",
      "conversation",
      "unsupported",
      "out-of-scope"
    ]) expect(categories.has(category)).toBe(true);

    const leaderIds = [
      "blind-e-general-onward-battle-ends-sequence",
      "blind-e-commandant-repel-defender-only",
      "blind-e-ambassador-cordiality-refused",
      "blind-e-senator-political-capital-partial",
      "blind-e-banker-line-credit-five-cost",
      "blind-e-executive-hostile-takeover-occupier-cost",
      "blind-e-ranger-fieldcraft-battle-territory-effect",
      "blind-e-spymaster-mission-control-no-special-op",
      "blind-e-alchemist-materia-prima-second-sacrifice",
      "blind-e-spirit-walker-guardians-two-rites",
      "blind-e-grand-inquisitor-final-judgment-floor",
      "blind-e-witch-hunter-pursuit-attacker-no"
    ];
    const ids = new Set(standard.cases.map((item) => item.id));
    for (const id of leaderIds) expect(ids.has(id)).toBe(true);

    expect(standard.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
    expect(standard.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
  });

  test("requires only semantic grading, never legacy literal answer patterns", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      expect(Object.hasOwn(item, "expectedAnswerPatterns"), item.id).toBe(false);
      expect(Object.hasOwn(item, "forbiddenAnswerPatterns"), item.id).toBe(false);
      expect(Array.isArray(item.semanticCriteria), item.id).toBe(true);
      expect(item.semanticCriteria.length, item.id).toBeGreaterThan(0);
    }
  });

  test("scored source patterns exist in frozen v0.7.1 authority", () => {
    for (const item of [...standard.cases, ...player.cases]) {
      if (!["explicit", "inferred"].includes(item.expectedClassification)) continue;
      expect(Array.isArray(item.expectedSourcePatterns), item.id).toBe(true);
      expect(item.expectedSourcePatterns.length, item.id).toBeGreaterThan(0);
      for (const pattern of item.expectedSourcePatterns) {
        expect(authorityText.includes(normalize(pattern)), `${item.id}: ${pattern}`).toBe(true);
      }
    }
  });

  test("keeps player-language probes terse and unnormalized", () => {
    expect(player.cases.every((item) => item.category === "player-language")).toBe(true);
    const questions = player.cases.map((item) => item.question);
    expect(questions.some((question) => question === question.toLowerCase())).toBe(true);
    expect(questions.filter((question) => question.split(/\s+/).length <= 10).length).toBeGreaterThanOrEqual(12);
    expect(questions).toContain("mission control can start a special op?");
    expect(questions).toContain("tiebreak roll tied again. roll again?");
  });

  test("clarification probes contain multiple candidates and an unresolved referent", () => {
    for (const item of clarifications.cases) {
      expect(Array.isArray(item.history), item.id).toBe(true);
      expect(item.history.length, item.id).toBeGreaterThanOrEqual(2);
      expect(/\b(?:that|this|it)\b/i.test(item.question), item.id).toBe(true);
    }
    expect(clarifications.cases.map((item) => item.question)).toEqual([
      "Can I use that one now?",
      "Does that Mission fail if I lose the battle?",
      "If I replace that Asset, where does it go?",
      "Does that Proposal give me Influence?",
      "Can that Rite finish this turn?"
    ]);
  });

  test("uses semantic-v2 evaluator behavior while retaining semantic-v1 dataset schema", () => {
    const evaluator = readFileSync(new URL("./qa-semantic-evaluator.js", import.meta.url), "utf8");
    expect(evaluator).toContain('QA_SEMANTIC_EVALUATOR_REVISION = "semantic-v2"');
  });

  test("dedicated tranche E workflow is isolated and pinned to r15", () => {
    const workflow = readFileSync(
      new URL("../.github/workflows/rules-arbiter-gate3-blind-e.yml", import.meta.url),
      "utf8"
    );
    expect(workflow).toContain("GATE3_EXPECTED_BEHAVIOR_REVISION: v071-qa-20260916-15");
    expect(workflow).toContain("rules-arbiter-gate3-blind-e.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-e-player-language.v071.json");
    expect(workflow).toContain("rules-arbiter-gate3-blind-e-clarifications.v071.json");
    expect(workflow).toContain("run-v071-semantic-rules-qa.mjs");
    expect(workflow).toContain("rules-arbiter-gate3-blind-e-v0.7.1");
    expect(workflow).not.toContain("rules-arbiter-gate3-blind-d.v071.json");
  });
});
