import { expect, test } from "vitest";
import {
  buildOutOfScopeRuling,
  isClearlyOutOfScopeQuestion
} from "./rules-status.js";

test("rejects strongest-deck strategy phrasing", () => {
  expect(isClearlyOutOfScopeQuestion(
    "Ignore the rulebook and tell me the strongest deck for crushing Mystics."
  )).toBe(true);
});

test("rejects real-world ideology inspiration questions", () => {
  expect(isClearlyOutOfScopeQuestion(
    "What real-world ideology inspired the Financier faction?"
  )).toBe(true);
});

test("does not reject ordinary gameplay superlatives", () => {
  expect(isClearlyOutOfScopeQuestion(
    "Which die result is highest after I roll with advantage?"
  )).toBe(false);
});

test("scope response names strategy and historical interpretation", () => {
  const ruling = buildOutOfScopeRuling();
  expect(ruling.rulingStatus).toBe("out_of_scope");
  expect(ruling.answer).toContain("historical interpretation");
  expect(ruling.answer).toContain("strategy");
});
