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

  it("renders shared references directly from current component authority", () => {
    expect(productionPrint).toContain('...(currentGame.sharedComponents || [])');
    expect(productionPrint).toContain("function contractComponentById");
    expect(productionPrint).toContain("function renderProductionComponentHtml");
    expect(productionPrint).not.toContain("sharedReferencePrintCandidate");
    expect(factionComponents).toContain('component.deckInclusion === "every-deck"');
  });

  it("does not duplicate every-deck references in the faction-only component list", () => {
    expect(factionComponents).toContain('component.deckInclusion !== "every-deck"');
  });
});
