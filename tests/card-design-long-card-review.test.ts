import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const expectedIds = [
  "military-shock-and-awe",
  "financiers-margin-loan",
  "diplomats-trade-concessions",
  "intelligence-sleeper-network",
  "intelligence-fog-of-war",
  "diplomats-nonbinding-resolution",
  "military-reserve-force",
  "mystics-spirit-hollow",
  "diplomats-demilitarized-zone",
  "financiers-leveraged-buyout",
  "mystics-nature-s-altar",
  "military-field-command",
];

const cardDesign = readFileSync("card-design/card-design.js", "utf8");
const renderSurface = readFileSync("card-design/long-card-render.html", "utf8");
const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");
const renderBridge = readFileSync("card-design/long-card-render.js", "utf8");
const catalogSource = readFileSync("card-design/generated/v0.6.3/long-card-review-catalog.js", "utf8");
const catalog = JSON.parse(catalogSource.slice(catalogSource.indexOf("{"), catalogSource.lastIndexOf("};") + 1));

describe("v0.6.3 long-card render review", () => {
  it("adds the requested review section to the existing card-design page in exact order", () => {
    expect(cardDesign).toContain("Long-card render review");
    expect(cardDesign).toContain("territorySection.before(section)");
    expect(cardDesign).toContain("long-card-render.html?fit=production");

    let cursor = -1;
    for (const id of expectedIds) {
      const next = cardDesign.indexOf(`['${id}'`, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it("renders through the shared production card renderer without the TTS rescue fit", () => {
    expect(renderSurface).toContain("/card-design/generated/v0.6.3/long-card-review-catalog.js");
    expect(renderSurface).toContain("/card-design/long-card-render.js");
    expect(renderBridge).toContain("/card-design/playable-card-renderer.js");
    expect(renderBridge).toContain("renderContext.artDirectionFor(card.id)");
    expect(renderBridge).toContain("/card-design/card-design.js");
    expect(renderer).toContain("get('fit') === 'production'");
    expect(renderer).toContain("element.dataset.productionFit");
    expect(renderer).toContain("fitForTts(element);");
  });

  it("uses the current v0.6.3 production catalog snapshot for all 12 cards", () => {
    expect(catalog.gameVersion).toBe("v0.6.3");
    expect(catalog.reviewCardIds).toEqual(expectedIds);
    expect(catalog.playableCards.map((card: { id: string }) => card.id)).toEqual(expectedIds);
    expect(catalog.sourceHierarchy[0]).toContain("Gauntlet_v0.6.3_Card_Text_Candidate.json");
    expect(catalog.sourceHierarchy[1]).toContain("metadata/artwork only");

    const byId = new Map(catalog.playableCards.map((card: { id: string }) => [card.id, card]));
    expect((byId.get("military-shock-and-awe") as any).sections["Gambit/Tactic"]).toContain(
      "Consolidate — Advance Front Line 1, if able; Command = 2.\n\nAfterward,"
    );
    expect((byId.get("financiers-margin-loan") as any).sections.Asset).toContain(
      "Repay — Pay Capital equal to the collateral's value +3; return it to your Hand and discard this card.\nDefault — Put both cards in your Graveyard."
    );

    const tradeConcessions = (byId.get("diplomats-trade-concessions") as any).sections.Accepted;
    expect(tradeConcessions).toContain("one available option:\n- +2 Cards.\n- Bank one eligible card from Hand.");
    expect(tradeConcessions).not.toContain("one available option:\n\n-");

    const nonbindingResolution = (byId.get("diplomats-nonbinding-resolution") as any).sections.Accepted;
    expect(nonbindingResolution).toContain("one before ratification:\n- Ratify it normally.\n- Leave it unratified;");
    expect(nonbindingResolution).not.toContain("one before ratification:\n\n-");

    const leveragedBuyout = (byId.get("financiers-leveraged-buyout") as any).sections["Gambit/Tactic"];
    expect(leveragedBuyout).toContain("as collateral. Each collateral card contributes its value toward the cost.");
    expect(leveragedBuyout).not.toContain("as collateral.\n\nEach collateral card");
  });
});
