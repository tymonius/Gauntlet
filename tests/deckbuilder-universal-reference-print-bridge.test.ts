import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const factionComponents = readFileSync("deckbuilder/faction-components.js", "utf8");
const productionPrint = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;

describe("Deckbuilder Universal Reference print bridge", () => {
  it("keeps the Universal Reference final and required in every Deck", () => {
    const universal = contract.sharedComponents.find((component: any) => component.id === "universal-reference");
    expect(universal).toMatchObject({
      family: "reference-card",
      deckInclusion: "every-deck",
      designStatus: "final",
      productionStatus: "ready",
      backPolicy: "twoSided",
    });
  });

  it("bridges shared references into the legacy faction-scoped production matcher", () => {
    expect(productionPrint).toContain('if (component.faction !== factionId) return false;');
    expect(factionComponents).toContain("function sharedReferencePrintCandidate(component)");
    expect(factionComponents).toContain('Object.defineProperty(bridged, "faction"');
    expect(factionComponents).toContain('get: () => String(state.factionId || "").trim().toLowerCase()');
    expect(factionComponents).toContain("sharedReferences.map(sharedReferencePrintCandidate)");
    expect(factionComponents).toContain("...printSharedReferences");
  });

  it("does not duplicate the bridged every-deck reference in the faction component list", () => {
    expect(factionComponents).toContain('component.deckInclusion !== "every-deck"');
  });
});
