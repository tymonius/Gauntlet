import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';
import {
  stampTtsFacePublicationVersion,
  validateTtsFacePublicationSource,
} from '../scripts/tts-face-publication.mjs';

function facePage(version, datasetVersionKey = null) {
  const footer = { textContent: version };
  const element = {
    dataset: datasetVersionKey ? { [datasetVersionKey]: version } : {},
    querySelector: () => footer,
  };
  const page = {
    locator: () => ({
      evaluate: async (callback, args) => callback(element, args),
    }),
  };
  return { page, footer, element };
}

describe('TTS face publication labels', () => {
  it('requires frozen-published authority parity before rendering stable TTS faces', async () => {
    const release = await resolveCurrentTtsRelease();
    expect(release.version).toBe('v0.7.2');
    expect(release.authorityVersion).toBe('v0.7.2-candidate');
    await expect(validateTtsFacePublicationSource(release)).resolves.toBeUndefined();
    await expect(validateTtsFacePublicationSource({
      ...release, publicationTargetActive: false,
    })).rejects.toThrow(/aligned release target/);
  });

  it('stamps only a matching frozen-source footer on playable cards and Territories', async () => {
    const release = {
      authorityVersion: 'v0.7.2-candidate',
      version: 'v0.7.2',
      displayVersion: 'v0.7.2',
      publicationTargetActive: true,
    };
    const playable = facePage('v0.7.2-candidate');
    await stampTtsFacePublicationVersion(
      playable.page, release, '.gauntlet-card', '.card-footer span:last-child',
    );
    expect(playable.footer.textContent).toBe('v0.7.2');

    const territory = facePage('v0.7.2-candidate');
    await stampTtsFacePublicationVersion(
      territory.page, release, '.territory-card', '.territory-footer span:last-child',
    );
    expect(territory.footer.textContent).toBe('v0.7.2');

    const stale = facePage('v0.7.1');
    await expect(stampTtsFacePublicationVersion(
      stale.page, release, '.gauntlet-card', '.card-footer span:last-child',
    )).rejects.toThrow(/verified frozen authority/);
  });

  it('keeps Leader provenance and visible version synchronized', async () => {
    const release = {
      authorityVersion: 'v0.7.2-candidate',
      version: 'v0.7.2',
      displayVersion: 'v0.7.2',
      publicationTargetActive: true,
    };
    const leader = facePage('v0.7.2-candidate', 'leaderCopyVersion');
    await stampTtsFacePublicationVersion(
      leader.page, release, '.leader-card', '.card-footer span:last-child', 'leaderCopyVersion',
    );
    expect(leader.footer.textContent).toBe('v0.7.2');
    expect(leader.element.dataset.leaderCopyVersion).toBe('v0.7.2');
  });

  it('wires the same parity gate into every TTS face renderer', () => {
    for (const script of [
      'scripts/generate-tts-card-assets.mjs',
      'scripts/generate-tts-territory-assets.mjs',
      'scripts/generate-tts-leader-assets.mjs',
    ]) {
      const code = readFileSync(script, 'utf8');
      expect(code).toContain('await validateTtsFacePublicationSource(release)');
      expect(code).toContain('await stampTtsFacePublicationVersion(');
    }
  });
});
