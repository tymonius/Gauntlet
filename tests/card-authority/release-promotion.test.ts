import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runtimeGameFromAuthority } from '../../scripts/card-authority/model.mjs';
import { resolveFaceSpec } from '../../card-design/face-spec.mjs';

const frozenPath = 'artifacts/release-freezes/v0.7.2/current-game.json';
const freeze = JSON.parse(readFileSync('config/v072-release-freeze.json', 'utf8'));
const live = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));
const frozenBytes = readFileSync(frozenPath);
const frozen = JSON.parse(frozenBytes.toString('utf8'));

describe('v0.7.2 canonical game promotion', () => {
  it('presents the official version from the canonical source without a renderer override', () => {
    if (live.version !== 'v0.7.2') return; // A subsequent development candidate may become the live authority.
    expect(live.version).toBe('v0.7.2');
    expect(live.displayVersion).toBe('v0.7.2');
    expect(live.status).toBe('current-release');
    expect(live.starterDecks.version).toBe('v0.7.2');
    expect(JSON.stringify(live.starterDecks)).not.toContain('v0.7.2-candidate');
    const game = runtimeGameFromAuthority(live);
    const face = resolveFaceSpec(game, `card:${live.gameplay.cards[0].id}`);
    expect(face.provenance.version).toBe('v0.7.2');
    expect(face.provenance.displayVersion).toBe('v0.7.2');
  });

  it('keeps the published freeze content-addressed and gameplay-identical', () => {
    const prefix = Buffer.from(`blob ${frozenBytes.length}\0`, 'utf8');
    const sha = createHash('sha1').update(prefix).update(frozenBytes).digest('hex');
    expect(sha).toBe(freeze.sources.currentGame.gitBlob);
    expect(frozen.version).toBe('v0.7.2-candidate');
    expect(frozen.status).toBe('active-development');
    if (live.version === 'v0.7.2') {
      expect(live.gameplay).toEqual(frozen.gameplay);
      expect(live.leaders).toEqual(frozen.leaders);
      expect(live.proposals).toEqual(frozen.proposals);
      expect(live.starterDecks.decks).toEqual(frozen.starterDecks.decks);
    }
  });
});
