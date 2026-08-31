import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const cardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const territoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const leaderGenerator = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const supplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const finalizedGenerator = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
const trackerCapture = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const geometry = readFileSync('scripts/tts-supplemental-geometry.mjs', 'utf8');
const componentShell = readFileSync('card-design/component-print-render.html', 'utf8');
const componentRenderer = readFileSync('card-design/component-print-render.js', 'utf8');
const sharedCardDesign = readFileSync('card-design/card-design.js', 'utf8');
const designTokens = readFileSync('design-tokens.css', 'utf8');
const playableRenderer = readFileSync('card-design/card-review-render.js', 'utf8');
const territoryRenderer = readFileSync('card-design/territory-review-render.js', 'utf8');
const playableTtsRenderer = readFileSync('tts/renderer/renderer.js', 'utf8');
const territoryTtsRenderer = readFileSync('tts/territory-renderer/territory-renderer.js', 'utf8');
const cardDesignCatalog = readFileSync('card-design/current-card-catalog.js', 'utf8');
const cardDesignShell = readFileSync('card-design/index.html', 'utf8');
const dividerRules = readFileSync('card-design/reference-divider-rules.css', 'utf8');
const universalReference = readFileSync('card-design/universal-reference.css', 'utf8');

describe('TTS card render authority', () => {
  it('uses Card Design as the only card-face render authority', () => {
    expect(cardGenerator).toContain('/card-design/card-review-render.html');
    expect(cardGenerator).not.toContain('/tts/renderer/?card=');

    expect(territoryGenerator).toContain('/card-design/territory-review-render.html');
    expect(territoryGenerator).not.toContain('/tts/territory-renderer/?territory=');

    expect(leaderGenerator).toContain('/card-design/component-print-render.html');
    expect(leaderGenerator).not.toContain("page.goto(`${baseUrl}/card-design/`");
    expect(leaderGenerator).not.toContain('GauntletArtworkCrop.apply');

    expect(supplementalGenerator).toContain('/card-design/component-print-render.html');
    expect(supplementalGenerator).not.toContain('/tts/supplemental-renderer/');

    expect(finalizedGenerator).toContain('/card-design/component-print-render.html');
    expect(finalizedGenerator).not.toContain('/tts/finalized-supplemental-renderer/');

    expect(trackerCapture).toContain('/card-design/component-print-render.html');
    expect(trackerCapture).not.toContain("page.goto(`${baseUrl}/card-design/`");
  });

  it('loads the complete Card Design styling stack for component capture', () => {
    for (const stylesheet of [
      '/card-design/card-design.css',
      '/card-design/card-design-refinement.css',
      '/card-design/faction-specimens.css',
      '/card-design/leader-card.css',
      '/card-design/proposal-card.css',
      '/card-design/rite-card.css',
      '/card-design/reference-card.css',
      '/card-design/supplemental-card.css',
      '/card-design/supplemental-refinements.css',
      '/card-design/capital-ledger.css',
      '/card-design/deed-card.css',
    ]) {
      expect(componentShell).toContain(stylesheet);
    }
  });

  it('derives current TTS identity from current-game without a render-time version override', () => {
    expect(currentGame.version).toBe('v0.7.1');
    expect(currentGame.displayVersion).toBe('v0.7.1');

    expect(cardGenerator).toContain('version=${encodeURIComponent(release.displayVersion || release.version)}');
    expect(territoryGenerator).toContain('version=${encodeURIComponent(release.displayVersion || release.version)}');
    expect(supplementalGenerator).toContain('release.displayVersion || release.version');
    expect(finalizedGenerator).toContain('release.displayVersion || release.version');
    expect(leaderGenerator).toContain("url.searchParams.set('version', displayVersion)");
    expect(trackerCapture).toContain("url.searchParams.set('version', displayVersion)");

    expect(playableRenderer).toContain("const versionOverride = String(params.get('version') || '').trim()");
    expect(playableRenderer).toContain('const displayVersion = versionOverride || await resolveDisplayVersion(currentGame)');
    expect(playableRenderer).toContain('gameVersion: displayVersion');
    expect(territoryRenderer).toContain("const versionOverride = String(params.get('version') || '').trim()");
    expect(territoryRenderer).toContain('gameVersion: versionOverride || currentGame.displayVersion');
    expect(componentRenderer).toContain('const versionOverride = String(params.get("version") || "").trim()');
    expect(componentRenderer).toContain('if (versionOverride)');
    expect(componentRenderer).toContain('versionNode.textContent = versionOverride');
  });

  it('applies only current-game artwork direction on every production capture surface', () => {
    expect(currentGame.artDirection['rite-blood']).toBeTruthy();
    expect(currentGame.artDirection['rite-echoes']).toBeTruthy();
    expect(currentGame.artDirection['rite-equivalence']).toBeTruthy();

    expect(cardDesignCatalog).toContain('window.GAUNTLET_ART_DIRECTION = currentGame.artDirection || {}');
    expect(cardDesignShell).not.toContain('../tts/artwork-direction-overrides.js');

    expect(componentRenderer).toContain('async function loadCanonicalArtDirection()');
    expect(componentRenderer).toContain('await import("/game-data/current-game.mjs")');
    expect(componentRenderer).toContain('window.GAUNTLET_ART_DIRECTION = currentGame.artDirection || {}');
    expect(componentRenderer).toContain('function canonicalArtworkId(card)');
    expect(componentRenderer).toContain('window.GAUNTLET_ART_DIRECTION?.[artworkId]');
    expect(componentRenderer).toContain('await applyCanonicalArtworkDirection(card)');
    expect(componentRenderer).toContain('card.dataset.artDirectionApplied = artworkId');
    expect(componentRenderer).toContain('card.dataset.artDirectionApplied = "css-default"');

    expect(playableTtsRenderer).toContain('if (card.artDirection && Object.keys(card.artDirection).length)');
    expect(territoryTtsRenderer).toContain('if (territory.artDirection && Object.keys(territory.artDirection).length)');
  });

  it('loads the canonical web fonts before shared content-sensitive fitting', () => {
    expect(designTokens).toContain('family=Inter:wght@400;600;700;800');
    expect(sharedCardDesign).toContain('PRODUCTION_FONT_REQUESTS');
    expect(sharedCardDesign).toContain('"adobe-caslon-pro"');
    expect(sharedCardDesign).toContain('"p22-1722-pro"');
    expect(sharedCardDesign).toContain('"Inter"');
    expect(sharedCardDesign).toContain('await loadProductionFonts()');
    expect(sharedCardDesign.indexOf('await loadProductionFonts()'))
      .toBeLessThan(sharedCardDesign.indexOf('fitAllCards();'));
    expect(componentRenderer).toContain('document.body.dataset.productionFontsReady');
    expect(componentRenderer).not.toContain('preloadProductionFonts');
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
