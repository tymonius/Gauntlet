import { describe, expect, it } from "vitest";
import { resolveV063DeterministicRuling, V063_DETERMINISTIC_CASE_COUNT } from "./rules-deterministic-v063.js";

const cases = [
  ["What is the setup order?", "draw four", "Setup"],
  ["How does the opening Hand work?", "draw four", "Opening Hand"],
  ["When do I arrange my Territories after the opening discard?", "before the first-player roll", "Territory arrangement"],
  ["Does putting my token on my starting Territory count as entering it?", "does not count as entering", "Starting position"],
  ["What are the two ways to run the Gauntlet and win?", "two equal normal ways", "Run the Gauntlet"],
  ["Can Fortify capture the final Territory and win immediately?", "Yes.", "Final-Territory capture"],
  ["Can I force a Last Stand before I capture or control the final Territory?", "do not need to control or capture", "Last Stand"],
  ["What is the difference between my Deck and Draw Pile?", "Deck is the constructed set", "Deck terminology"],
  ["How does the inherent Bank Action work for an Asset?", "inherent Bank Action", "Asset"],
  ["What does Removed mean for an Asset?", "involuntarily lost", "Asset Removal"],
  ["What does Gambit/Tactic mean, and is Battle still a card heading?", "Battle and Activate are retired", "Card effect headings"],
  ["What happened to Smuggler's Pass?", "Smuggler's Run is the v0.6.3 name", "Smuggler's Run"],
  ["Was the Reserves card renamed?", "Second Line is the v0.6.3 name", "Second Line"],
  ["Can Margin Loan stay banked past my next turn?", "may remain banked beyond your next turn", "Margin Loan"],
  ["What is the default source of +1 Tactic?", "Reserve is the default source", "Additional Tactics"],
  ["Where do bound cards go when their host leaves play?", "owners' Discard Piles", "Bind"],
  ["Does reveal-stage interference happen before ordinary effects at the same stage?", "resolves before ordinary effects", "Reveal-stage interference"],
  ["What happens when I repeat another card's effect?", "new application", "Applying and repeating another effect"],
  ["What happens if a battle ends without a winner?", "neither player won or lost", "Battle ends without a winner"]
];

describe("v0.6.3 deterministic Rules Arbiter", () => {
  it("locks the expected candidate deterministic coverage count", () => {
    expect(V063_DETERMINISTIC_CASE_COUNT).toBe(cases.length);
  });

  for (const [question, marker, subject] of cases) {
    it(question, () => {
      const result = resolveV063DeterministicRuling({ question });
      expect(result).not.toBeNull();
      expect(result.subject).toBe(subject);
      expect(result.rulingStatus).toBe("explicit");
      expect(result.confidence).toBe("high");
      expect(result.answer).toContain(marker);
    });
  }

  it("does not invent a deterministic answer for unrelated questions", () => {
    expect(resolveV063DeterministicRuling({ question: "What color should my card sleeves be?" })).toBeNull();
  });
});
