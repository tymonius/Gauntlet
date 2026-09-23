import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateCurrentReleaseIdentity } from '../../scripts/validate-current-release-identity.mjs';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const authority = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('release-cutover identity gate', () => {
  it('requires the canonical current-game identity to agree with the published release', () => {
    expect(validateCurrentReleaseIdentity(lifecycle, authority).publishedVersion).toBe(lifecycle.current_release);
  });

  it('rejects exactly the candidate-metadata mistake from the v0.7.2 cutover', () => {
    const candidate = clone(authority);
    candidate.version = `${lifecycle.current_release}-candidate`;
    candidate.displayVersion = candidate.version;
    candidate.status = 'active-development';
    expect(() => validateCurrentReleaseIdentity(lifecycle, candidate)).toThrow(/cannot leave the live current-game source/);
  });

  it('rejects a promoted release with stale face and starter metadata', () => {
    const candidate = clone(authority);
    candidate.version = lifecycle.current_release;
    candidate.displayVersion = `${lifecycle.current_release}-candidate`;
    expect(() => validateCurrentReleaseIdentity(lifecycle, candidate)).toThrow(/displayVersion/);
    candidate.displayVersion = lifecycle.current_release;
    candidate.starterDecks.version = `${lifecycle.current_release}-candidate`;
    expect(() => validateCurrentReleaseIdentity(lifecycle, candidate)).toThrow(/Starter Deck metadata/);
  });

  it('permits the next development candidate without relabeling it as the published version', () => {
    const candidate = clone(authority);
    candidate.version = 'v99.0.0-candidate';
    candidate.displayVersion = candidate.version;
    candidate.status = 'active-development';
    expect(validateCurrentReleaseIdentity(lifecycle, candidate).sourceVersion).toBe('v99.0.0-candidate');
  });
});
