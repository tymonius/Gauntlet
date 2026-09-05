import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");
const playableLegacyAlias = readFileSync("card-design/card-print-render.html", "utf8");
const componentLegacyAlias = readFileSync("card-design/component-print-render.html", "utf8");
const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const territoryLegacyAlias = readFileSync("card-design/territory-print-render.html", "utf8");
const cardBackCss = readFileSync("card-design/card-back.css", "utf8");
const cardBackJs = readFileSync("card-design/card-back.js", "utf8");
const cardBackPattern = readFileSync("card-design/card-back-pattern.svg", "utf8");
const printTransform = readFileSync("deckbuilder/production-print.js", "utf8");
const supplementalPrintTransform = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const cardBackPolicy = readFileSync("deckbuilder/card-back-preview.js", "utf8");
const analyticsSync = readFileSync("scripts/sync-google-analytics.mjs", "utf8");
const currentGameLoader = readFileSync("game-data/current-game.mjs", "utf8");
const rulesetLoader = readFileSync("game-data/ruleset.mjs", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const componentContract = currentGame.componentContract;

describe("Deckbuilder production printing", () => {
  it("uses the one canonical face renderer for every printed physical face", () => {
    expect(printTransform).toContain('/card-design/face-render.html?id=');
    expect(printTransform).toContain('faceRenderSource(`card:${cardId}`)');
    expect(printTransform).toContain('faceRenderSource(`territory:${territoryId}`)');
    expect(printTransform).toContain('return `component:${componentId}:${options.side || "front"}`');
    expect(printTransform).toContain('faceRenderSource(`back:${safeFaction}`)');
    expect(printTransform).not.toContain('/card-design/card-review-render.html?card=');
    expect(printTransform).not.toContain('/card-design/territory-review-render.html?territory=');
    expect(printTransform).not.toContain('/card-design/component-render.html?kind=');
    expect(printTransform).not.toContain('/card-design/card-back-render.html?faction=');
  });

  it("prints the canonical face directly without a print-only artwork normalization renderer", () => {
    expect(printTransform).not.toContain("printArtwork=normalized");
    expect(printTransform).not.toContain("fit=production");
    expect(printTransform).not.toContain("data:image");
    expect(printTransform).toContain('/card-design/face-render.html?id=');
  });

  it("uses current-game component metadata and preserves intrinsic reverse faces", () => {
    expect(printTransform).toContain('const currentGame = resolvedCurrentGame();');
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
    expect(printTransform).toContain('String(deckState().factionId || "intelligence")');
    expect(printTransform).toContain('production-standard-back');
    expect(printTransform).toContain('faceRenderSource(`back:${safeFaction}`)');
    expect(printTransform).toContain('frame.className = "production-back-frame"');
    expect(printTransform).toContain('frame.dataset.productionRenderKind = "back"');
    expect(printTransform).toContain('frame.src = productionBackSource(faction)');
    expect(printTransform).not.toContain('data-production-inline-back');
    expect(printTransform).not.toContain('installInlineCardBackRenderer');
    expect(cardBackPolicy).toContain('Automatic backs: black for playable cards and Territories');
    expect(cardBackPolicy).not.toContain("window.open");
    expect(cardBackPolicy).not.toContain("document.write");
  });

  it("keeps released print content on the one current Card Design visual authority", () => {
    expect(rulesetLoader).toContain("CURRENT_VISUAL_AUTHORITY_URL");
    expect(rulesetLoader).toContain("loadJson(CURRENT_VISUAL_AUTHORITY_URL)");
    expect(rulesetLoader).toContain("visualAuthority?.artDirection");
    expect(rulesetLoader).toContain("artDirectionFor(id)");
    expect(rulesetLoader).not.toContain("const artDirection = {};");
    expect(currentGameLoader).toContain("visualAuthorityUrl: CURRENT_GAME_AUTHORITY_URL");
  });

  it("reuses the Deckbuilder's already-loaded game authority inside production print iframes", () => {
    expect(printTransform).toContain("installProductionAuthorityBridge(documentNode)");
    expect(printTransform).toContain('window.__gauntletFaceAuthorityBridge = {');
    expect(printTransform).toContain('window.opener?.GAUNTLET_DECKBUILDER?.currentGame?.()');
    expect(printTransform).toContain('rulesetMode: ${JSON.stringify(rulesetMode)}');
    expect(currentGameLoader).toContain("function bridgedRenderGame()");
    expect(currentGameLoader).toContain("window.top.__gauntletFaceAuthorityBridge");
    expect(currentGameLoader).toContain("requestedMode !== bridge.rulesetMode");
    expect(currentGameLoader).toContain("if (bridged) return bridged;");
  });

  it("flattens the dense faction-symbol pattern into one vector paint surface", () => {
    expect(cardBackJs).toContain('/card-design/card-back-pattern.svg');
    expect(cardBackJs).not.toContain('PATTERN_ROWS');
    expect(cardBackJs).not.toContain('gauntlet-card-back__symbol');
    expect(cardBackCss).not.toContain('-webkit-mask: var(--card-back-symbol)');
    expect(cardBackPattern).toContain('<use href="#military"');
    expect(cardBackPattern).toContain('<use href="#inquisition"');
  });

  it("isolates card backs from mixed-surface print compositing at page boundaries", () => {
    expect(cardBackCss).toContain("contain: paint;");
    expect(cardBackCss).toContain("clip-path: inset(0 round 0.125in);");
    expect(cardBackCss).toContain("clip-path: inset(0 round 0.055in);");
    expect(cardBackCss).toContain("mix-blend-mode: normal;");
    expect(printTransform).toContain("break-inside: avoid-page !important;");
    expect(printTransform).toContain("page-break-inside: avoid !important;");
    expect(printTransform).toContain("clip-path: inset(0);");
    expect(printTransform).toContain("isolation: isolate;");
  });

  it("keeps duplex orientation and production-render readiness safeguards", () => {
    expect(printTransform).toContain('mirrorIndexForLongEdge(frontIndex)');
    expect(printTransform).toContain('transform: rotate(90deg);');
    expect(printTransform).toContain('production-component-landscape-rotate');
    expect(printTransform).not.toContain('&orientation=landscape');
    expect(supplementalPrintTransform).toContain('productionPrint().componentSource(PRODUCTION_LEDGER_COMPONENT_ID, side)');
    expect(printTransform).toContain('productionFaceId(options)');
    expect(cardBackCss).toContain('transform: translate(-50%, -50%) rotate(90deg);');
    expect(printTransform).not.toContain('rotation=180');
    expect(printTransform).toContain("await Promise.all(frames.map(waitForFrame))");
    expect(printTransform).toContain("frame.dataset.productionRenderKind === 'back'");
    expect(printTransform).toContain("doc.querySelector('.gauntlet-card-back__frame')");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete cards");
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
    expect(playableLegacyAlias).toContain('/card-design/legacy-face-redirect.mjs');
    expect(componentLegacyAlias).toContain('/card-design/legacy-face-redirect.mjs');
    expect(territoryLegacyAlias).toContain('/card-design/legacy-face-redirect.mjs');
    expect(playableLegacyAlias).not.toMatch(/card-review-render\.js/);
    expect(componentLegacyAlias).not.toMatch(/component-render\.js/);
    expect(territoryLegacyAlias).not.toMatch(/territory-review-render\.js/);
  });
});
