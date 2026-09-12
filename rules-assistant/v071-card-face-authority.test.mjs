import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import {
  V071_CANONICAL_SOURCE_PATH,
  sanitizeV071CanonicalDataForRules
} from "./v071-public-corpus.js";

const canonicalData = JSON.parse(readFileSync(V071_CANONICAL_SOURCE_PATH, "utf8"));

describe("v0.7.1 playable-card authority normalization", () => {
  test("effect-backed cards retain printed effects while dropping legacy flat face fields", () => {
    const source = {
      gameplay: {
        cards: [{
          id: "test-card",
          name: "Test Card",
          cost: 3,
          effects: [{ label: "Asset", text: "Printed current rule." }],
          action: "Legacy duplicate.",
          asset: "Legacy duplicate.",
          gambit_tactic: "Legacy duplicate.",
          loan: "Stale hidden rule."
        }]
      }
    };

    const normalized = sanitizeV071CanonicalDataForRules(source);
    const card = normalized.gameplay.cards[0];

    expect(card.effects).toEqual([{ label: "Asset", text: "Printed current rule." }]);
    expect(card.cost).toBe(3);
    expect(card.action).toBeUndefined();
    expect(card.asset).toBeUndefined();
    expect(card.gambit_tactic).toBeUndefined();
    expect(card.loan).toBeUndefined();
    expect(source.gameplay.cards[0].loan).toBe("Stale hidden rule.");
  });

  test("Margin Loan corpus text excludes its stale legacy loan instruction", () => {
    const normalized = sanitizeV071CanonicalDataForRules(canonicalData);
    const marginLoan = normalized.gameplay.cards.find((card) => card.id === "financiers-margin-loan");
    expect(marginLoan).toBeTruthy();
    expect(marginLoan.loan).toBeUndefined();

    const corpus = buildRulesCorpus({
      canonicalData: normalized,
      rulebookMarkdown: "",
      siteOrigin: "https://gauntlet.run"
    });
    const document = corpus.documents.find((item) => item.id === "card:financiers-margin-loan");

    expect(document?.body).toMatch(/While this remains banked, you may not draw at the start of your turn/i);
    expect(document?.body).not.toMatch(/At the start of your next turn, after the Capture step and income/i);
  });
});
