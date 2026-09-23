import { describe, expect, it } from 'vitest';
import { faceFooterVersion, stampCanonicalFaceFooter } from '../../card-design/face-footer-version.mjs';
import { PUBLISHED_VERSION } from '../../packages/game-data/ruleset.mjs';

const frozenCandidate = Object.freeze({
  gameplay: '/game-data/current-game.json',
  version: `${PUBLISHED_VERSION}-candidate`,
  displayVersion: `${PUBLISHED_VERSION}-candidate`,
});

describe('physical-face release footer', () => {
  it('shows the published release on the frozen current-game candidate without changing source provenance', () => {
    const provenance = { ...frozenCandidate };
    const playableFooter = { textContent: provenance.displayVersion };
    const territoryFooter = { textContent: provenance.displayVersion };
    const leader = {
      dataset: { leaderCopyVersion: provenance.displayVersion, leaderCopySource: provenance.gameplay },
      querySelectorAll: () => [playableFooter, territoryFooter],
    };

    expect(faceFooterVersion(provenance)).toBe(PUBLISHED_VERSION);
    stampCanonicalFaceFooter(leader, provenance);

    expect(playableFooter.textContent).toBe(PUBLISHED_VERSION);
    expect(territoryFooter.textContent).toBe(PUBLISHED_VERSION);
    expect(leader.dataset.leaderCopyVersion).toBe(PUBLISHED_VERSION);
    expect(leader.dataset.leaderCopySource).toBe('/game-data/current-game.json');
    expect(provenance).toEqual(frozenCandidate);
  });

  it('preserves a genuinely unreleased candidate label and an explicitly released source', () => {
    const nextCandidate = { version: 'v0.7.3-candidate', displayVersion: 'v0.7.3-candidate' };
    const published = { version: PUBLISHED_VERSION, displayVersion: PUBLISHED_VERSION };
    const footer = { textContent: nextCandidate.displayVersion };
    const face = { dataset: {}, querySelectorAll: () => [footer] };

    expect(faceFooterVersion(nextCandidate)).toBe('v0.7.3-candidate');
    expect(faceFooterVersion(published)).toBe(PUBLISHED_VERSION);
    stampCanonicalFaceFooter(face, nextCandidate);
    expect(footer.textContent).toBe('v0.7.3-candidate');
  });

  it('rejects an unexpected footer rather than relabeling unrelated card copy', () => {
    const face = {
      dataset: {},
      querySelectorAll: () => [{ textContent: 'v0.7.1' }],
    };
    expect(() => stampCanonicalFaceFooter(face, frozenCandidate)).toThrow(/footer disagrees/);
  });
});
