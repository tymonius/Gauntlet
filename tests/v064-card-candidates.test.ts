import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = JSON.parse(readFileSync("docs/v0.6.4-card-additions.json", "utf8"));
const catalogPage = readFileSync("card-design/index.html", "utf8");
const catalogOverlay = readFileSync("card-design/current-card-catalog.js", "utf8");
const cardRenderer = readFileSync("card-design/card-review-render.js", "utf8");
const currentAuthority = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const starterDecks = currentAuthority.starterDecks;

const expectedByAllegiance: Record<string, string[]> = {
  Neutral: ["Phantom Passage", "Battlefield Plunder"],
  Military: ["High Command", "War Witch"],
  Diplomats: ["Plenipotentiary", "Diplomatic Divination"],
  Financiers: ["War Bonds", "Actuarial Alchemy"],
  Intelligence: ["Regime Change", "Spectral Surveillance"],
  Mystics: ["Reembodiment", "Threefold Vision"],
  Inquisition: ["Retribution", "Anathema", "Malleus Maleficarum"],
};

const expectedArcane = new Set([
  "Phantom Passage",
  "War Witch",
  "Diplomatic Divination",
  "Actuarial Alchemy",
  "Spectral Surveillance",
  "Reembodiment",
  "Threefold Vision",
]);

