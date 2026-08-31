import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';

const target = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('TTS development and publication identity', () => {
  it('advances the TTS publication target to stable v0.7.1', () => {
    expect(target.releaseTag).toBe('v0.7.1');
    expect(target.displayVersion).toBe('v0.7.1');
    expect(target.sourceVersion).toBe('v0.7.1');
    expect(currentGame.version).toBe('v0.7.1');
  });

  it('derives current TTS identity directly from current-game', async () => {
    const release = await resolveCurrentTtsRelease();
    expect(release.version).toBe(currentGame.version);
    expect(release.displayVersion).toBe(currentGame.displayVersion);
    expect(release.sourceVersion).toBe(currentGame.version);
    expect(release.targetStatus).toBe(currentGame.status);
    expect(release.outputRoot.replaceAll('\\', '/')).toMatch(/\/tts\/generated\/v0\.7\.1$/);
    expect(release).not.toHaveProperty('ttsReleaseTargetSource');
  });

  it('records current authority and published release identities together at stable v0.7.1', async () => {
    const catalog = await buildCatalog();
    expect(catalog.gameVersion).toBe(currentGame.version);
    expect(catalog.release.sourceVersion).toBe(currentGame.version);
    expect(catalog.release.canonicalDataVersion).toBe(currentGame.version);
    expect(catalog.release.publishedVersion).toBe('v0.7.1');
    expect(catalog.release).not.toHaveProperty('ttsReleaseTargetSource');
  });
});
