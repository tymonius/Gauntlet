import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const validator = readFileSync('scripts/validate-unified-face-parity.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/validate-unified-face-parity.yml', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');
const factionComponent = readFileSync('card-design/faction-component.css', 'utf8');
const leaderStyles = readFileSync('card-design/leader-card.css', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const currentGame = readFileSync('game-data/current-game.json', 'utf8');
const trackerTemplate = readFileSync('card-design/face-templates/tracker.mjs', 'utf8');
const supplementalCard = readFileSync('card-design/supplemental-card.js', 'utf8');
const supplementalStyles = readFileSync('card-design/supplemental-card.css', 'utf8');

describe('Stage 4 unified face parity gate', () => {
  it('audits the complete canonical catalog rather than a hand-picked family list', () => {
    expect(validator).toContain('resolveAllFaceSpecs(game)');
    expect(validator).toContain('if (specs.length !== 242)');
    expect(validator).toContain('specs.filter(spec => spec.readiness.productionReady)');
    expect(validator).toContain('groupBlockers(specs)');
  });

  it('compares each ready clean face to the existing production renderer in one browser context', () => {
    expect(validator).toContain("face-render.html?id=");
    expect(validator).toContain('legacyRoute(spec)');
    expect(validator).toContain("base.set('kind', 'supplemental')");
    expect(validator).toContain("base.set('kind', 'tracker')");
    expect(validator).toContain("base.set('kind', 'reference')");
    expect(validator).toContain("spec.content.component.renderSource?.componentId");
    expect(validator).toContain("readiness: 'card-back'");
    expect(validator).toContain('waitForLegacyRender(legacyPage, legacy)');
    expect(validator).toContain('pixelDiff(cleanBuffer, legacyBuffer)');
    expect(validator).toContain('geometryOkay');
    expect(validator).toContain('textParity');
    expect(validator).toContain('imageParity');
    expect(validator).toContain('cropParity');
    expect(validator).toContain('MAX_CHANGED_PIXEL_RATIO');
  });

  it('keeps blocked authority visible instead of skipping it silently', () => {
    expect(validator).toContain('blockedFaces: blocked.length');
    expect(validator).toContain('blockerCounts');
    expect(validator).toContain('blockers: blockerGroups');
    expect(validator).toContain('comparisons.push({ ...failure, passes: false })');
  });

  it('keeps faction component visual authority template-neutral', () => {
    expect(factionComponent).toContain('.faction-component-card[data-faction="financiers"]');
    expect(factionComponent).toContain('--component-parchment-tint');
    expect(factionComponent).toContain('--faction-symbol');
    expect(leaderStyles).toContain('@import url("./faction-component.css")');
    expect(leaderStyles).not.toContain('--component-parchment-tint');
    expect(faceSpec).toContain("'/card-design/faction-component.css'");
  });

  it('fits legacy supplemental faces after explicitly loading the shared production fonts', () => {
    expect(supplementalCard).toContain("import { loadProductionFonts } from './face-preparation.mjs'");
    expect(supplementalCard).toContain('await loadProductionFonts();');
    expect(supplementalCard).not.toContain('waitForCanonicalProductionFonts');
    expect(supplementalCard.indexOf('await loadProductionFonts();')).toBeLessThan(
      supplementalCard.indexOf('await layoutTrackerCards();')
    );
    expect(supplementalCard.indexOf('await loadProductionFonts();')).toBeLessThan(
      supplementalCard.indexOf('await hydrateReferenceCards();')
    );
  });

  it('fits legacy references only after mounting them at final production geometry', () => {
    expect(componentRenderer).toContain('target.replaceChildren(card);');
    expect(componentRenderer).toContain('const { fitReferenceCard } = await import("/card-design/reference-card.js")');
    expect(componentRenderer.indexOf('target.replaceChildren(card);')).toBeLessThan(
      componentRenderer.indexOf('const { fitReferenceCard } = await import("/card-design/reference-card.js")')
    );
  });

  it('keeps Operation Progress presentation in canonical data instead of component-specific CSS', () => {
    expect(currentGame).toContain('"titleLetterSpacingEm": 0');
    expect(trackerTemplate).toContain('presentation.titleLetterSpacingEm');
    expect(supplementalCard).toContain('titleLetterSpacingEm');
    expect(supplementalStyles).not.toContain('[data-component-id="operation-progress-tracker"]');
  });

  it('runs as a dedicated CI check and preserves production isolation', () => {
    expect(workflow).toContain('node scripts/validate-unified-face-parity.mjs');
    expect(workflow).toContain('unified-face-parity');
    expect(productionPrint).not.toContain('/card-design/face-render.html');
    expect(cardReference).not.toContain('/card-design/face-render.html');
    expect(componentRenderer).not.toContain('/card-design/face-render.html');
  });
});
