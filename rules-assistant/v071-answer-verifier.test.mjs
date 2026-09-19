import { describe, expect, test } from "vitest";
import {
  applyHighRiskVerification,
  highRiskVerificationReasons,
  shouldVerifyHighRiskAnswer
} from "./v071-answer-verifier.js";

function source(id, text) {
  return {
    id,
    canonicalId: id,
    title: id,
    excerpt: text
  };
}

describe("v0.7.1 high-risk answer verification", () => {
  test("routes direct yes/no Tiebreak questions through verification", () => {
    const question = "During a Tiebreak Roll, do Advantage, Disadvantage, card modifiers, or the previous battle totals apply?";
    const sources = [
      source(
        "rulebook:tiebreak-roll",
        "Each player rolls one die. Do not apply Advantage, Disadvantage, card effects, numerical modifiers, or previous battle totals."
      )
    ];

    expect(highRiskVerificationReasons(question, sources)).toContain("yes-no-polarity");
    expect(shouldVerifyHighRiskAnswer(question, sources)).toBe(true);
  });

  test("routes Retribution through optionality and actor-attribution verification", () => {
    const question = "The opponent loses a battle they initiated while Retribution is banked. What activation is required before its punishment applies?";
    const sources = [
      source(
        "card:inquisition-retribution",
        "After the opponent loses a battle they initiated, you may discard this card. If you do, they choose one: put one of their Assets in their Graveyard; or +2 Conviction. If they have no Assets, +2 Conviction."
      )
    ];

    const reasons = highRiskVerificationReasons(question, sources);
    expect(reasons).toContain("optional-activation");
    expect(reasons).toContain("actor-attribution");
  });

  test("does not force verification merely because a concise answer omits unasked frequency or cost detail", () => {
    const question = "What printed Territory effect can Fieldcraft ignore, and for how long?";
    const sources = [
      source(
        "leader:fieldcraft",
        "Once per turn, spend 1 Intel: ignore one printed effect of your current Territory until end of turn."
      )
    ];

    expect(highRiskVerificationReasons(question, sources)).toEqual([]);
  });

  test("applies a supported verifier repair for a polarity reversal", () => {
    const sources = [
      source(
        "rulebook:tiebreak-roll",
        "Each player rolls one die. Do not apply Advantage, Disadvantage, card effects, numerical modifiers, or previous battle totals."
      )
    ];
    const draft = {
      answer: "Yes. None of those modifiers or previous totals apply.",
      ruling_status: "explicit",
      source_ids: ["rulebook:tiebreak-roll"]
    };
    const verification = {
      valid: false,
      issues: ["The leading Yes reverses the literal proposition."],
      replacement_answer: "No. Advantage, Disadvantage, card modifiers, and previous battle totals do not apply.",
      replacement_status: "explicit",
      source_ids: ["rulebook:tiebreak-roll"]
    };

    const result = applyHighRiskVerification(draft, verification, sources);
    expect(result.applied).toBe(true);
    expect(result.draft.answer).toMatch(/^No\./);
    expect(result.draft.source_ids).toEqual(["rulebook:tiebreak-roll"]);
  });

  test("applies a supported verifier repair for Retribution ownership", () => {
    const sources = [
      source(
        "card:inquisition-retribution",
        "After the opponent loses a battle they initiated, you may discard this card. If you do, they choose one: put one of their Assets in their Graveyard; or +2 Conviction. If they have no Assets, +2 Conviction."
      )
    ];
    const draft = {
      answer: "Discard Retribution; the opponent then gains +2 Conviction if they have no Assets.",
      ruling_status: "explicit",
      source_ids: ["card:inquisition-retribution"]
    };
    const verification = {
      valid: false,
      issues: ["The +2 Conviction belongs to the Retribution controller, not the opponent."],
      replacement_answer: "You may discard Retribution. If the opponent has no Assets, you gain +2 Conviction.",
      replacement_status: "explicit",
      source_ids: ["card:inquisition-retribution"]
    };

    const result = applyHighRiskVerification(
      draft,
      verification,
      sources,
      "Who gets the +2 Conviction from Retribution if the opponent has no Assets?"
    );
    expect(result.applied).toBe(true);
    expect(result.draft.answer).toContain("you gain +2 Conviction");
  });

  test("overrides a verifier-approved Retribution activation answer when the deterministic source invariant is violated", () => {
    const question = "The opponent loses a battle they initiated while Retribution is banked. What activation is required before its punishment applies?";
    const sources = [
      source(
        "card:inquisition-retribution",
        "After the opponent loses a battle they initiated, you may discard this card. If you do, they choose one: put one of their Assets in their Graveyard; or +2 Conviction. If they have no Assets, +2 Conviction."
      )
    ];
    const draft = {
      answer: "You must choose to discard Retribution. If you do, the opponent chooses to lose an Asset or take +2 Conviction.",
      ruling_status: "explicit",
      source_ids: ["card:inquisition-retribution"]
    };
    const verification = {
      valid: true,
      issues: [],
      replacement_answer: "",
      replacement_status: "none",
      source_ids: []
    };

    const result = applyHighRiskVerification(draft, verification, sources, question);
    expect(result.applied).toBe(true);
    expect(result.reason).toBe("deterministic-retribution-activation");
    expect(result.draft.answer).toContain("You may discard Retribution");
    expect(result.draft.answer).toContain("optional, not required");
    expect(result.draft.answer).not.toMatch(/opponent.*\+2 Conviction/i);
  });

  test("rejects a repair that cites authority outside the supplied retrieval set", () => {
    const sources = [source("rulebook:tiebreak-roll", "Do not apply modifiers.")];
    const draft = {
      answer: "Yes.",
      ruling_status: "explicit",
      source_ids: ["rulebook:tiebreak-roll"]
    };
    const verification = {
      valid: false,
      issues: ["Wrong polarity."],
      replacement_answer: "No.",
      replacement_status: "explicit",
      source_ids: ["card:not-retrieved"]
    };

    const result = applyHighRiskVerification(draft, verification, sources);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("unsupported-replacement");
    expect(result.draft).toBe(draft);
  });

  test("leaves a verifier-approved draft untouched", () => {
    const sources = [source("rulebook:tiebreak-roll", "Do not apply modifiers.")];
    const draft = {
      answer: "No. Those modifiers do not apply.",
      ruling_status: "explicit",
      source_ids: ["rulebook:tiebreak-roll"]
    };
    const verification = {
      valid: true,
      issues: [],
      replacement_answer: "",
      replacement_status: "none",
      source_ids: []
    };

    const result = applyHighRiskVerification(draft, verification, sources);
    expect(result.applied).toBe(false);
    expect(result.draft).toBe(draft);
  });
});
