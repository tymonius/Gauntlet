import { describe, expect, test } from "vitest";
import { BEHAVIOR_REVISION, buildAmbiguousReferentClarification } from "./worker-v071.js";
import { normalizeCurrentAnswerMode, toLegacyAnswerMode } from "./rules-status.js";

const reviewedHistory = [
  { role: "user", content: "I am the defender, I currently have advantage, and both players have committed their Battle Hands. What happens next?" },
  { role: "assistant", content: "The complete battle sequence is not clear from that phrasing. Defender Advantage matters later when dice are rolled." }
];

const reviewedRetrieval = [
  { canonicalId: "rulebook:defenders-advantage", title: "Defender's Advantage" },
  { canonicalId: "rulebook:battle-sequence", title: "Battle Sequence" }
];

describe("v0.7.1 ambiguous follow-up clarification", () => {
  test("the reviewed unidentified-ability follow-up asks for the missing referent instead of speculating", () => {
    const result = buildAmbiguousReferentClarification(
      "Can I use this ability right now?",
      reviewedHistory,
      reviewedRetrieval
    );
    expect(result).not.toBeNull();
    expect(result?.rulingStatus).toBe("unresolved");
    expect(result?.responseType).toBe("clarification");
    expect(result?.executionPath).toBe("deterministic-clarification");
    expect(result?.answer).toContain("Which ability do you mean?");
    expect(result?.answer).toContain("current phase or step");
    expect(result?.answer).not.toMatch(/Intelligence|Surveillance|Interference/i);
  });

  test("a single clearly named ability in the immediate exchange remains eligible for ordinary follow-up resolution", () => {
    const history = [
      { role: "user", content: "How does Transmutation work?" },
      { role: "assistant", content: "Transmutation is an ability you may use before dice are rolled in a battle." }
    ];
    const retrieval = [
      { canonicalId: "rulebook:transmutation", title: "Transmutation" }
    ];
    expect(buildAmbiguousReferentClarification("Can I use this ability right now?", history, retrieval)).toBeNull();
  });

  test("a named subject without an ability/effect/feature bridge still requests clarification", () => {
    const history = [
      { role: "user", content: "How does Transmutation work?" },
      { role: "assistant", content: "Transmutation may be used before dice are rolled in a battle." }
    ];
    const retrieval = [
      { canonicalId: "rulebook:transmutation", title: "Transmutation" }
    ];
    expect(buildAmbiguousReferentClarification("Can I use this ability right now?", history, retrieval)?.rulingStatus).toBe("unresolved");
  });

  test("self-contained questions are not diverted into clarification", () => {
    expect(buildAmbiguousReferentClarification(
      "Can I use Transmutation before dice are rolled?",
      reviewedHistory,
      reviewedRetrieval
    )).toBeNull();
  });

  test("clarification is a first-class current answer mode while remaining legacy compatible", () => {
    expect(normalizeCurrentAnswerMode("clarification")).toBe("clarification");
    expect(toLegacyAnswerMode("clarification")).toBe("ai");
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260910-2");
  });
});
