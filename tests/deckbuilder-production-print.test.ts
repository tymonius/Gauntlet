import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");
const playableRender = readFileSync("card-design/card-print-render.html", "utf8");
const componentRenderHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentRenderJs = readFileSync("card-design/component-print-render.js", "utf8");
const territoryRender = readFileSync("card-design/territory-print-render.html", "utf8");
const backRender = readFileSync("tts/back-renderer/index.html", "utf8");
const cardBackCss = readFileSync("card-design/card-back.css", "utf8");
const printTransform = readFileSync("deckbuilder/production-print.js", "utf8");
const supplementalPrintTransform = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const cardBackPolicy = readFileSync("deckbuilder/card-back-preview.js", "utf8");
const analyticsSync = readFileSync("scripts/sync-google-analytics.mjs", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const componentContract = currentGame.componentContract;

describe("Deckbuilder production printing", () => {
  it("uses shared production renderers for playable cards, Territories, and faction components", () => {
    expect(playableRender).toContain('/card-design/card-review-render.js');
    expect(playableRender).toContain('width: 2.5in;');
    expect(playableRender).toContain('height: 3.5in;');
    expect(territoryRender).toContain('/card-design/territory-review-render.js');
    expect(territoryRender).toContain('width: 3.5in;');
    expect(territoryRender).toContain('height: 2.5in;');
    expect(componentRenderHtml).toContain('/card-design/leader-card.css');
    expect(componentRenderHtml).toContain('/card-design/supplemental-card.js');
    expect(componentRenderHtml).toContain('/card-design/capital-ledger.css');
    expect(componentRenderHtml).toContain('/card-design/deed-card.css');
    for (const kind of ['leader', 'proposal', 'reference', 'rite', 'ritual', 'tracker', 'supplemental']) {
      expect(componentRenderJs).toContain(`"${kind}"`);
    }
    expect(printTransform).toContain('/card-design/card-print-render.html?card=');
    expect(printTransform).toContain('/card-design/territory-print-render.html?territory=');
    expect(printTransform).toContain('/card-design/component-print-render.html?kind=');
  });

  it("uses current-game component metadata and preserves intrinsic reverse faces", () => {
    expect(printTransform).toContain('const currentGame = state.currentGameData;');
    expect(printTransform).toContain('currentGame.components');
    expect(printTransform).toContain('component.productionStatus');
    expect(printTransform).toContain('component.backPolicy');
    expect(printTransform).toContain('component.renderSource');
    expect(printTransform).toContain('ensureIntrinsicReversePages(documentNode, currentGame)');
    expect(printTransform).toContain('data-production-back-policy="twoSided"');
    expect(printTransform).toContain('data-production-back-policy="specialBack"');
    expect(printTransform).toContain('side: "reverse"');
  });

  it("keeps final export-pending Financier faces canonical without promoting contract export status", () => {
    const ledger = componentContract.components.find((component: any) => component.id === 'financiers-capital-ledger');
    const deed = componentContract.components.find((component: any) => component.id === 'financiers-deed');
    expect(ledger?.productionStatus).toBe('export-pending');
    expect(deed?.productionStatus).toBe('export-pending');
    expect(ledger?.designStatus).toBe('final');
    expect(deed?.designStatus).toBe('final');
    expect(ledger?.backPolicy).toBe('twoSided');
    expect(deed?.backPolicy).toBe('standardBack');
    expect(printTransform).toContain('if (component.family === "ledger") return { kind: "supplemental", id: component.id };');
    expect(printTransform).toContain('if (component.family === "deed-card") return { kind: "supplemental", id: component.id, orientation: "landscape" };');
    expect(printTransform).toContain('["proposal-treaty-card", "ledger", "deed-card"].includes(component.family)');
    expect(supplementalPrintTransform).not.toContain('replaceLegacyDeeds');
    expect(supplementalPrintTransform).not.toContain('removeLegacyDiplomatReverseReference');
  });

  it("prints standard backs as black and single-sided faction components in faction color automatically", () => {
    expect(printTransform).toContain('pageNeedsStandardBack(frontPage)');
    expect(printTransform).toContain('replaceProductionBacks(documentNode)');
    expect(printTransform).toContain('standardBackFaction(frontCell)');
    expect(printTransform).toContain('frontCell.querySelector(".production-render-card, .production-render-territory")');
    expect(printTransform).toContain('return "intelligence";');
    expect(printTransform).toContain('String(state.factionId || "intelligence")');
    expect(printTransform).toContain('production-standard-back');
    expect(printTransform).toContain('/tts/back-renderer/index.html?faction=');
    expect(cardBackPolicy).toContain('Automatic backs: black for playable cards and Territories');
    expect(cardBackPolicy).not.toContain("window.open");
    expect(cardBackPolicy).not.toContain("document.write");
  });

  it("keeps duplex orientation and production-render readiness safeguards", () => {
    expect(printTransform).toContain('mirrorIndexForLongEdge(frontIndex)');
    expect(printTransform).toContain('transform: rotate(90deg);');
    expect(printTransform).toContain('production-component-landscape-rotate');
    expect(printTransform).toContain('&orientation=landscape');
    expect(supplementalPrintTransform).toContain('productionPrint().componentSource(PRODUCTION_LEDGER_COMPONENT_ID, side)');
    expect(componentRenderJs).toContain('card.dataset.parchmentLoaded === "true" && dimensionsReady(card)');
    expect(cardBackCss).toContain('transform: translate(-50%, -50%) rotate(90deg);');
    expect(backRender).toContain("params.get('rotation') === '180'");
    expect(printTransform).toContain("await Promise.all(frames.map(waitForFrame))");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete cards");
  });

  it("previews the selected faction component back without exposing a global back-color choice", () => {
    expect(deckbuilderHtml).toContain('card-back-preview.js?v=20260831-1');
    expect(cardBackPolicy).toContain('preview.id = "cardBackPreview"');
    expect(cardBackPolicy).toContain('frame.id = "cardBackPreviewFrame"');
    expect(cardBackPolicy).toContain('productionPrint().backSource(faction)');
    expect(cardBackPolicy).toContain('factionSelect?.addEventListener("change"');
    expect(cardBackPolicy).not.toContain("factionColorCardBack");
  });

  it("keeps print-only render surfaces analytics-free", () => {
    expect(analyticsSync).toContain('"card-design/card-print-render.html"');
    expect(analyticsSync).toContain('"card-design/component-print-render.html"');
    expect(analyticsSync).toContain('"card-design/territory-print-render.html"');
  });
});