describe("v0.6.4 full card-expansion candidate staging", () => {
  it("targets 52 Neutral cards, 15 per faction, and 142 playable cards after one retirement", () => {
    expect(source.version).toBe("v0.6.4-candidate");
    expect(source.base_version).toBe("v0.6.3");
    expect(source.ready_for_game_data).toBe(false);
    expect(source.card_count).toBe(15);
    expect(source.cards).toHaveLength(15);
    expect(source.retirement_count).toBe(1);
    expect(source.retired_cards).toEqual([
      expect.objectContaining({
        id: "inquisition-no-martyrs",
        name: "No Martyrs",
        last_active_version: "v0.6.3",
        replacement: "inquisition-malleus-maleficarum",
      }),
    ]);
    expect(source.target_pool_sizes).toEqual({
      neutral: 52,
      each_faction: 15,
      total_playable_cards: 142,
    });

    for (const [allegiance, names] of Object.entries(expectedByAllegiance)) {
      expect(source.cards.filter((card: any) => card.allegiance === allegiance).map((card: any) => card.name)).toEqual(names);
    }
  });

  it("keeps the accepted Arcane identities explicit in card data", () => {
    for (const card of source.cards) {
      expect(card.trait === "Arcane").toBe(expectedArcane.has(card.name));
    }
  });

  it("records Malleus Maleficarum as an Inquisition Asset that declares specific cards heretical", () => {
    const malleus = source.cards.find((card: any) => card.name === "Malleus Maleficarum");
    expect(malleus).toMatchObject({
      id: "inquisition-malleus-maleficarum",
      allegiance: "Inquisition",
      cost: 3,
      card_form: "Asset",
      trait: null,
    });
    expect(malleus.cost_status).toContain("test 3 versus 4");
    expect(malleus.effects.map((effect: any) => effect.label)).toEqual(["Asset"]);
    expect(malleus.effects[0].text).toBe(
      "Once per turn, when an opponent plays or reveals a non-Arcane card, you may declare it heretical. It has the Arcane trait for that play or reveal and until the end of the turn.",
    );
  });

  it("puts Malleus in the Witch Hunter starter without displacing Grand Inquisitor utility cards", () => {
    const witchHunter = starterDecks.decks.find((deck: any) => deck.id === "inquisition-witch-hunter-relentless-pursuit");
    const grandInquisitor = starterDecks.decks.find((deck: any) => deck.id === "inquisition-grand-inquisitor-final-judgment");

    expect(witchHunter.signatureCards).toEqual([
      "Confession",
      "Court Martial",
      "Malleus Maleficarum",
      "Retribution",
    ]);
    expect(witchHunter.cards.find((card: any) => card.name === "Malleus Maleficarum")).toEqual({
      name: "Malleus Maleficarum",
      quantity: 1,
    });
    expect(witchHunter.cards.find((card: any) => card.name === "Court Martial")).toEqual({
      name: "Court Martial",
      quantity: 2,
    });
    expect(witchHunter.cards.some((card: any) => card.name === "No Martyrs")).toBe(false);
    expect(witchHunter.cards.reduce((total: number, card: any) => total + card.quantity, 0)).toBe(30);
    expect(witchHunter.deckbuildingValue).toBe(60);

    expect(grandInquisitor.cards.find((card: any) => card.name === "Anathema")).toEqual({ name: "Anathema", quantity: 1 });
    expect(grandInquisitor.cards.find((card: any) => card.name === "Excommunication")).toEqual({ name: "Excommunication", quantity: 1 });
    expect(grandInquisitor.cards.some((card: any) => card.name === "Malleus Maleficarum")).toBe(false);
  });

  it("uses current effect headings and inherent-bank conventions", () => {
    const retired = new Set(["Use", "Activate", "Battle"]);
    for (const card of source.cards) {
      for (const effect of card.effects) {
        expect(retired.has(effect.label)).toBe(false);
        expect(effect.text).not.toBe("Bank this card.");
      }
    }

    const printedBankActions = source.cards
      .flatMap((card: any) => card.effects
        .filter((effect: any) => effect.label === "Action" && effect.text.startsWith("Bank this card."))
        .map((effect: any) => [card.name, effect.text]));
    expect(printedBankActions).toEqual([
      ["High Command", "Bank this card. You may have only one banked High Command."],
      ["War Bonds", "Bank this card. You may have only one banked War Bonds."],
      ["Regime Change", "Bank this card. You may have only one banked Regime Change."],
      ["Reembodiment", "Bank this card. You may have only one banked copy."],
    ]);
  });

  it("applies the shared movement, Overlay, shorthand, and role-label conventions", () => {
    const phantomPassage = source.cards.find((card: any) => card.name === "Phantom Passage");
    expect(phantomPassage.effects[0].text).toBe("Put this card in your Graveyard. Move to any Territory you control.");
    expect(phantomPassage.effects[0].text).not.toMatch(/may (start|create) a battle/i);

    const battlefieldPlunder = source.cards.find((card: any) => card.name === "Battlefield Plunder");
    expect(battlefieldPlunder.effects.map((effect: any) => effect.label)).toEqual(["Gambit/Tactic", "Overlay"]);
    expect(battlefieldPlunder.effects[0].text).toContain("place this Overlay");
    expect(battlefieldPlunder.effects[1].text).toContain("+2 Cards");

    const warWitch = source.cards.find((card: any) => card.name === "War Witch");
    expect(warWitch.effects[0].text).toContain("+1 Tactic from your Graveyard");

    const plenipotentiary = source.cards.find((card: any) => card.name === "Plenipotentiary");
    expect(plenipotentiary.effects.map((effect: any) => effect.label)).toEqual(["Asset", "Gambit"]);
    expect(plenipotentiary.unique).toBe(true);
  });

  it("preserves the locked wording-sensitive details from the Arcane pass", () => {
    const actuarial = source.cards.find((card: any) => card.name === "Actuarial Alchemy");
    expect(actuarial.effects[0].text).toContain("Battle Total or Tiebreak Roll exceeded yours");

    const spectral = source.cards.find((card: any) => card.name === "Spectral Surveillance");
    expect(spectral.effects[0].text).toContain("instead of spending Intel");
    expect(spectral.effects[0].text).toContain("Gambits OR Tactics");

    const divination = source.cards.find((card: any) => card.name === "Diplomatic Divination");
    expect(divination.effects[0].label).toBe("Terms");
    expect(divination.effects[0].text).toContain("Otherwise, put it in your Graveyard.");
  });

  it("preserves the v0.6.4 staging document only as provenance for the flattened v0.7.0 card pool", () => {
    expect(currentAuthority.version).toBe("v0.7.0");
    expect(currentAuthority.provenance.historicalInputs.cardChanges).toBe("/docs/v0.6.4-card-additions.json");
    expect(currentAuthority).not.toHaveProperty("sources");
    expect(currentAuthority).not.toHaveProperty("resolution");

    for (const staged of source.cards) {
      const current = currentAuthority.gameplay.cards.find((card: any) => card.id === staged.id);
      expect(current).toBeDefined();
      expect(current.name).toBe(staged.name);
    }
    expect(currentAuthority.gameplay.cards.some((card: any) => card.id === "inquisition-no-martyrs")).toBe(false);
    expect(currentAuthority.gameplay.cards.some((card: any) => card.id === "inquisition-malleus-maleficarum")).toBe(true);

    expect(catalogPage).toContain('src="current-card-catalog.js"');
    expect(catalogOverlay).toContain("loadCurrentGame");
    expect(catalogOverlay).not.toContain("/docs/v0.6.4-card-additions.json");
    expect(catalogOverlay).not.toContain("removeRetiredCards");
    expect(catalogOverlay).not.toContain("installV064PlaytestCards");

    expect(cardRenderer).toContain("loadCurrentGame");
    expect(cardRenderer).toContain("currentGame.findCard(cardId)");
    expect(cardRenderer).toContain("source: currentGame.authorityUrl");
    expect(cardRenderer).not.toContain("/artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json");
    expect(cardRenderer).not.toContain("/docs/v0.6.4-card-additions.json");
  });
});
