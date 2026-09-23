import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicDisplayVersion } from '../../packages/game-data/public-display-version.mjs';
import { PUBLISHED_VERSION } from '../../packages/game-data/ruleset.mjs';
import { runtimeGameFromAuthority } from '../../scripts/card-authority/model.mjs';
import { resolveFaceSpec } from '../../card-design/face-spec.mjs';

const authority = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));

describe('public release display version at the shared game source', () => {
  it('renders the published version for the frozen candidate while retaining the immutable gameplay identity', () => {
    expect(authority.version).toBe(`${PUBLISHED_VERSION}-candidate`);
    expect(authority.displayVersion).toBe(authority.version);
    expect(publicDisplayVersion(authority)).toBe(PUBLISHED_VERSION);

    const runtime = runtimeGameFromAuthority(authority);
    expect(runtime.version).toBe(authority.version);
    expect(runtime.displayVersion).toBe(PUBLISHED_VERSION);

    const face = resolveFaceSpec(runtime, `card:${authority.gameplay.cards[0].id}`);
    expect(face.provenance.version).toBe(authority.version);
    expect(face.provenance.displayVersion).toBe(PUBLISHED_VERSION);
  });

  it('preserves future unreleased candidate and released labels', () => {
    expect(publicDisplayVersion({ version: 'v0.7.3-candidate', displayVersion: 'v0.7.3-candidate' }))
      .toBe('v0.7.3-candidate');
    expect(publicDisplayVersion({ version: PUBLISHED_VERSION, displayVersion: PUBLISHED_VERSION }))
      .toBe(PUBLISHED_VERSION);
  });

  it('does not hide source/display disagreements', () => {
    expect(publicDisplayVersion({
      version: `${PUBLISHED_VERSION}-candidate`,
      displayVersion: 'unexpected-display-version',
    })).toBe('unexpected-display-version');
  });
});
