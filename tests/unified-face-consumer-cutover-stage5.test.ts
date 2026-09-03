import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const faceRender = readFileSync('card-design/face-render.mjs', 'utf8');
const renderContext = readFileSync('card-design/render-context.mjs', 'utf8');
const playableTemplate = readFileSync('card-design/face-templates/playable.mjs', 'utf8');
const cardReview = readFileSync('card-design/card-review.js', 'utf8');
const proposals = readFileSync('card-design/proposal-card.js', 'utf8');
const rites = readFileSync('card-design/rite-card.js', 'utf8');
const supplementals = readFileSync('card-design/supplemental-card.js', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const deckRuntime = readFileSync('deckbuilder/current-runtime.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const deckPreview = readFileSync('deckbuilder/rendered-card-preview.js', 'utf8');
const territoryPreview = readFileSync('deckbuilder/territories.js', 'utf8');
const ttsCards = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const ttsLeaders = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const ttsTerritories = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const ttsSupplementals = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const ttsFinalized = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
const ttsTrackers = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const architectureValidator = readFileSync('scripts/validate-artwork-render-pipeline.mjs', 'utf8');

const productionConsumers = [
  cardReview,
  proposals,
  rites,
  supplementals,
  cardReference,
  productionPrint,
  deckPreview,
  territoryPreview,
  ttsCards,
  ttsLeaders,
  ttsTerritories,
  ttsSupplementals,
  ttsFinalized,
  ttsTrackers,
];

describe('Stage 5 atomic unified-face consumer cutover', () => {
  it('keeps the public physical-face renderer canonical-id-only', () => {
    expect(faceRender).toContain("query.get('id')");
    expect(faceRender).not.toContain("query.get('kind')");
    expect(faceRender).not.toContain("query.get('side')");
    expect(faceRender).not.toContain("query.get('orientation')");
    expect(faceRender).not.toContain("query.get('renderer')");
  });

  it('moves every current production consumer to face-render.html', () => {
    for (const source of productionConsumers) {
      expect(source).toContain('face-render.html');
    }

    for (const source of productionConsumers) {
      expect(source).not.toContain('card-review-render.html?');
      expect(source).not.toContain('territory-review-render.html?');
      expect(source).not.toContain('component-render.html?');
      expect(source).not.toContain('card-back-render.html?');
    }
  });

  it('uses canonical face identities instead of renderer-family query parameters', () => {
    expect(cardReview).toContain('leader:');
    expect(cardReview).toContain('card:');
    expect(cardReview).toContain('territory:');
    expect(proposals).toContain('component:diplomats-proposal-');
    expect(rites).toContain('component:');
    expect(supplementals).toContain('component:');
    expect(cardReference).toContain('buildFaceRendererUrl');
    expect(productionPrint).toContain('component:');
    expect(productionPrint).toContain('back:');
    expect(ttsCards).toContain('back:');
    expect(ttsLeaders).toContain('leader:');
    expect(ttsTerritories).toContain('territory:');
    expect(ttsSupplementals).toContain('component:');
    expect(ttsFinalized).toContain('component:');
    expect(ttsTrackers).toContain('component:');
  });

  it('bridges selected ruleset and render mode as context rather than route knowledge', () => {
    expect(deckRuntime).toContain('window.__gauntletProductionAuthorityBridge');
    expect(deckRuntime).toContain('rulesetMode: requestedRulesetMode');
    expect(deckRuntime).toContain("renderMode: 'preview'");
    expect(deckRuntime).toContain('runtime: data');
    expect(renderContext).toContain('publishTopLevelRenderBridge(game)');
    expect(renderContext).toContain("renderMode: 'preview'");
    expect(productionPrint).toContain('window.__gauntletProductionAuthorityBridge');
    expect(productionPrint).toContain("renderMode: 'print'");
    expect(productionPrint).not.toContain('&rules=');
  });

  it('preserves print-only raster normalization as template-declared preparation', () => {
    expect(playableTemplate).toContain("printArtwork: 'normalized'");
    expect(faceRender).toContain("productionRenderMode() !== 'print'");
    expect(faceRender).toContain("await import('./print-artwork-normalizer.js')");
    expect(faceRender).toContain('await applyPrintPreparation(preparation, result)');
  });

  it('keeps the architecture validator aligned with the single production route', () => {
    expect(architectureValidator).toContain('card-design/face-render.mjs');
    expect(architectureValidator).toContain('/card-design/face-render.html?id=');
    expect(architectureValidator).toContain('retiredProductionRoutes');
  });
});
