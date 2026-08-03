import { expect, test } from "vitest";
import {
  buildScopeRecoveryRuling,
  isGameplayQuestionPlan,
  normalizeCurrentAnswerMode,
  normalizeCurrentRulingStatus,
  toLegacyAnswerMode,
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

test("maps current answer modes through the legacy database constraint", () => {
  expect(toLegacyAnswerMode("ai")).toBe("ai");
  expect(toLegacyAnswerMode("ai_verified")).toBe("ai");
  expect(toLegacyAnswerMode("local_fallback")).toBe("retrieval_only");
  expect(toLegacyAnswerMode("source_lookup")).toBe("retrieval_only");
  expect(toLegacyAnswerMode("retrieval_only")).toBe("retrieval_only");
});

test("preserves every current answer mode for review diagnostics", () => {
  for (const mode of ["ai", "ai_verified", "local_fallback", "retrieval_only", "source_lookup"]) {
    expect(normalizeCurrentAnswerMode(mode)).toBe(mode);
  }
  expect(normalizeCurrentAnswerMode("made_up")).toBe("ai");
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
