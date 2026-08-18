import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = JSON.parse(readFileSync("docs/v0.6.4-faction-card-additions.json", "utf8"));
const catalogPage = readFileSync("card-design/index.html", "utf8");
const catalogOverlay = readFileSync("card-design/v064-faction-card-candidates.js", "utf8");
const cardRenderer = readFileSync("card-design/card-review-render.js", "utf8");

const expectedFactions = [
  "Military",
  "Diplomats",
  "Financiers",
  "Intelligence",
  "Mystics",
  "Inquisition",
];

const expectedCards = [
  "High Command",
  "Plenipotentiary",
  "War Bonds",
  "Regime Change",
  "Title TBD",
  "Retribution",
];

describe("v0.6.4 faction-card candidate staging", () => {
  it("keeps one provisional card per current faction outside canonical game data", () => {
    expect(source.version).toBe("v0.6.4-candidate");
    expect(source.base_version).toBe("v0.6.3");
    expect(source.source_issue).toBe(576);
    expect(source.mechanics_changed).toBe(true);
    expect(source.ready_for_game_data).toBe(false);
    expect(source.cards).toHaveLength(6);
    expect(source.cards.map((card: any) => card.allegiance)).toEqual(expectedFactions);
    expect(source.cards.map((card: any) => card.name)).toEqual(expectedCards);
  });

  it("uses the current card-language headings and keeps Plenipotentiary Gambit-only", () => {
    const retired = new Set(["Use", "Activate", "Battle"]);
    for (const card of source.cards) {
      for (const effect of card.effects) {
        expect(retired.has(effect.label)).toBe(false);
      }
    }

    const plenipotentiary = source.cards.find((card: any) => card.name === "Plenipotentiary");
    expect(plenipotentiary.unique).toBe(true);
    expect(plenipotentiary.effects.map((effect: any) => effect.label)).toEqual(["Action", "Asset", "Gambit"]);
    expect(plenipotentiary.effects.some((effect: any) => effect.label === "Tactic")).toBe(false);
    expect(plenipotentiary.effects.some((effect: any) => effect.label === "Gambit/Tactic")).toBe(false);
    expect(plenipotentiary.effects.find((effect: any) => effect.label === "Asset").text).toContain("Gain no Influence");
  });

  it("uses canonical-shaped playable-card records so later promotion is mechanical rather than a redesign", () => {
    for (const card of source.cards) {
      expect(card).toHaveProperty("id");
      expect(card).toHaveProperty("name");
      expect(card).toHaveProperty("allegiance");
      expect(card).toHaveProperty("cost");
      expect(card).toHaveProperty("trait");
      expect(card).toHaveProperty("card_form");
      expect(card).toHaveProperty("unique");
      expect(card).toHaveProperty("unique_rule");
      expect(card).toHaveProperty("effects");
      expect(card.cost).toBe(4);
      expect(card.cost_status).toBe("provisional");
    }
  });

  it("adds the six candidates to /card-design without changing the v0.6.3 release package", () => {
    expect(catalogPage).toContain('src="v064-faction-card-candidates.js"');
    expect(catalogPage).toContain("Released v0.6.3 · v0.6.4 candidate review surface");
    expect(catalogOverlay).toContain("/docs/v0.6.4-faction-card-additions.json");
    expect(catalogOverlay).toContain("ready_for_game_data !== false");
    expect(catalogOverlay).toContain("card-review-render.html?fit=production");
    expect(cardRenderer).toContain("/releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json");
    expect(cardRenderer).toContain("/docs/v0.6.4-faction-card-additions.json");
    expect(cardRenderer).toContain("gameVersion = 'v0.6.4 candidate'");
  });
});
