import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveArtDirection } from '../game-data/art-direction.mjs';
import { PRODUCTION_SURFACES } from '../card-design/production-surface.mjs';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const currentRuntime = readFileSync('game-data/current-game.mjs', 'utf8');
const currentValidation = readFileSync('game-data/current-game-validation.mjs', 'utf8');
const releasedRuntime = readFileSync('game-data/ruleset.mjs', 'utf8');
const renderContext = readFileSync('card-design/render-context.mjs', 'utf8');
const componentRender = readFileSync('card-design/component-render.js', 'utf8');
const componentRenderHtml = readFileSync('card-design/component-render.html', 'utf8');
const playableSurface = readFileSync('card-design/card-review-render.js', 'utf8');
const playableRenderer = readFileSync('card-design/playable-card-renderer.js', 'utf8');
const territorySurface = readFileSync('card-design/territory-review-render.js', 'utf8');
const territoryRenderer = readFileSync('card-design/territory-card-renderer.js', 'utf8');
const leaderCopy = readFileSync('card-design/leader-card-copy.js', 'utf8');
const proposals = readFileSync('card-design/proposal-card.js', 'utf8');
const rites = readFileSync('card-design/rite-card.js', 'utf8');
const supplementals = readFileSync('card-design/supplemental-card.js', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const inspection = readFileSync('card-reference/card-inspection.js', 'utf8');
const deckbuilderPreview = readFileSync('deckbuilder/rendered-card-preview.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');

describe('complete canonical render authority', () => {
  it('makes current-game data the complete default artwork-composition authority', () => {
    expect(currentGame.visualPolicy.artDirectionDefault).toEqual({
      fit: 'cover',
      focusX: null,
      focusY: null,
      smart: true,
      zoom: 1,
    });

    expect(resolveArtDirection(currentGame.visualPolicy, currentGame.artDirection, 'missing-id')).toEqual(
      currentGame.visualPolicy.artDirectionDefault,
    );
    expect(resolveArtDirection(currentGame.visualPolicy, currentGame.artDirection, 'financiers-banker')).toEqual({
      ...currentGame.visualPolicy.artDirectionDefault,
      focusY: 0,
    });

    expect(currentValidation).toContain('validateVisualPolicy(authority.visualPolicy)');
    expect(currentRuntime).toContain('validateCurrentGameAuthority(authority)');
    expect(currentRuntime).toContain('resolveArtDirection(visualPolicy, artDirection, id)');
    expect(releasedRuntime).toContain('validateVisualPolicy(visualAuthority.visualPolicy)');
    expect(releasedRuntime).toContain('resolveArtDirection(visualPolicy, artDirection, id)');
  });

  it('loads one immutable render context per face and shares it with component builders', () => {
    expect(renderContext).toContain('let renderContextPromise = null');
    expect(renderContext).toContain('renderContextPromise = loadCurrentGame()');
    expect(renderContext).toContain('visualAuthorityUrl');
    expect(renderContext).toContain('artDirectionFor(id)');
    expect(componentRender).toContain('loadRenderContext');
    expect(componentRender).toContain('renderContext.artDirectionFor(artworkId)');
    expect(playableSurface).toContain('loadRenderContext');
    expect(territorySurface).toContain('loadRenderContext');

    for (const builder of [leaderCopy, proposals, rites, supplementals]) {
      expect(builder).toContain("loadRenderGame");
      expect(builder).not.toContain("loadCurrentGame");
    }
  });

  it('keeps crop behavior and face implementations under Card Design ownership', () => {
    expect(componentRenderHtml).toContain('/card-design/artwork-crop.js');
    expect(playableSurface).toContain("loadScript('/card-design/artwork-crop.js')");
    expect(playableSurface).toContain("loadScript('/card-design/playable-card-renderer.js')");
    expect(territorySurface).toContain("loadScript('/card-design/artwork-crop.js')");
    expect(territorySurface).toContain("loadScript('/card-design/territory-card-renderer.js')");
    expect(playableRenderer).toContain('Canonical artwork direction is missing');
    expect(territoryRenderer).toContain('Canonical artwork direction is missing');
    expect(playableRenderer).not.toContain('css-default');
    expect(territoryRenderer).not.toContain('css-default');

    for (const obsolete of [
      ['tts', 'artwork-crop.js'].join('/'),
      ['tts', 'artwork-direction-overrides.js'].join('/'),
      ['tts', 'renderer', 'renderer.js'].join('/'),
      ['tts', 'territory-renderer', 'territory-renderer.js'].join('/'),
      ['tts', 'supplemental-renderer', 'supplemental-renderer.js'].join('/'),
      ['tts', 'finalized-supplemental-renderer', 'renderer.js'].join('/'),
    ]) {
      expect(existsSync(obsolete)).toBe(false);
    }
  });

  it('uses one artwork-file resolver for Card Design and TTS generation', () => {
    expect(ttsCatalog).toContain("resolveFirstArtwork");
    expect(ttsCatalog).toContain("../card-design/card-artwork-resolver.js");
    expect(ttsCatalog).toContain('repositoryArtworkExists');
    expect(ttsCatalog).not.toContain('walkImages(');
    expect(ttsCatalog).not.toContain('buildArtworkIndex(');
    expect(ttsCatalog).not.toContain('chooseArtwork(');
  });

  it('centralizes physical face geometry for review and inspection consumers', () => {
    expect(PRODUCTION_SURFACES.portrait).toMatchObject({
      widthIn: 2.5,
      heightIn: 3.5,
      widthCssPx: 240,
      heightCssPx: 336,
    });
    expect(PRODUCTION_SURFACES.landscape).toMatchObject({
      widthIn: 3.5,
      heightIn: 2.5,
      widthCssPx: 336,
      heightCssPx: 240,
    });
    expect(componentRender).toContain('surfaceCssSize(orientation)');
    expect(cardReference).toContain('PRODUCTION_SURFACES');
    expect(inspection).toContain('PRODUCTION_SURFACES');
    expect(deckbuilderPreview).toContain('PRODUCTION_SURFACES.portrait');
  });

  it('keeps back policy data-driven and card backs on the Card Design render surface', () => {
    expect(productionPrint).toContain('component.backPolicy || "standardBack"');
    expect(productionPrint).toContain('/card-design/card-back-render.html?faction=');
    expect(productionPrint).not.toContain('/tts/back-renderer/index.html?faction=');
  });
});
