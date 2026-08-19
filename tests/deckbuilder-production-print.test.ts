import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const playableRender = readFileSync("card-design/card-print-render.html", "utf8");
const territoryRender = readFileSync("card-design/territory-print-render.html", "utf8");
const printTransform = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const printOptionsCss = readFileSync("deckbuilder/print-options.css", "utf8");
const duplexTransform = readFileSync("deckbuilder/print-duplex.js", "utf8");

describe("Deckbuilder production printing", () => {
  it("prints playable cards through the same production renderer used by Card Reference", () => {
    expect(playableRender).toContain('/card-design/card-review-render.js');
    expect(playableRender).toContain('/card-design/card-design.css');
    expect(playableRender).toContain('/tts/renderer/renderer.css');
    expect(playableRender).toContain('width: 2.5in;');
    expect(playableRender).toContain('height: 3.5in;');

    expect(printTransform).toContain('/card-design/card-print-render.html?card=');
    expect(printTransform).toContain('&fit=production');
    expect(printTransform).toContain('print-card main-card production-render-card');
  });

  it("prints Territory faces at their native landscape production size inside portrait cut slots", () => {
    expect(territoryRender).toContain('/card-design/territory-review-render.js');
    expect(territoryRender).toContain('/tts/territory-renderer/territory-renderer.css');
    expect(territoryRender).toContain('width: 3.5in;');
    expect(territoryRender).toContain('height: 2.5in;');

    expect(printTransform).toContain('/card-design/territory-print-render.html?territory=');
    expect(printTransform).toContain('print-card territory production-render-territory');
    expect(printTransform).toContain('transform: rotate(90deg);');
    expect(printTransform).toContain('left: 2.5in;');
  });

  it("uses one shared back for playable cards and Territories, defaulting to black", () => {
    expect(duplexTransform).toContain('cell.querySelector(".main-card, .territory")');
    expect(printTransform).toContain('frontCell.querySelector(".production-render-card, .production-render-territory")');
    expect(printTransform).toContain('/tts/back-renderer/index.html?faction=');
    expect(printTransform).toContain('if (!useFactionColor) return "intelligence";');
    expect(printTransform).toContain('String(state.factionId || "intelligence")');
    expect(printTransform).toContain('mirrorIndexForLongEdge(frontIndex)');
    expect(printTransform).toContain('production deck-card back');
  });

  it("offers faction-colored backs only as an explicit print option", () => {
    expect(printTransform).toContain('checkbox.id = "factionColorCardBack"');
    expect(printTransform).toContain('label.textContent = "Faction color card back"');
    expect(printTransform).toContain('checkbox.disabled = !printBacks.checked');
    expect(printOptionsCss).toContain('.faction-back-option');
    expect(printOptionsCss).toContain('.faction-back-option.disabled');
  });

  it("waits for every production render before opening the browser print dialog", () => {
    expect(printTransform).toContain("body?.dataset?.renderReady");
    expect(printTransform).toContain("window.removeEventListener('load', previousPreparePrint)");
    expect(printTransform).toContain("await Promise.all(frames.map(waitForFrame))");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete cards");
  });
});
