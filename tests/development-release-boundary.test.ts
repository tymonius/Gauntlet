import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const releaseTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const materializer = readFileSync('.github/workflows/materialize-v071-release-package.yml', 'utf8');
const releaseBuilder = readFileSync('scripts/build-v071-release-source.mjs', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardAuthorityModel = readFileSync('scripts/card-authority/model.mjs', 'utf8');
const renderedFaceValidator = readFileSync('scripts/card-authority/validate-rendered-faces.mjs', 'utf8');
const starterValidator = readFileSync('scripts/validate-starter-decks.mjs', 'utf8');

describe('development and published-release boundary', () => {
  it('keeps published v0.7.1 materialization isolated while the TTS target matches the live Workshop release', () => {
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(releaseTarget.releaseTag).toBe('v0.7.1');
    expect(currentGame.version).toBe(releaseTarget.releaseTag);
    expect(materializer).toContain('pull_request:');
    expect(releaseBuilder).toContain('[RELEASE_VERSION, CANDIDATE_VERSION].includes(authority.version)');
    expect(releaseBuilder).toContain('repairAndValidateFrozenReleaseSources');
  });

  it('derives current TTS identity from current-game rather than the publication target', () => {
    expect(packageJson.scripts['tts:check']).not.toContain('promote-tts-save.mjs --check');
    expect(packageJson.scripts['tts:check']).toContain('node --check scripts/promote-tts-save.mjs');
    expect(ttsCatalog).not.toContain('TTS_RELEASE_TARGET_SOURCE');
    expect(ttsCatalog).toContain('version: sourceVersion');
    expect(ttsCatalog).toContain('targetStatus: String(authority.status');
  });

  it('keeps current-development validators version-agnostic', () => {
    for (const source of [cardAuthorityModel, renderedFaceValidator, starterValidator]) {
      expect(source).not.toMatch(/authority\.version\s*!==\s*['"]v\d/);
      expect(source).not.toMatch(/requires the complete v\d/);
    }
  });

  it('derives physical-face render scope from current authority rather than family-specific constants', () => {
    expect(cardAuthorityModel).toContain('expectedFaceIds(authority)');
    expect(renderedFaceValidator).toContain('resolveAllFaceSpecs(runtimeGameFromAuthority(authority))');
    expect(renderedFaceValidator).not.toContain('EXPECTED_RITES');
    expect(renderedFaceValidator).not.toContain('EXPECTED_CATALOG_COUNT');
  });
});
