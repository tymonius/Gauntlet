import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';

const target = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('TTS release target identity', () => {
  it('targets the v0.7.0 release candidate while retaining approved current-game source provenance', () => {
    expect(target).toEqual(expect.objectContaining({
      schemaVersion: 1,
      releaseTag: 'v0.7.0',
      displayVersion: 'v0.7.0',
      sourceVersion: currentGame.version,
      currentGameAuthority: 'game-data/current-game.json',
      status: 'release-candidate',
    }));
    expect(currentGame.version).toBe('v0.6.4-candidate');
  });

  it('resolves generated TTS output under the v0.7.0 identity', async () => {
    const release = await resolveCurrentTtsRelease();
    expect(release.version).toBe('v0.7.0');
    expect(release.displayVersion).toBe('v0.7.0');
    expect(release.sourceVersion).toBe(currentGame.version);
    expect(release.targetStatus).toBe('release-candidate');
    expect(release.outputRoot.replaceAll('\\', '/')).toMatch(/\/tts\/generated\/v0\.7\.0$/);
  });

  it('records source-data version separately from the TTS package version', async () => {
    const catalog = await buildCatalog();
    expect(catalog.gameVersion).toBe('v0.7.0');
    expect(catalog.release.sourceVersion).toBe(currentGame.version);
    expect(catalog.release.canonicalDataVersion).toBe(currentGame.version);
    expect(catalog.release.ttsReleaseTargetSource).toBe('config/tts-release-target.json');
  });
});
