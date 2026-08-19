import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");
const playableRender = readFileSync("card-design/card-print-render.html", "utf8");
const componentRenderHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentRenderJs = readFileSync("card-design/component-print-render.js", "utf8");
const territoryRender = readFileSync("card-design/territory-print-render.html", "utf8");
const backRender = readFileSync("tts/back-renderer/index.html", "utf8");
const printTransform = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const cardBackPreview = readFileSync("deckbuilder/card-back-preview.js", "utf8");
const printOptionsCss = readFileSync("deckbuilder/print-options.css", "utf8");
const duplexTransform = readFileSync("deckbuilder/print-duplex.js", "utf8");
const analyticsSync = readFileSync("scripts/sync-google-analytics.mjs", "utf8");
const componentContract = JSON.parse(readFileSync("config/tts-component-contract.json", "utf8"));

describe("Deckbuilder production printing", () => {
  it("prints playable cards through the same production renderer used by Card Reference", () => {
    expect(playableRender).toContain('/card-design/card-review-render.js');
    expect(playableRender).toContain('/card-design/card-design.css');
    expect(playableRender).toContain('/tts/renderer/renderer.css');
    expect(playableRender).toContain('width: 2.5in;');
    expect(playableRender).toContain('height: 3.5in;');

    expect(printTransform).toContain('/card-design/card-print-render.html?card=');
    expect(printTransform).toContain('&fit=production');
    expect(printTransform).toContain('print-card main-card production-render-card production-standard-back');
  });

  it("prints Territory faces at their native landscape production size inside portrait cut slots", () => {
    expect(territoryRender).toContain('/card-design/territory-review-render.js');
    expect(territoryRender).toContain('/tts/territory-renderer/territory-renderer.css');
    expect(territoryRender).toContain('width: 3.5in;');
    expect(territoryRender).toContain('height: 2.5in;');

    expect(printTransform).toContain('/card-design/territory-print-render.html?territory=');
    expect(printTransform).toContain('print-card territory production-render-territory production-standard-back');
    expect(printTransform).toContain('transform: rotate(90deg);');
    expect(printTransform).toContain('left: 2.5in;');
  });

  it("loads production Leaders, trackers, references, Proposals, and Rites instead of legacy print approximations", () => {
    expect(componentRenderHtml).toContain('/card-design/leader-card.css');
    expect(componentRenderHtml).toContain('/card-design/proposal-card.css');
    expect(componentRenderHtml).toContain('/card-design/rite-card.css');
    expect(componentRenderHtml).toContain('/card-design/reference-card.css');
    expect(componentRenderHtml).toContain('/card-design/supplemental-card.js');
    expect(componentRenderHtml).toContain('id="leaderReviewSections"');
    expect(componentRenderHtml).toContain('id="proposalReviewSections"');
    expect(componentRenderHtml).toContain('id="riteReviewSections"');
    expect(componentRenderHtml).toContain('id="supplementalReviewSections"');

    for (const kind of ['leader', 'proposal', 'reference', 'rite', 'tracker', 'supplemental']) {
      expect(componentRenderJs).toContain(`"${kind}"`);
    }
    expect(printTransform).toContain('kind: "leader"');
    expect(printTransform).toContain('kind: "proposal"');
    expect(printTransform).toContain('kind: "rite"');
    expect(printTransform).toContain('/card-design/component-print-render.html?kind=');
  });

  it("adds a contract-driven upgrade path for any supplemental face left on fallback", () => {
    expect(cardBackPreview).toContain('const COMPONENT_CONTRACT_URL = "/config/tts-component-contract.json";');
    expect(cardBackPreview).toContain('componentContractPromise');
    expect(cardBackPreview).toContain('contractComponentForLegacy');
    expect(cardBackPreview).toContain('component.renderSource?.printEndpoint');
    expect(cardBackPreview).toContain('component.renderSource?.componentId');
    expect(cardBackPreview).toContain('component.productionStatus');
    expect(cardBackPreview).toContain('upgradeContractProductionFallbacks');
    expect(cardBackPreview).toContain('kind=supplemental&id=');
    expect(componentRenderJs).toContain('.supplemental-review-item');
    expect(componentRenderJs).toContain('supplemental-placeholder-card');
  });

  it("keeps pending Financier components on fallback until their contract entries expose a finalized production renderer", () => {
    const ledger = componentContract.components.find((component: any) => component.id === 'financiers-capital-ledger');
    const deed = componentContract.components.find((component: any) => component.id === 'financiers-deed');
    expect(ledger?.productionStatus).not.toBe('ready');
    expect(deed?.productionStatus).not.toBe('ready');
    expect(ledger?.renderSource).toBeUndefined();
    expect(deed?.renderSource).toBeUndefined();

    expect(cardBackPreview).toContain('status === "ready" && componentId');
    expect(cardBackPreview).toContain('card-design\\/supplemental-card\\.js');
    expect(cardBackPreview).toContain('component.renderSource?.printUrl');
  });

  it("can give newly contract-upgraded standard-back and two-sided components the correct reverse treatment", () => {
    expect(cardBackPreview).toContain('component.backPolicy === "standardBack"');
    expect(cardBackPreview).toContain('ensureStandardBack(documentNode, replacement)');
    expect(cardBackPreview).toContain('ensureIntrinsicReverse(documentNode, replacement, component, renderUrl)');
    expect(cardBackPreview).toContain('mirrorIndexForLongEdge(frontIndex)');
  });

  it("prints every current production reference as a real two-sided card even when ordinary card backs are not requested", () => {
    expect(printTransform).toContain('ensureReferenceReversePages(documentNode);');
    expect(printTransform).toContain('data-production-component-side="front"');
    expect(printTransform).toContain('side: "reverse"');
    expect(printTransform).toContain('ensureBackPageForFront');
    expect(printTransform).toContain('mirrorIndexForLongEdge(frontIndex)');
  });

  it("leaves genuinely pending Financier faces on their existing fallback while still giving standard-back components the selected production back", () => {
    expect(printTransform).not.toContain('kind: "capital"');
    expect(printTransform).not.toContain('kind: "deed"');
    expect(printTransform).toContain('.capital-tracker-card, .deed-card');
  });

  it("uses one shared back for standard-back cards, defaulting to black", () => {
    expect(duplexTransform).toContain('cell.querySelector(".main-card, .territory")');
    expect(printTransform).toContain('production-standard-back');
    expect(printTransform).toContain('/tts/back-renderer/index.html?faction=');
    expect(printTransform).toContain('if (!useFactionColor) return "intelligence";');
    expect(printTransform).toContain('String(state.factionId || "intelligence")');
    expect(printTransform).toContain('mirrorIndexForLongEdge(frontIndex)');
    expect(printTransform).toContain('production deck-card back');
  });

  it("rotates printed production backs 180 degrees inside the back renderer", () => {
    expect(printTransform).toContain('&rotation=180');
    expect(printTransform).toContain('transform: none !important;');
    expect(backRender).toContain("params.get('rotation') === '180'");
    expect(backRender).toContain('html[data-card-back-rotation="180"] #renderTarget{transform:rotate(180deg)}');
  });

  it("offers faction-colored backs only as an explicit print option", () => {
    expect(printTransform).toContain('checkbox.id = "factionColorCardBack"');
    expect(printTransform).toContain('label.textContent = "Faction color card back"');
    expect(printTransform).toContain('checkbox.disabled = !printBacks.checked');
    expect(printOptionsCss).toContain('.faction-back-option');
    expect(printOptionsCss).toContain('.faction-back-option.disabled');
  });

  it("shows the selected production back beside the print-back options and updates it live", () => {
    expect(deckbuilderHtml).toContain('card-back-preview.js?v=20260819-1');
    expect(deckbuilderHtml).toContain('print-options.css?v=20260819-1');
    expect(cardBackPreview).toContain('preview.id = "cardBackPreview"');
    expect(cardBackPreview).toContain('frame.id = "cardBackPreviewFrame"');
    expect(cardBackPreview).toContain('/tts/back-renderer/index.html?faction=');
    expect(cardBackPreview).toContain('if (!factionColor.checked) return "intelligence";');
    expect(cardBackPreview).toContain('factionColor.addEventListener("change", updatePreview)');
    expect(cardBackPreview).toContain('factionSelect?.addEventListener("change"');
    expect(cardBackPreview).toContain('"Black back (default)"');
    expect(printOptionsCss).toContain('.card-back-controls');
    expect(printOptionsCss).toContain('.card-back-preview-frame');
  });

  it("keeps print-only render surfaces analytics-free through the supported exclusion list", () => {
    expect(analyticsSync).toContain('"card-design/card-print-render.html"');
    expect(analyticsSync).toContain('"card-design/component-print-render.html"');
    expect(analyticsSync).toContain('"card-design/territory-print-render.html"');
  });

  it("waits for every production render before opening the browser print dialog", () => {
    expect(printTransform).toContain("body?.dataset?.renderReady");
    expect(printTransform).toContain("window.removeEventListener('load', previousPreparePrint)");
    expect(printTransform).toContain("await Promise.all(frames.map(waitForFrame))");
    expect(printTransform).toContain("Printing was stopped so the Deck is not printed with incomplete cards");
  });
});
