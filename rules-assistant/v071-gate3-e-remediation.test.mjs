import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  normalizeR13RulingStatus,
  shouldDemoteCombinedAuthorityInteraction,
  shouldDemoteNamedMovementInteraction,
  shouldForceAbsentProcedureGap
} from "./r13-classification.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  contextualQuery
} from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function augmented(question, history = []) {
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, retrieval);
}

function source(title, excerpt = "", canonicalId = "") {
  return { id: "S1", title, heading: title.replace(/^Card:\s*/i, ""), excerpt, canonicalId };
}

describe("Gate 3 tranche E r16 remediation", () => {
  test("bumps the production behavior revision without changing the frozen tranche E datasets", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260917-17");
  });

  test.each([
    [
      "A battle reaches Gambits but later ends without a winner. Can an effect that says 'after you win a battle' still trigger because I had the higher battle total when the sequence ended?",
      "rulebook:battles-ending-without-a-winner"
    ],
    [
      "Military begins the turn already at the 2 Command maximum and wins its first battle, so no Command can be added. Later that turn it spends 1 Command and wins another battle. Does the later win now generate Command?",
      "rulebook:complete-rules-17"
    ],
    [
      "Military has not gained Command yet this turn, but a battle involving it ends by withdrawal with no winner. Does that sequence generate the normal 1 Command?",
      "rulebook:complete-rules-17"
    ],
    [
      "they accepted my terms. do we still do aftermath stuff?",
      "rulebook:accepted-terms"
    ]
  ])("promotes fresh direct-authority case %# to explicit", (question, requiredId) => {
    const sources = augmented(question);
    expect(sources.map((item) => item.canonicalId)).toContain(requiredId);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("prioritizes the generic reroll rule for an ordinary reroll question", () => {
    const question = "I roll a 6, then an effect makes me reroll that die and I get a 2. Unless the effect says otherwise, which result do I use?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:rerolls");
  });

  test("prioritizes Special Operation readiness and completion for the completion payment", () => {
    const question = "There are 6 Territories in the Gauntlet and my ready Special Operation card has value 5. If I complete it legally, how much Intel is the completion payment?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:readiness-and-completion");
    expect(sources[0]?.body).toContain("Territories currently in the Gauntlet");
    expect(sources[0]?.body).toContain("Minimum payment is 1 Intel");
  });

  test("carries Ritual of Ascension authority into a terse follow-up", () => {
    const history = [
      {
        role: "user",
        content: "My Ritual of Ascension is underway with all three cards bound. I initiate a battle and win it. Does that complete the Ritual?"
      },
      {
        role: "assistant",
        content: "Yes. Initiating and then winning a battle while all three Ritual cards remain bound completes the Ritual and immediately wins the game."
      }
    ];
    const question = "What if the opponent initiated that battle and I won as the defender instead?";
    const sources = augmented(question, history);
    expect(sources.map((item) => item.canonicalId).slice(0, 2)).toEqual([
      "rulebook:completion",
      "rulebook:interruption"
    ]);
  });

  test("demotes Reembodiment plus Transmutation to a combined-authority interpretation", () => {
    const question = "Reembodiment is banked. The first Arcane card I put from Hand into my Graveyard this turn is the card I sacrifice for Transmutation. After Transmutation resolves, can Reembodiment return another lower-value card from my Graveyard to Hand?";
    const sources = [
      source("Card: Reembodiment", "The first time each turn you put an Arcane card from your Hand in your Graveyard as a cost or part of an effect you control, after that effect resolves, you may return one other lower-value card from your Graveyard to your Hand.", "card:mystics-reembodiment"),
      source("17. Mystics › Rites and progression › Complete rules › Transmutation", "Once per turn, before dice are rolled in a battle, you may put one card from your Hand in your Graveyard. Add its value to your battle total.", "rulebook:transmutation")
    ];
    expect(shouldDemoteCombinedAuthorityInteraction(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("demotes Anathema plus Necromancy to a combined-authority interpretation", () => {
    const question = "My opponent resolves Necromancy and is about to return selected cards from their Graveyard to Hand. I control banked Anathema. Can I discard Anathema to stop those selected cards from leaving the Graveyard?";
    const sources = [
      source("Card: Anathema", "When an effect an opponent controls would move one or more cards from their Graveyard to another zone, you may discard this card. If you do, those cards remain in their Graveyard.", "card:inquisition-anathema"),
      source("Card: Necromancy", "Choose up to three non-Necromancy cards in your Graveyard, then return the chosen cards to your Hand.", "card:mystics-necromancy")
    ];
    expect(shouldDemoteCombinedAuthorityInteraction(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("retrieves the movement rule and demotes Phantom Passage's battle consequence to inferred", () => {
    const question = "I play Phantom Passage and choose a Territory I control that is currently occupied by the opponent's token. When I move there, does entering the opponent's Position initiate a battle?";
    const sources = augmented(question);
    const ids = sources.map((item) => item.canonicalId);
    expect(ids).toContain("card:neutral-phantom-passage");
    expect(ids).toContain("rulebook:movement-granted-by-effects");
    expect(shouldDemoteNamedMovementInteraction(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("classifies a confirmed absent concession procedure as a provisional rules gap", () => {
    const question = "My opponent wants to concede halfway through the game. Does the published v0.7.1 ruleset define a formal concession procedure or a specific rule for awarding the win?";
    const sources = augmented(question);
    expect(shouldForceAbsentProcedureGap(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("provisional");
  });

  test("preserves the existing Leveraged Buyout printed-card conflict boundary", () => {
    const sources = [
      source(
        "Card: Leveraged Buyout",
        "Battle collateral goes to your Graveyard when battle cards are cleared.",
        "card:financiers-leveraged-buyout"
      ),
      source(
        "15. Financiers › Financier-specific rules › Collateral",
        "Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase.",
        "rulebook:collateral"
      ),
      source(
        "Golden Rules",
        "When two rules or effects genuinely conflict, follow the more specific one.",
        "rulebook:golden-rules"
      )
    ];
    expect(normalizeR13RulingStatus("explicit", "How does Leveraged Buyout battle collateral resolve?", sources)).toBe("inferred");
  });
});
