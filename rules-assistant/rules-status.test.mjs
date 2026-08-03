import { expect, test } from "vitest";
import {
  buildScopeRecoveryRuling,
  isGameplayQuestionPlan,
  normalizeCurrentRulingStatus,
  toLegacyRulingStatus
} from "./rules-status.js";

test("maps new classifications through the legacy database constraint", () => {
  expect(toLegacyRulingStatus("explicit")).toBe("explicit");
  expect(toLegacyRulingStatus("inferred")).toBe("inferred");
  expect(toLegacyRulingStatus("provisional")).toBe("unresolved");
  expect(toLegacyRulingStatus("out_of_scope")).toBe("unresolved");
  expect(toLegacyRulingStatus("source_lookup")).toBe("unresolved");
});

test("preserves every current player-facing ruling status", () => {
  for (const status of [
    "explicit", "inferred", "provisional", "out_of_scope", "unresolved", "source_lookup"
  ]) {
    expect(normalizeCurrentRulingStatus(status)).toBe(status);
  }
  expect(normalizeCurrentRulingStatus("made_up")).toBe("provisional");
});

test("does not permit a gameplay ruling plan to be treated as out of scope", () => {
  expect(isGameplayQuestionPlan({ questionType: "ruling" })).toBe(true);
  expect(isGameplayQuestionPlan({ question_type: "interaction" })).toBe(true);
  expect(isGameplayQuestionPlan({ questionType: "out_of_scope" })).toBe(false);
});

test("recovers the impossible-choice ambiguity with a concrete table ruling", () => {
  const answer = buildScopeRecoveryRuling(
    "If the opponent can choose either to discard a card or give me +1, but has no cards in Hand, what happens?"
  );
  expect(answer).toMatch(/must choose an option they can actually perform/i);
  expect(answer).toMatch(/discard option is unavailable/i);
  expect(answer).toMatch(/\+1/i);
});
