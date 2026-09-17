import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  normalizeR13RulingStatus,
  shouldPromoteDirectEnumeratedProcedure,
  shouldPromoteNamedDirectAuthority
} from "./r13-classification.js";
import { augmentRetrievalForContext, buildAmbiguousReferentClarification } from "./worker-v071.js";

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

function titlesFor(query) {
  const retrieval = retrieveRules(corpus, query, { limit: 10, excerptLength: 1200 });
  return augmentRetrievalForContext(corpus, query, [], retrieval)
    .map((source) => String(source.title || source.heading || ""));
}

function source(title, excerpt = "", canonicalId = "rulebook:test") {
  return { id: "S1", canonicalId, title, heading: title, excerpt };
}

function clarification(question, history, retrieval) {
  return buildAmbiguousReferentClarification(question, history, retrieval);
}

describe("Gate 3 tranche D player-language production retrieval regressions", () => {
  test("transmuted retrieves Transmutation authority", () => {
    const titles = titlesFor("i transmuted a card. do i get the text on the card too");
    expect(titles.some((title) => /Transmutation/i.test(title))).toBe(true);
  });

  test("condemned retrieves Condemnation authority", () => {
    const titles = titlesFor("i lost. their tactic still gets condemned?");
    expect(titles.some((title) => /Condemnation/i.test(title))).toBe(true);
  });
});

describe("Gate 3 tranche D direct-authority classification regressions", () => {
  test("Onset withdrawal is explicit when the authority directly says there is no Aftermath", () => {
    const question = "I withdraw during Onset before Gambits are set. Do we still resolve an Aftermath and clear battle cards?";
    const sources = [source(
      "Withdrawal during Onset",
      "A player may withdraw during Onset. Withdrawal during Onset ends the battle during Onset with no winner or battle result. No Gambits are set and there is no Aftermath."
    )];
    expect(shouldPromoteDirectEnumeratedProcedure(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Refused Terms no-winner Stake return is explicit", () => {
    const questions = [
      "My Proposal was refused, but the battle later ends by withdrawal with no winner. What happens to my staked Influence and the Proposal?",
      "they refused my deal then fight ended no winner. do i lose the stake"
    ];
    const sources = [source(
      "Refused Terms",
      "If the battle ends without a winner, the Proposal is not imposed and the Diplomat returns the Stake."
    )];
    for (const question of questions) {
      expect(shouldPromoteDirectEnumeratedProcedure(question, sources)).toBe(true);
      expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
    }
  });

  test("post-Onset no-winner battle-card destinations are explicit", () => {
    const question = "we already played gambits then the fight ended no winner. where do the cards go";
    const sources = [
      source(
        "Battles ending without a winner",
        "If a battle ends without a winner after the sequence has proceeded to Gambits, clear the committed battle cards and remaining Reserve cards normally unless the ending effect gives another destination."
      ),
      source(
        "Clearing battle cards",
        "Each Gambit goes to its owner's Graveyard. Each Tactic goes to its owner's Discard Pile."
      )
    ];
    expect(shouldPromoteDirectEnumeratedProcedure(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("ordinary-language Defensive Edge tie question stays explicit", () => {
    const question = "im defending but its not my land. tie means i win right?";
    const sources = [source(
      "Defensive Edge",
      "The defender has Defensive Edge when they control the contested Territory or are making a Last Stand. A defender with Defensive Edge wins tied battle totals."
    )];
    expect(shouldPromoteDirectEnumeratedProcedure(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("if-framed Diplomatic Recognition question can use its named direct authority", () => {
    const question = "Diplomatic Recognition was refused and the Diplomat wins the resulting Counterattack battle. Besides advancing the Front Line if able, how much normal Influence is gained for imposing that Proposal?";
    const sources = [source(
      "Faction: Diplomatic Recognition",
      "If the Diplomat wins, advance the Front Line one Territory if able. The Diplomat gains no Influence for imposing Diplomatic Recognition.",
      "faction:diplomatic-recognition"
    )];
    expect(shouldPromoteNamedDirectAuthority(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });
});

describe("Gate 3 tranche D ambiguity regressions", () => {
  test("clarifies Rally versus Entrench when 'that one' has two candidates", () => {
    const history = [
      { role: "user", content: "Compare Rally and Entrench for me." },
      { role: "assistant", content: "Rally helps the General before dice while attacking; Entrench helps the Commandant before dice while defending." }
    ];
    const retrieval = [
      source("Rally", "", "rulebook:rally"),
      source("Entrench", "", "rulebook:entrench")
    ];
    expect(clarification("Can I use that one if I started the battle?", history, retrieval)?.responseType).toBe("clarification");
  });

  test("clarifies between two Rites", () => {
    const history = [
      { role: "user", content: "I'm deciding between Rite of Crossing and Rite of Consecration." },
      { role: "assistant", content: "Crossing tracks continued occupation or later control; Consecration tracks a specific Overlay and a battle on its Territory." }
    ];
    const retrieval = [
      source("Rite of Crossing", "", "rite:crossing"),
      source("Rite of Consecration", "", "rite:consecration")
    ];
    expect(clarification("Does that Rite reset if I lose a battle?", history, retrieval)?.responseType).toBe("clarification");
  });

  test("clarifies between two Assets", () => {
    const history = [
      { role: "user", content: "I'm comparing Margin Loan and Tariffs in my Asset Bank." },
      { role: "assistant", content: "Margin Loan can hold collateral until it is settled; Tariffs has restrictions on leaving play during the turn it is banked." }
    ];
    const retrieval = [
      source("Card: Margin Loan", "", "card:financiers-margin-loan"),
      source("Card: Tariffs", "", "card:financiers-tariffs")
    ];
    expect(clarification("If I replace that Asset, does it default?", history, retrieval)?.responseType).toBe("clarification");
  });

  test("clarifies between two Proposals", () => {
    const history = [
      { role: "user", content: "Compare Open Channels and Diplomatic Recognition as Proposals." },
      { role: "assistant", content: "Open Channels involves revealing Hands; Diplomatic Recognition applies while defending a Counterattack and can advance the Diplomat's Front Line." }
    ];
    const retrieval = [
      source("Proposal: Open Channels", "", "proposal:open-channels"),
      source("Proposal: Diplomatic Recognition", "", "proposal:diplomatic-recognition")
    ];
    expect(clarification("Does that one make both of us withdraw?", history, retrieval)?.responseType).toBe("clarification");
  });

  test("does not clarify a self-contained 'that card' with one local compatible antecedent", () => {
    const question = "The opponent's Tactic goes to their Graveyard only because Condemnation changed its normal destination. If this is the first qualifying Aftermath this turn, can that card generate the Inquisition's normal Conviction gain?";
    const retrieval = [
      source("Condemnation", "", "rulebook:condemnation"),
      source("Conviction", "", "rulebook:conviction")
    ];
    expect(clarification(question, [], retrieval)).toBeNull();
  });
});
