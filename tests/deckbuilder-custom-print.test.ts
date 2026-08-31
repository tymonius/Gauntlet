import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const customPrint = readFileSync("deckbuilder/custom-print.mjs", "utf8");
const customPrintCss = readFileSync("deckbuilder/custom-print.css", "utf8");
const printBootstrap = readFileSync("deckbuilder/custom-print-loader.js", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;

const cardLikeFamilies = new Set(
  [...(contract.sharedComponents || []), ...(contract.components || [])]
    .filter((component: any) => component.cardLike)
    .map((component: any) => component.family)
    .filter(Boolean),
);

describe("Deckbuilder custom printing", () => {
  it("loads as an Advanced tool without changing the Deckbuilder HTML shell", () => {
    expect(printBootstrap).toContain('import("./custom-print.mjs")');
    expect(customPrint).toContain('document.querySelector(".advanced-tools")');
    expect(customPrint).toContain("Enable custom printing");
    expect(customPrint).toContain("Custom print sheets");
    expect(customPrint).toContain("Card selector");
    expect(customPrint).toContain("Deck construction and validation rules do not apply");
    expect(customPrintCss).toContain(".custom-print-workspace");
  });

  it("builds the selector from every current physical-card authority", () => {
    expect(customPrint).toContain("for (const card of game.cards || [])");
    expect(customPrint).toContain("for (const territory of game.territories || [])");
    expect(customPrint).toContain("for (const leader of game.leaders || [])");
    expect(customPrint).toContain("game.sharedComponents || []");
    expect(customPrint).toContain("game.components || []");
    expect(customPrint).not.toContain("const ritual = game.mystics?.ritual");
    expect(customPrint).not.toContain("validateDeck(");
    expect(customPrint).not.toContain("deckEntries(");
  });

  it("adds every currently visible catalog card without disturbing existing quantities", () => {
    expect(customPrint).toContain('id="customPrintAddAll"');
    expect(customPrint).toContain('title="Add all currently visible cards"');
    expect(customPrint).toContain("const visible = visibleCatalogEntries()");
    expect(customPrint).toContain("if (queue.has(entry.key)) continue");
    expect(customPrint).toContain("queue.set(entry.key, 1)");
    expect(customPrint).toContain("visible.every(entry => queue.has(entry.key))");
  });

  it("covers every current card-like supplemental family", () => {
    expect(cardLikeFamilies).toEqual(new Set([
      "reference-card",
      "tracker",
      "proposal-treaty-card",
      "rite-card",
      "ledger",
      "deed-card",
      "ritual-card",
    ]));

    for (const family of cardLikeFamilies) {
      expect(customPrint).toContain(`component.family === "${family}"`);
    }
    expect(customPrint).toContain('component.id === "financiers-capital-ledger"');
    expect(customPrint).toContain('component.id === "financiers-deed"');
  });

  it("routes every physical card family through canonical production renderers", () => {
    expect(customPrint).toContain("/card-design/card-print-render.html?card=");
    expect(customPrint).toContain("/card-design/territory-print-render.html?territory=");
    expect(customPrint).toContain("/card-design/component-print-render.html?kind=");
    expect(customPrint).toContain("/tts/back-renderer/index.html?faction=");
    expect(customPrint).toContain('kind: "leader"');
    expect(customPrint).toContain('kind: "reference"');
    expect(customPrint).toContain('kind: "proposal"');
    expect(customPrint).toContain('kind: "rite"');
    expect(customPrint).toContain('kind: "ritual"');
    expect(customPrint).toContain('kind: "supplemental"');
  });

  it("supports mixed portrait and landscape cards on the same 3x3 sheets", () => {
    expect(customPrint).toContain('"Territory", "neutral", "Neutral", "landscape", "standardBack"');
    expect(customPrint).toContain('component.family === "deed-card"');
    expect(customPrint).toContain('entry.orientation === "landscape"');
    expect(customPrint).toContain("custom-landscape-rotate");
    expect(customPrint).toContain("CARDS_PER_SHEET = 9");
    expect(customPrint).toContain("COLUMNS = 3");
  });

  it("pairs intrinsic reverses automatically and keeps standard backs optional", () => {
    expect(customPrint).toContain('entry.backPolicy === "twoSided"');
    expect(customPrint).toContain('entry.backPolicy === "specialBack"');
    expect(customPrint).toContain('entry.backPolicy === "standardBack"');
    expect(customPrint).not.toContain("ledgerDuplex");
    const ledger = contract.components.find((component: any) => component.id === "financiers-capital-ledger");
    expect(ledger?.backPolicy).toBe("twoSided");
    expect(customPrint).toContain("mirrorIndexForLongEdge(frontIndex)");
    expect(customPrint).toContain("flip on the long edge");
    expect(customPrint).toContain("Use canonical card backs");
  });

  it("keeps playable cards and Territories black while using faction backs for standard-backed components", () => {
    expect(customPrint).toContain('entry.render.surface === "card" || entry.render.surface === "territory"');
    expect(customPrint).toContain('return "intelligence";');
    expect(customPrint).toContain('BACK_VARIANTS.has(entry.faction) ? entry.faction : "intelligence"');
  });

  it("waits for every production iframe and fails closed instead of printing incomplete cards", () => {
    expect(customPrint).toContain("data-custom-render-frame");
    expect(customPrint).toContain("dataset.renderReady==='error'");
    expect(customPrint).toContain("await waitForFrames()");
    expect(customPrint).toContain("button.disabled=false");
    expect(customPrint).toContain("Printing stopped:");
  });
});
