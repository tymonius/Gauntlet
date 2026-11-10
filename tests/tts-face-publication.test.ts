import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';
import {
  stampTtsFacePublicationVersion,
  validateTtsFacePublicationSource,
} from '../tools/tts/tts-face-publication.mjs';
import * as legacyFacePublication from '../scripts/tts-face-publication.mjs';

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
  it('retains the existing script import as an exact canonical export', () => {
    expect(legacyFacePublication.validateTtsFacePublicationSource).toBe(validateTtsFacePublicationSource);
    expect(legacyFacePublication.stampTtsFacePublicationVersion).toBe(stampTtsFacePublicationVersion);
  });

  it('uses the current stable authority without requiring candidate relabeling', async () => {
    const release = await resolveCurrentTtsRelease();
    const current = JSON.parse(readFileSync(release.currentGameSource, 'utf8'));
    expect(release.authorityVersion).toBe(current.version);
    expect(release.version).toBe(current.version);
    expect(release.displayVersion).toBe(current.displayVersion);
    expect(release.publicationTargetActive).toBe(true);
    await expect(validateTtsFacePublicationSource(release)).resolves.toBeUndefined();

    const face = facePage(current.version);
    await stampTtsFacePublicationVersion(
      face.page, release, '.gauntlet-card', '.card-footer span:last-child',
    );
    expect(face.footer.textContent).toBe(current.version);
  });

  it('rejects missing authority and misaligned legacy candidate publication', async () => {
    const release = await resolveCurrentTtsRelease();
    await expect(validateTtsFacePublicationSource({
      ...release, authorityVersion: '',
    })).rejects.toThrow(/explicit gameplay authority provenance/);
    await expect(validateTtsFacePublicationSource({
      ...release, authorityVersion: 'v0.7.2-candidate', publicationTargetActive: false,
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
