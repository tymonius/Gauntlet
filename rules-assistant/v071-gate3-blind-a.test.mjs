import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const gate3 = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-gate3-blind-a.v071.json", import.meta.url),
  "utf8"
));
const clarifications = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-gate3-blind-a-clarifications.v071.json", import.meta.url),
  "utf8"
));
const gate2 = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-evals.v071.json", import.meta.url),
  "utf8"
));

const EXPECTED_BEHAVIOR = "v071-qa-20260913-9";
const EXPECTED_AUTHORITY = "5818de9fa60854af9762887db380257b205f5602c0183b20fdad80e58a060339";

test("Gate 3 blind tranche A is frozen to the certified r9 candidate", () => {
  expect(gate3.rulesVersion).toBe("v0.7.1");
  expect(gate3.tranche).toBe("A");
  expect(gate3.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
  expect(gate3.authoritySetId).toBe(EXPECTED_AUTHORITY);
  expect(gate3.cases).toHaveLength(43);

  expect(clarifications.rulesVersion).toBe("v0.7.1");
  expect(clarifications.tranche).toBe("A");
  expect(clarifications.behaviorRevision).toBe(EXPECTED_BEHAVIOR);
  expect(clarifications.authoritySetId).toBe(EXPECTED_AUTHORITY);
  expect(clarifications.cases).toHaveLength(3);
});

test("Gate 3 standard cases are unique and do not reuse Gate 2 questions", () => {
  const ids = gate3.cases.map((item) => item.id);
  const questions = gate3.cases.map((item) => item.question.trim().toLowerCase());
  const gate2Questions = new Set(gate2.cases.map((item) => item.question.trim().toLowerCase()));

  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(questions).size).toBe(questions.length);
  for (const question of questions) expect(gate2Questions.has(question)).toBe(false);
});

test("Gate 3 tranche A covers all required benchmark surfaces", () => {
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
    "blind-a-general-onward-after-battle",
    "blind-a-commandant-repel-retreat",
    "blind-a-ambassador-cordiality-own-terms",
    "blind-a-senator-political-capital-partial",
    "blind-a-banker-line-credit-five-cost",
    "blind-a-executive-hostile-takeover-defender",
    "blind-a-ranger-fieldcraft-printed-effect",
    "blind-a-spymaster-mission-control-special-op",
    "blind-a-alchemist-materia-prima-battle-draw",
    "blind-a-spirit-walker-guardians-threshold",
    "blind-a-grand-inquisitor-final-judgment-after-purge",
    "blind-a-witch-hunter-pursuit-defending"
  ];
  const ids = new Set(gate3.cases.map((item) => item.id));
  for (const id of leaderIds) expect(ids.has(id)).toBe(true);

  expect(gate3.cases.filter((item) => item.category === "cards").length).toBeGreaterThanOrEqual(10);
  expect(gate3.cases.filter((item) => item.category === "conversation").length).toBeGreaterThanOrEqual(4);
  expect(gate3.cases.some((item) => item.expectedClassification === "inferred")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "provisional")).toBe(true);
  expect(gate3.cases.some((item) => item.expectedClassification === "out_of_scope")).toBe(true);
});

test("Gate 3 classification expectations use the live QA contract", () => {
  const allowed = new Set(["explicit", "inferred", "provisional", "out_of_scope"]);
  for (const item of gate3.cases) {
    expect(allowed.has(item.expectedClassification)).toBe(true);
    if (["explicit", "inferred"].includes(item.expectedClassification)) {
      expect(Array.isArray(item.expectedSourcePatterns)).toBe(true);
      expect(item.expectedSourcePatterns.length).toBeGreaterThan(0);
    }
  }
});

test("Gate 3 clarification cases are unique and genuinely context dependent", () => {
  const ids = clarifications.cases.map((item) => item.id);
  const questions = clarifications.cases.map((item) => item.question.trim().toLowerCase());
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(questions).size).toBe(questions.length);

  for (const item of clarifications.cases) {
    expect(Array.isArray(item.history)).toBe(true);
    expect(item.history.length).toBeGreaterThanOrEqual(2);
    expect(/\b(?:that|this|it)\b/i.test(item.question)).toBe(true);
  }
});
