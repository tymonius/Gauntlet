import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveArtDirection } from '../game-data/art-direction.mjs';
import { PRODUCTION_SURFACES } from '../card-design/production-surface.mjs';
import { FACE_TEMPLATES } from '../card-design/face-authority.mjs';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const currentRuntime = readFileSync('game-data/current-game.mjs', 'utf8');
const currentValidation = readFileSync('game-data/current-game-validation.mjs', 'utf8');
const releasedRuntime = readFileSync('game-data/ruleset.mjs', 'utf8');
const renderContext = readFileSync('card-design/render-context.mjs', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const faceRegistry = readFileSync('card-design/face-template-registry.mjs', 'utf8');
const cardDesignIndex = readFileSync('card-design/index.html', 'utf8');
const playableRenderer = readFileSync('card-design/playable-card-renderer.js', 'utf8');
const territoryRenderer = readFileSync('card-design/territory-card-renderer.js', 'utf8');
const leaderCopy = readFileSync('card-design/leader-card-copy.js', 'utf8');
const proposals = readFileSync('card-design/proposal-card.js', 'utf8');
const rites = readFileSync('card-design/rite-card.js', 'utf8');
const supplementals = readFileSync('card-design/supplemental-card.js', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardReference = readFileSync('card-reference/app.js', 'utf8');
const inspection = readFileSync('card-reference/card-inspection.js', 'utf8');
const deckbuilderPreview = readFileSync('deckbuilder/rendered-card-preview.js', 'utf8');
const deckbuilderTerritories = readFileSync('deckbuilder/territories.js', 'utf8');
const cardDesignReview = readFileSync('card-design/card-review.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/production-print.js', 'utf8');
const ttsCardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const ttsLeaderGenerator = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const ttsTerritoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const ttsSupplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const ttsFinalizedGenerator = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
const ttsTrackerCapture = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const ttsGeometry = readFileSync('scripts/tts-supplemental-geometry.mjs', 'utf8');
const currentCardValidator = readFileSync('scripts/validate-current-card-render.mjs', 'utf8');
const currentTerritoryValidator = readFileSync('scripts/validate-current-territory-render.mjs', 'utf8');
const proposalValidator = readFileSync('scripts/validate-proposal-card-render.mjs', 'utf8');
const riteValidator = readFileSync('scripts/validate-rite-card-render.mjs', 'utf8');
const territoryMobileValidator = readFileSync('scripts/validate-territory-mobile-render.mjs', 'utf8');
const leaderSpecimens = readFileSync('scripts/render-leader-card-specimens.mjs', 'utf8');
const backSpecimens = readFileSync('scripts/render-card-back-specimen.mjs', 'utf8');

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
    expect(resolveArtDirection(currentGame.visualPolicy, currentGame.artDirection, 'financiers-banker')).toEqual(
      currentGame.artDirection['financiers-banker'],
    );
    expect(currentGame.artDirection['financiers-banker']).toMatchObject({
      smart: false,
      focusX: 0.5,
      focusY: 0,
      zoom: 1,
    });

    expect(currentValidation).toContain('validateVisualPolicy(authority.visualPolicy)');
    expect(currentRuntime).toContain('validateCurrentGameAuthority(authority)');
    expect(currentRuntime).toContain('resolveArtDirection(visualPolicy, artDirection, id)');
    expect(releasedRuntime).toContain('validateVisualPolicy(visualAuthority.visualPolicy)');
    expect(releasedRuntime).toContain('resolveArtDirection(visualPolicy, artDirection, id)');
  });

  it('resolves one immutable render context into one complete FaceSpec', () => {
    expect(renderContext).toContain('let renderContextPromise = null');
    expect(renderContext).toContain('renderContextPromise = loadCurrentGame()');
    expect(renderContext).toContain('visualAuthorityUrl');
    expect(renderContext).toContain('artDirectionFor(id)');
    expect(faceRuntime).toContain("const game = await loadRenderGame()");
    expect(faceRuntime).toContain('resolveFaceSpec(game, faceIdFromLocation())');
    expect(faceRuntime).toContain('rendererForTemplate(spec.template)');
    expect(faceSpec).toContain('return deepFreeze({');
    expect(faceSpec).toContain('provenance: authorityProvenance(game)');
    expect(faceSpec).toContain('productionReady: issues.length === 0');

    for (const builder of [leaderCopy, proposals, rites, supplementals]) {
      expect(builder).toContain('loadRenderGame');
      expect(builder).not.toContain('loadCurrentGame');
    }
  });

  it('keeps crop policy and template dispatch under the unified Card Design renderer', () => {
    expect(cardDesignIndex).toContain('src="artwork-crop.js"');
    expect(cardDesignIndex).not.toContain('../tts/artwork-crop.js');
    expect(faceRuntime).toContain("loadClassicScript('/card-design/artwork-crop.js'");
    expect(faceRuntime).toContain('window.GauntletArtworkCrop.apply');
    expect(faceSpec).toContain('composition: artDirectionSpec(game, card.id)');
    expect(faceSpec).toContain('composition: artDirectionSpec(game, territory.id)');
    expect(faceRegistry).toContain('playable');
    expect(faceRegistry).toContain('territory');
    expect(faceRegistry).toContain("'standard-back'");
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
    expect(faceSpec).toContain("import { artworkCandidates } from './card-artwork-resolver.js'");
    expect(ttsCatalog).toContain('resolveFirstArtwork');
    expect(ttsCatalog).toContain('../card-design/card-artwork-resolver.js');
    expect(ttsCatalog).toContain('repositoryArtworkExists');
    expect(ttsCatalog).not.toContain('walkImages(');
    expect(ttsCatalog).not.toContain('buildArtworkIndex(');
    expect(ttsCatalog).not.toContain('chooseArtwork(');
  });

  it('centralizes physical face geometry in Face authority and shared production surfaces', () => {
    expect(PRODUCTION_SURFACES.portrait).toMatchObject({
      widthIn: 2.5,
      heightIn: 3.5,
      widthCssPx: 240,
      heightCssPx: 336,
      widthRasterPx: 400,
      heightRasterPx: 560,
    });
    expect(PRODUCTION_SURFACES.landscape).toMatchObject({
      widthIn: 3.5,
      heightIn: 2.5,
      widthCssPx: 336,
      heightCssPx: 240,
      widthRasterPx: 560,
      heightRasterPx: 400,
    });
    expect(FACE_TEMPLATES.playable.orientation).toBe('portrait');
    expect(FACE_TEMPLATES.territory.orientation).toBe('landscape');
    expect(FACE_TEMPLATES.deed.orientation).toBe('landscape');
    expect(cardReference).toContain('PRODUCTION_SURFACES');
    expect(inspection).toContain('PRODUCTION_SURFACES');
    expect(deckbuilderPreview).toContain('PRODUCTION_SURFACES.portrait');
    expect(deckbuilderTerritories).toContain('PRODUCTION_SURFACES.landscape');
    expect(cardDesignReview).toContain('PRODUCTION_SURFACES.landscape');

    for (const consumer of [
      ttsCardGenerator,
      ttsLeaderGenerator,
      ttsTerritoryGenerator,
      ttsSupplementalGenerator,
      ttsFinalizedGenerator,
      ttsTrackerCapture,
      ttsGeometry,
      currentCardValidator,
      currentTerritoryValidator,
      proposalValidator,
      riteValidator,
      territoryMobileValidator,
      leaderSpecimens,
      backSpecimens,
    ]) {
      expect(consumer).toContain('../card-design/production-surface.mjs');
    }
  });

  it('routes every live output family through canonical face identity', () => {
    for (const consumer of [
      productionPrint,
      cardReference,
      ttsCardGenerator,
      ttsTerritoryGenerator,
      ttsSupplementalGenerator,
      ttsFinalizedGenerator,
      ttsTrackerCapture,
    ]) {
      expect(consumer).toContain('face-render.html');
    }
    expect(productionPrint).toContain('component.backPolicy || "standardBack"');
    expect(productionPrint).toContain('faceRenderSource(`back:${safeFaction}`)');
    expect(faceRuntime).toContain("query.get('id')");
    expect(faceRuntime).not.toContain("query.get('kind')");
    expect(faceRuntime).not.toContain("query.get('side')");
    expect(faceRuntime).not.toContain("query.get('orientation')");
  });
});
