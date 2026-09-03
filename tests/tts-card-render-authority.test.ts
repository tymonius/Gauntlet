import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const cardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const territoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const leaderGenerator = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const supplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const finalizedGenerator = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
const trackerCapture = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const geometry = readFileSync('scripts/tts-supplemental-geometry.mjs', 'utf8');
const faceShell = readFileSync('card-design/face-render.html', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const facePreparation = readFileSync('card-design/face-preparation.mjs', 'utf8');
const playableTtsShell = readFileSync('tts/renderer/index.html', 'utf8');
const territoryTtsShell = readFileSync('tts/territory-renderer/index.html', 'utf8');
const backTtsShell = readFileSync('tts/back-renderer/index.html', 'utf8');
const supplementalTtsShell = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const finalizedTtsShell = readFileSync('tts/finalized-supplemental-renderer/index.html', 'utf8');
const dividerRules = readFileSync('card-design/reference-divider-rules.css', 'utf8');
const universalReference = readFileSync('card-design/universal-reference.css', 'utf8');

const generators = [
  cardGenerator,
  territoryGenerator,
  leaderGenerator,
  supplementalGenerator,
  finalizedGenerator,
  trackerCapture,
];

describe('TTS card render authority', () => {
  it('uses the canonical face renderer for every TTS physical-face capture', () => {
    for (const generator of generators) {
      expect(generator).toContain('/card-design/face-render.html');
      expect(generator).not.toContain('/card-design/component-render.html');
      expect(generator).not.toContain('/card-design/card-review-render.html');
      expect(generator).not.toContain('/card-design/territory-review-render.html');
      expect(generator).not.toContain('/card-design/card-back-render.html');
    }

    expect(cardGenerator).toContain('back:${faction}');
    expect(cardGenerator).toContain('card:${card.id}');
    expect(territoryGenerator).toContain('territory:${territory.id}');
    expect(leaderGenerator).toContain('leader:${leader.faction}-${leader.id}');
    expect(supplementalGenerator).toContain('component:${record.id}:${side}');
    expect(finalizedGenerator).toContain('component:${item.component.id}:${side}');
    expect(trackerCapture).toContain('component:${componentId}:front');
  });

  it('keeps template and stylesheet selection inside FaceSpec rather than TTS generators', () => {
    expect(faceShell).toContain('/card-design/face-render.mjs');
    expect(faceRuntime).toContain('resolveFaceSpec(game, faceIdFromLocation())');
    expect(faceRuntime).toContain('rendererForTemplate(spec.template)');
    expect(faceRuntime).toContain('spec.dependencies.styles.map(loadStylesheet)');
    expect(faceSpec).toContain('FACE_TEMPLATE_CONTRACTS');

    for (const generator of generators) {
      expect(generator).not.toContain('/card-design/leader-card.css');
      expect(generator).not.toContain('/card-design/proposal-card.css');
      expect(generator).not.toContain('/card-design/rite-card.css');
      expect(generator).not.toContain('/card-design/reference-card.css');
    }
  });

  it('derives current TTS identity from canonical FaceSpec provenance without render-time version overrides', () => {
    expect(currentGame.version).toBe('v0.7.1');
    expect(currentGame.displayVersion).toBe('v0.7.1');
    expect(faceSpec).toContain('provenance: authorityProvenance(game)');

    for (const generator of generators) {
      expect(generator).not.toContain("searchParams.set('version'");
      expect(generator).not.toContain('&version=');
    }
  });

  it('applies only canonical current-game artwork direction through the shared face runtime', () => {
    expect(Object.keys(currentGame.artDirection)).toHaveLength(210);
    expect(Object.values(currentGame.artDirection).every((direction: any) => direction.smart === false)).toBe(true);
    expect(faceRuntime).toContain('artwork.composition.direction');
    expect(faceRuntime).toContain('window.GauntletArtworkCrop.apply');
    expect(faceRuntime).toContain('result.element.dataset.artDirectionApplied = artwork.composition.id');

    for (const shell of [
      playableTtsShell,
      territoryTtsShell,
      backTtsShell,
      supplementalTtsShell,
      finalizedTtsShell,
    ]) {
      expect(shell).toContain('/card-design/face-render.html');
      expect(shell).not.toContain('/card-design/component-render.html');
      expect(shell).not.toContain('/card-design/card-review-render.html');
      expect(shell).not.toContain('/card-design/territory-review-render.html');
      expect(shell).not.toContain('/card-design/card-back-render.html');
    }

    expect(existsSync(['tts', 'artwork-direction-overrides.js'].join('/'))).toBe(false);
    for (const compatibilityDir of [
      'renderer',
      'territory-renderer',
      'back-renderer',
      'supplemental-renderer',
      'finalized-supplemental-renderer',
    ]) {
      expect(readdirSync(['tts', compatibilityDir].join('/')).sort()).toEqual(['index.html']);
    }
  });

  it('loads canonical production fonts before face preparation and fitting', () => {
    expect(facePreparation).toContain('PRODUCTION_FONT_REQUESTS');
    expect(facePreparation).toContain('"adobe-caslon-pro"');
    expect(facePreparation).toContain('"p22-1722-pro"');
    expect(facePreparation).toContain('"Inter"');
    expect(faceRuntime).toContain('await loadProductionFonts();');
    expect(faceRuntime.indexOf('await loadProductionFonts();'))
      .toBeLessThan(faceRuntime.indexOf('await template.render(spec);'));
  });

  it('inherits current reference styling including divider removal and Universal G watermark', () => {
    expect(dividerRules).toContain('.reference-card .reference-panel + .reference-panel');
    expect(dividerRules).toContain('border-top: 0 !important');
    expect(universalReference).toContain('.reference-card[data-component-id="universal-reference"] .reference-watermark');
    expect(universalReference).toContain('mask-image: url("../images/Gauntlet.svg")');
  });

  it('uses one landscape packaging orientation for Territories and Deeds', () => {
    expect(geometry).toContain('export const LANDSCAPE_TTS_CELL_ROTATION_DEGREES = 90');
    expect(territoryGenerator).toContain('LANDSCAPE_TTS_CELL_ROTATION_DEGREES');
    expect(finalizedGenerator).toContain('LANDSCAPE_TTS_CELL_ROTATION_DEGREES');
    expect(territoryGenerator).not.toContain('rotate(-90deg)');
    expect(finalizedGenerator).not.toContain('rotate(-90deg)');
    expect(finalizedGenerator).toContain("cellOrientation: 'portrait'");
    expect(finalizedGenerator).toContain("sidewaysCard: item.orientation === 'landscape'");
  });
});
