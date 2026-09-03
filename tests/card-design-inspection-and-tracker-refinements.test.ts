import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalogHtml = readFileSync('card-design/index.html', 'utf8');
const cardReview = readFileSync('card-design/card-review.js', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const inspectionHistory = readFileSync('card-design/card-inspection-history.js', 'utf8');
const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');
const supplementalRefinements = readFileSync('card-design/supplemental-refinements.css', 'utf8');
const supplementalCss = readFileSync('card-design/supplemental-card.css', 'utf8');
const deckbuilderMobilePreview = readFileSync('deckbuilder/mobile-card-preview.js', 'utf8');
const sharedInspection = readFileSync('card-reference/card-inspection.js', 'utf8');
const ttsSupplementalHtml = readFileSync('tts/supplemental-renderer/index.html', 'utf8');

describe('Card Design inspection navigation', () => {
  it('uses a history entry so browser Back closes an open card inspection', () => {
    expect(catalogHtml).toContain('card-inspection-history.js');
    expect(inspectionHistory).toContain("const INSPECTION_HISTORY_KEY = 'gauntletCardDesignInspection'");
    expect(inspectionHistory).toContain('history.pushState(');
    expect(inspectionHistory).toContain("window.addEventListener('popstate'");
    expect(inspectionHistory).toContain('history.back()');
    expect(inspectionHistory).toContain("dialog.card-inspection-dialog[open]");
    expect(inspectionHistory).toContain(".card-inspection-close");
  });

  it('keeps every reference face inspectable when async hydration finishes', () => {
    expect(supplemental).toContain('function hydrateReferenceElement(loadingCard, rendered)');
    expect(supplemental).toContain("loadingCard.dataset.inspectionReady === 'true'");
    expect(supplemental).toContain('loadingCard.replaceChildren(...Array.from(rendered.childNodes))');
    expect(supplemental).toContain("if (inspectionReady) loadingCard.classList.add('card-inspectable')");
    expect(supplemental).toContain("for (const sideName of ['front', 'reverse'])");
    expect(supplemental).not.toContain('loadingCard.replaceWith(rendered)');
  });

  it('keeps unified face previews inspectable without recursive modal inspection', () => {
    expect(faceRuntime).toContain("element.matches('.gauntlet-card, .territory-card')");
    expect(faceRuntime).toContain("window.frameElement?.dataset.faceInspectionHost === 'true'");
    expect(faceRuntime).toContain("type: 'gauntlet-face-inspect'");
    expect(faceRuntime).toContain("type: 'gauntlet-face-art-inspect'");

    expect(cardReview).toContain('CARD_WIDTH = PRODUCTION_SURFACES.portrait.widthCssPx');
    expect(cardReview).toContain("territoryInspectionFrame.dataset.faceInspectionHost = 'true'");
    expect(cardReview).toContain("event.data?.orientation === 'landscape'");

    const artworkHandler = cardReview.indexOf("event.data?.type === 'gauntlet-face-art-inspect'");
    const inspectionFrameGuard = cardReview.indexOf('if (sourceFrame === territoryInspectionFrame) return;');
    expect(artworkHandler).toBeGreaterThan(-1);
    expect(inspectionFrameGuard).toBeGreaterThan(artworkHandler);
  });
});

describe('Deckbuilder inspection navigation', () => {
  it('keeps the shared card inspector and makes the mobile preview Back-aware too', () => {
    expect(deckbuilderMobilePreview).toContain('../card-reference/card-inspection.js');
    expect(sharedInspection).toContain("const INSPECTION_HISTORY_KEY = 'gauntletCardInspection'");
    expect(sharedInspection).toContain('history.pushState(');
    expect(sharedInspection).toContain('history.back()');

    expect(deckbuilderMobilePreview).toContain('PREVIEW_HISTORY_KEY');
    expect(deckbuilderMobilePreview).toContain('pushPreviewHistory');
    expect(deckbuilderMobilePreview).toContain('window.addEventListener("popstate", handlePopState)');
    expect(deckbuilderMobilePreview).toContain('history.back()');
  });
});

describe('supplemental visual refinements', () => {
  it('aligns reference-card watermark geometry with the sliding trackers everywhere they render', () => {
    expect(catalogHtml).toContain('supplemental-refinements.css');
    expect(ttsSupplementalHtml).toContain('/card-design/supplemental-refinements.css');
    expect(supplementalCss).toContain('right: 0.20in;');
    expect(supplementalCss).toContain('bottom: 0.32in;');
    expect(supplementalCss).toContain('width: 1.72in;');
    expect(supplementalCss).toContain('height: 1.72in;');
    expect(supplementalRefinements).toContain('.reference-card .reference-watermark');
    expect(supplementalRefinements).toContain('right: 0.20in;');
    expect(supplementalRefinements).toContain('bottom: 0.32in;');
    expect(supplementalRefinements).toContain('width: 1.72in;');
    expect(supplementalRefinements).toContain('height: 1.72in;');
  });

  it('marks normal Command cap 2 with the major tracker line', () => {
    expect(supplementalRefinements).toContain('[data-contract-component-id="military-command-tracker"]');
    expect(supplementalRefinements).toContain('.tracker-mark:nth-child(2) .tracker-registration-line');
    expect(supplementalRefinements).toContain('border-top-width: 1.15px;');
    expect(supplementalRefinements).toContain('border-top-color: var(--tracker-line);');
    expect(supplementalRefinements).toContain('.tracker-mark:not(:nth-child(2)):not(:last-child) .tracker-registration-line');
  });
});