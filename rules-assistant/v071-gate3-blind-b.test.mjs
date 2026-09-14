import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const loadJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalize = (value) => String(value || "").trim().toLowerCase();

const gate3 = loadJson("./evals/rules-arbiter-gate3-blind-b.v071.json");
const playerLanguage = loadJson("./evals/rules-arbiter-gate3-blind-b-player-language.v071.json");
const clarifications = loadJson("./evals/rules-arbiter-gate3-blind-b-clarifications.v071.json");
const gate2 = loadJson("./evals/rules-arbiter-evals.v071.json");
const trancheA = loadJson("./evals/rules-arbiter-gate3-blind-a.v071.json");
const trancheAPlayer = loadJson("./evals/rules-arbiter-gate3-blind-a-player-language.v071.json");
const trancheAClarifications = loadJson("./evals/rules-arbiter-gate3-blind-a-clarifications.v071.json");

const rulebook = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url), "utf8");
const authorityText = normalize(`${rulebook}\n${canonical}`);

const EXPECTED_BEHAVIOR = "v071-qa-20260913-10";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

test("Gate 3 blind tranche B is frozen to the merged r10 candidate", () => {
  for (const dataset of [gate3, playerLanguage, clarifications]) {
    expect(dataset.rulesVersion).toBe("v0.7.1");
    expect(dataset.tranche).toBe("B");
    expect(dataset.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
    expect(dataset.authoritySetId).toBe(EXPECTED_AUTHORITY);
  }
  expect(gate3.cases).toHaveLength(43);
  expect(playerLanguage.cases).toHaveLength(20);
  expect(clarifications.cases).toHaveLength(3);
});

test("Gate 3 tranche B does not exactly reuse Gate 2 or tranche A questions", () => {
  const prior = new Set([
    ...gate2.cases,
    ...trancheA.cases,
    ...trancheAPlayer.cases,
    ...trancheAClarifications.cases
  ].map((item) => normalize(item.question)));
  const fresh = [...gate3.cases, ...playerLanguage.cases, ...clarifications.cases];
  const ids = fresh.map((item) => item.id);
  const questions = fresh.map((item) => normalize(item.question));

  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(questions).size).toBe(questions.length);
  for (const question of questions) expect(prior.has(question)).toBe(false);
});

test("Gate 3 tranche B covers all required benchmark surfaces", () => {
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
    "blind-b-general-rout-can-battle",
    "blind-b-commandant-fortify-occupation",
    "blind-b-ambassador-cordiality-limit",
    "blind-b-senator-political-capital-trigger",
    "blind-b-banker-line-credit-first-purchase",
    "blind-b-executive-hostile-takeover-timing",
    "blind-b-ranger-fieldcraft-card-effect",
    "blind-b-spymaster-mission-control-same-turn",
    "blind-b-alchemist-materia-prima-first-only",
    "blind-b-spirit-walker-guardians-cost-three-rites",
    "blind-b-grand-inquisitor-final-judgment-discount",
    "blind-b-witch-hunter-pursuit-new-attacker"
  ];
  const ids = new Set(gate3.cases.map((item) => item.id));
  for (const id of leaderIds) expect(ids.has(id)).toBe(true);

  expect(gate3.cases.filter((item) => item.category === "cards")).toHaveLength(10);
  expect(gate3.cases.filter((item) => item.category === "conversation")).toHaveLength(4);
  expect(gate3.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
});

test("Gate 3 tranche B scored authority patterns exist in frozen v0.7.1 authority", () => {
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

test("Gate 3 tranche B player language remains novice-like rather than normalized", () => {
  expect(playerLanguage.cases.every((item) => item.category === "player-language")).toBe(true);
  const questions = playerLanguage.cases.map((item) => item.question);
  expect(questions.some((question) => question === question.toLowerCase())).toBe(true);
  expect(questions.some((question) => question.split(/\s+/).length <= 7)).toBe(true);
  expect(questions).toContain("got two rites done can i use transmutation now");
  expect(questions).toContain("sleeper network gets removed, do i play every card under it");
});

test("Gate 3 tranche B classification expectations use the live QA contract", () => {
  const allowed = new Set(["explicit", "inferred", "provisional", "out_of_scope"]);
  for (const item of [...gate3.cases, ...playerLanguage.cases]) {
    expect(allowed.has(item.expectedClassification)).toBe(true);
    if (["explicit", "inferred"].includes(item.expectedClassification)) {
      expect(Array.isArray(item.expectedSourcePatterns)).toBe(true);
      expect(item.expectedSourcePatterns.length).toBeGreaterThan(0);
    }
  }
});

test("Gate 3 tranche B clarification cases are fresh and genuinely ambiguous", () => {
  const questions = clarifications.cases.map((item) => normalize(item.question));
  expect(new Set(questions).size).toBe(questions.length);
  for (const item of clarifications.cases) {
    expect(Array.isArray(item.history)).toBe(true);
    expect(item.history.length).toBeGreaterThanOrEqual(2);
    expect(/\b(?:that|this|it)\b/i.test(item.question)).toBe(true);
  }
});
