import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");
const playableRender = readFileSync("card-design/card-review-render.html", "utf8");
const playableRenderJs = readFileSync("card-design/card-review-render.js", "utf8");
const printArtworkNormalizer = readFileSync("card-design/print-artwork-normalizer.js", "utf8");
const playableLegacyAlias = readFileSync("card-design/card-print-render.html", "utf8");
const componentRenderHtml = readFileSync("card-design/component-render.html", "utf8");
const componentLegacyAlias = readFileSync("card-design/component-print-render.html", "utf8");
const componentRenderJs = readFileSync("card-design/component-render.js", "utf8");
const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const territoryRender = readFileSync("card-design/territory-review-render.html", "utf8");
const territoryLegacyAlias = readFileSync("card-design/territory-print-render.html", "utf8");
const backRender = readFileSync("tts/back-renderer/index.html", "utf8");
const cardBackCss = readFileSync("card-design/card-back.css", "utf8");
const printTransform = readFileSync("deckbuilder/production-print.js", "utf8");
const supplementalPrintTransform = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const cardBackPolicy = readFileSync("deckbuilder/card-back-preview.js", "utf8");
const analyticsSync = readFileSync("scripts/sync-google-analytics.mjs", "utf8");
const currentGameLoader = readFileSync("game-data/current-game.mjs", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const componentContract = currentGame.componentContract;

describe("Deckbuilder production printing", () => {
  it("uses shared production renderers for playable cards, Territories, and faction components", () => {
    expect(playableRender).toContain('/card-design/card-review-render.js');
    expect(playableRender).toContain('id="renderTarget"');
    expect(territoryRender).toContain('/card-design/territory-review-render.js');
    expect(territoryRender).toContain('id="renderTarget"');
    expect(componentRenderHtml).toContain('/card-design/leader-card.css');
    expect(componentRenderHtml).toContain('/card-design/supplemental-card.js');
    expect(componentRenderHtml).toContain('/card-design/capital-ledger.css');
    expect(componentRenderHtml).toContain('/card-design/deed-card.css');
    for (const kind of ['leader', 'proposal', 'reference', 'rite', 'ritual', 'tracker', 'supplemental']) {
      expect(componentRenderJs).toContain(`"${kind}"`);
    }
    expect(printTransform).toContain('/card-design/card-review-render.html?card=');
    expect(printTransform).toContain('/card-design/territory-review-render.html?territory=');
    expect(printTransform).toContain('/card-design/component-render.html?kind=');
  });

  it("normalizes only playable-card artwork for direct printing while leaving the card face live", () => {
    expect(printTransform).toContain("&fit=production&printArtwork=normalized&rules=");
    expect(playableRenderJs).toContain("normalizePrintArtworkSource(sourceArtwork)");
    expect(printArtworkNormalizer).toContain("const DEFAULT_SHORT_EDGE = 960;");
    expect(printArtworkNormalizer).toContain("const DEFAULT_LONG_EDGE = 1800;");
    expect(printArtworkNormalizer).toContain("shortEdge / Math.min(sourceWidth, sourceHeight)");
    expect(printArtworkNormalizer).toContain("alpha: false");
    expect(printArtworkNormalizer).toContain("colorSpace: 'srgb'");
    expect(printArtworkNormalizer).toContain("'image/png'");
    expect(printArtworkNormalizer).toContain("__gauntletPrintArtworkCache");
    expect(printArtworkNormalizer).toContain("host.URL.createObjectURL(blob)");
    expect(printTransform).not.toContain("data:image/png");
    expect(printTransform).not.toContain("canvas.toBlob");
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
    expect(printTransform).toContain('wrapper.dataset.productionInlineBack = "true"');
    expect(printTransform).toContain('back.dataset.gauntletCardBack = ""');
    expect(printTransform).toContain('stylesheet.href = "/card-design/card-back.css"');
    expect(printTransform).toContain('script.src = "/card-design/card-back.js"');
    expect(printTransform).not.toContain('frame.className = "production-back-frame"');
    expect(cardBackPolicy).toContain('Automatic backs: black for playable cards and Territories');
    expect(cardBackPolicy).not.toContain("window.open");
    expect(cardBackPolicy).not.toContain("document.write");
  });

  it("reuses the Deckbuilder's already-loaded game authority inside production print iframes", () => {
    expect(printTransform).toContain("installProductionAuthorityBridge(documentNode)");
    expect(printTransform).toContain('window.__gauntletProductionAuthorityBridge = {');
    expect(printTransform).toContain('window.opener?.GAUNTLET_DECKBUILDER?.state?.currentGameData');
    expect(printTransform).toContain('rulesetMode: ${JSON.stringify(rulesetMode)}');
    expect(currentGameLoader).toContain("function bridgedProductionGame()");
    expect(currentGameLoader).toContain("window.top.__gauntletProductionAuthorityBridge");
    expect(currentGameLoader).toContain("requestedMode !== bridge.rulesetMode");
    expect(currentGameLoader).toContain("if (bridged) return bridged;");
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
    expect(printTransform).toContain("inlineBacks.some(back => !back.querySelector('.gauntlet-card-back__frame'))");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete cards");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete backs");
  });

  it("isolates standalone supplemental production renders and their reference-source loading", () => {
    expect(supplementalRenderer).toContain("function isolatedComponentRenderId()");
    expect(supplementalRenderer).toContain("/\\/component-render\\.html$/");
    expect(supplementalRenderer).toContain("component.id === isolatedId");
    expect(supplementalRenderer).toContain("component.contractId === isolatedId");
    expect(supplementalRenderer).toContain("component.referenceId === isolatedId");
    expect(supplementalRenderer).toContain("filteredGroups = groups");
    expect(supplementalRenderer).toContain("const requestedReferenceIds = referenceComponents.map");
    expect(supplementalRenderer).toContain("loadReferenceRecords(requestedReferenceIds)");
  });

  it("keeps first-page duplex fronts below the deck summary and aligns their reverse sheet", () => {
    expect(printTransform).not.toContain(".duplex-page .card-table,");
    expect(printTransform).toContain(".deck-card-back-page .card-table {");
    expect(printTransform).toContain(".deck-card-back-page.first-page-back .card-table.two-row {");
    expect(printTransform).toContain("top: 3.5in;");
    expect(printTransform).toContain("bottom: auto;");
  });

  it("previews the selected faction component back without exposing a global back-color choice", () => {
    expect(deckbuilderHtml).toContain('card-back-preview.js?v=20260831-2');
    expect(cardBackPolicy).toContain('preview.id = "cardBackPreview"');
    expect(cardBackPolicy).toContain('frame.id = "cardBackPreviewFrame"');
    expect(cardBackPolicy).toContain('productionPrint().backSource(faction)');
    expect(cardBackPolicy).toContain('factionSelect?.addEventListener("change"');
    expect(cardBackPolicy).not.toContain("factionColorCardBack");
  });

  it("keeps canonical embedded render surfaces analytics-free and legacy routes as aliases only", () => {
    for (const path of [
      '"card-design/card-review-render.html"',
      '"card-design/component-render.html"',
      '"card-design/territory-review-render.html"',
    ]) {
      expect(analyticsSync).toContain(path);
    }
    expect(playableLegacyAlias).toContain('/card-design/card-review-render.html');
    expect(componentLegacyAlias).toContain('/card-design/component-render.html');
    expect(territoryLegacyAlias).toContain('/card-design/territory-review-render.html');
    expect(playableLegacyAlias).not.toContain('/card-design/card-review-render.js');
    expect(componentLegacyAlias).not.toContain('/card-design/component-render.js');
    expect(territoryLegacyAlias).not.toContain('/card-design/territory-review-render.js');
  });
});
