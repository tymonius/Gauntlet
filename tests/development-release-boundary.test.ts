import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const releaseTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const materializer = readFileSync('.github/workflows/materialize-v071-release-package.yml', 'utf8');
const releaseBuilder = readFileSync('scripts/build-v071-release-source.mjs', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardValidator = readFileSync('scripts/validate-v064-card-render.mjs', 'utf8');
const territoryValidator = readFileSync('scripts/validate-v064-territory-render.mjs', 'utf8');
const proposalValidator = readFileSync('scripts/validate-proposal-card-render.mjs', 'utf8');
const starterValidator = readFileSync('scripts/validate-starter-decks.mjs', 'utf8');
const riteValidator = readFileSync('scripts/validate-rite-card-render.mjs', 'utf8');

describe('development and published-release boundary', () => {
  it('keeps published v0.7.1 materialization isolated while TTS remains separately gated', () => {
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(releaseTarget.releaseTag).toBe('v0.7.0');
    expect(currentGame.version).not.toBe(releaseTarget.releaseTag);
    expect(materializer).toContain('pull_request:');
    expect(releaseBuilder).toContain('[RELEASE_VERSION, CANDIDATE_VERSION].includes(authority.version)');
    expect(releaseBuilder).toContain('validateFrozenReleaseSources');
  });

  it('derives current TTS identity from current-game rather than the publication target', () => {
    expect(packageJson.scripts['tts:check']).not.toContain('promote-tts-save.mjs --check');
    expect(packageJson.scripts['tts:check']).toContain('node --check scripts/promote-tts-save.mjs');
    expect(ttsCatalog).not.toContain('TTS_RELEASE_TARGET_SOURCE');
    expect(ttsCatalog).toContain('version: sourceVersion');
    expect(ttsCatalog).toContain('targetStatus: String(authority.status');
  });

  it('keeps current-development validators version-agnostic', () => {
    for (const source of [cardValidator, territoryValidator, proposalValidator, starterValidator]) {
      expect(source).not.toMatch(/authority\.version\s*!==\s*['"]v\d/);
      expect(source).not.toMatch(/requires the complete v\d/);
    }
  });

  it('derives Rite render expectations from the current Rite pool', () => {
    expect(riteValidator).toContain('const expectedRites = (authority.mystics?.rites || []).map');
    expect(riteValidator).toContain('const expectedCardFaces = expectedRites.length * 2 + 1');
    expect(riteValidator).not.toContain('EXPECTED_RITES');
  });
});
