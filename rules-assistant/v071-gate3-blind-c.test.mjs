import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase();

const gate3 = loadJson("./evals/rules-arbiter-gate3-blind-c.v071.json");
const playerLanguage = loadJson("./evals/rules-arbiter-gate3-blind-c-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-c-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");
const trancheA = loadJson("./evals/rules-arbiter-gate3-blind-a.v071.json");
const trancheAPlayer = loadJson("./evals/rules-arbiter-gate3-blind-a-player-language.v071.json");
const trancheAClarifications = loadJson("./evals/rules-arbiter-gate3-blind-a-clarifications.v071.json");
const trancheB = loadJson("./evals/rules-arbiter-gate3-blind-b.v071.json");
const trancheBPlayer = loadJson("./evals/rules-arbiter-gate3-blind-b-player-language.v071.json");
const trancheBClarifications = loadJson("./evals/rules-arbiter-gate3-blind-b-clarifications.v071.json");

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260914-13";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

test("Gate 3 blind tranche C is frozen to the merged r13 candidate", () => {
  for (const dataset of [gate3, playerLanguage, clarifications]) {
    expect(dataset.rulesVersion).toBe("v0.7.1");
    expect(dataset.tranche).toBe("C");
    expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
  }
  expect(gate3.cases).toHaveLength(43);
  expect(playerLanguage.cases).toHaveLength(20);
  expect(clarifications.cases).toHaveLength(3);
});

test("Gate 3 tranche C does not exactly reuse Gate 2, tranche A, or tranche B questions", () => {
  const prior = new Set([
    ...gate2.cases,
    ...trancheA.cases,
    ...trancheAPlayer.cases,
    ...trancheAClarifications.cases,
    ...trancheB.cases,
    ...trancheBPlayer.cases,
    ...trancheBClarifications.cases
  ].map((item) => normalize(item.question)));
  const fresh = [...gate3.cases, ...playerLanguage.cases, ...clarifications.cases];
  const ids = fresh.map((item) => item.id);
  const questions = fresh.map((item) => normalize(item.question));

  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(questions).size).toBe(questions.length);
  for (const question of questions) expect(prior.has(question)).toBe(false);
});

test("Gate 3 tranche C covers all required benchmark surfaces", () => {
  const categories = new Set(gate3.cases.map((item) => item.category));
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
    "conversation",
    "unsupported",
    "interaction"
  ]) expect(categories.has(category)).toBe(true);

  const leaderIds = [
    "blind-c-general-onward-timing",
    "blind-c-commandant-repel-order",
    "blind-c-ambassador-cordiality-draw",
    "blind-c-senator-political-capital-partial-recovery",
    "blind-c-banker-line-credit-five-cost",
    "blind-c-executive-hostile-takeover-occupier-cost",
    "blind-c-ranger-fieldcraft-duration",
    "blind-c-spymaster-mission-control-no-special-op",
    "blind-c-alchemist-materia-prima-battle-draw-timing",
    "blind-c-spirit-walker-guardians-one-rite-cost",
    "blind-c-grand-inquisitor-final-judgment-after-clear",
    "blind-c-witch-hunter-pursuit-defender-trigger"
  ];
  const ids = new Set(gate3.cases.map((item) => item.id));
  for (const id of leaderIds) expect(ids.has(id)).toBe(true);

  expect(gate3.cases.filter((item) => item.category === "cards")).toHaveLength(10);
  expect(gate3.cases.filter((item) => item.category === "conversation")).toHaveLength(4);
  expect(gate3.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
});

test("Gate 3 tranche C scored authority patterns exist in frozen v0.7.1 authority", () => {
  const scored = [...gate3.cases, ...playerLanguage.cases];
  for (const item of scored) {
    if (!["explicit", "inferred"].includes(item.expectedClassification)) continue;
    expect(Array.isArray(item.expectedSourcePatterns), item.id).toBe(true);
    expect(item.expectedSourcePatterns.length, item.id).toBeGreaterThan(0);
    for (const pattern of item.expectedSourcePatterns) {
      expect(authorityText.includes(normalize(pattern)), `${item.id}: ${pattern}`).toBe(true);
    }
  }
});

test("Gate 3 tranche C player language remains novice-like rather than normalized", () => {
  expect(playerLanguage.cases.every((item) => item.category === "player-language")).toBe(true);
  const questions = playerLanguage.cases.map((item) => item.question);
  expect(questions.some((question) => question === question.toLowerCase())).toBe(true);
  expect(questions.some((question) => question.split(/\s+/).length <= 7)).toBe(true);
  expect(questions).toContain("orders cost my normal action or just command");
  expect(questions).toContain("witch hunter won while attacking, pursuit now?");
});

test("Gate 3 tranche C classification expectations use the live QA contract", () => {
  const allowed = new Set(["explicit", "inferred", "provisional", "out_of_scope"]);
  for (const item of [...gate3.cases, ...playerLanguage.cases]) {
    expect(allowed.has(item.expectedClassification)).toBe(true);
    if (["explicit", "inferred"].includes(item.expectedClassification)) {
      expect(Array.isArray(item.expectedSourcePatterns)).toBe(true);
      expect(item.expectedSourcePatterns.length).toBeGreaterThan(0);
    }
  }
});

test("Gate 3 tranche C clarification cases are fresh and genuinely ambiguous", () => {
  const questions = clarifications.cases.map((item) => normalize(item.question));
  expect(new Set(questions).size).toBe(questions.length);
  for (const item of clarifications.cases) {
    expect(Array.isArray(item.history)).toBe(true);
    expect(item.history.length).toBeGreaterThanOrEqual(2);
    expect(/\b(?:that|this|it)\b/i.test(item.question)).toBe(true);
  }
});
