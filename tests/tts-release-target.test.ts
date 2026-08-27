import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';

const target = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('TTS release target identity', () => {
  it('targets v0.7.0 TTS QA against the finalized v0.7.0 current-game authority', () => {
    expect(target).toEqual(expect.objectContaining({
      schemaVersion: 1,
      releaseTag: 'v0.7.0',
      displayVersion: 'v0.7.0',
      sourceVersion: currentGame.version,
      currentGameAuthority: 'game-data/current-game.json',
      status: 'qa-pending',
    }));
    expect(currentGame.version).toBe('v0.7.0');
  });

  it('resolves generated TTS output under the v0.7.0 identity', async () => {
    const release = await resolveCurrentTtsRelease();
    expect(release.version).toBe('v0.7.0');
    expect(release.displayVersion).toBe('v0.7.0');
    expect(release.sourceVersion).toBe(currentGame.version);
    expect(release.targetStatus).toBe('qa-pending');
    expect(release.outputRoot.replaceAll('\\', '/')).toMatch(/\/tts\/generated\/v0\.7\.0$/);
  });

  it('records the finalized source identity alongside the TTS package identity', async () => {
    const catalog = await buildCatalog();
    expect(catalog.gameVersion).toBe('v0.7.0');
    expect(catalog.release.sourceVersion).toBe(currentGame.version);
    expect(catalog.release.canonicalDataVersion).toBe(currentGame.version);
    expect(catalog.release.ttsReleaseTargetSource).toBe('config/tts-release-target.json');
  });
});
