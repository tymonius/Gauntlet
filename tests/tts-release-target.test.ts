import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';

const target = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));

describe('TTS development and publication identity', () => {
  it('tracks the live stable v0.7.1 Workshop target independently from active development', () => {
    expect(target.releaseTag).toBe('v0.7.1');
    expect(target.displayVersion).toBe('v0.7.1');
    expect(target.sourceVersion).toBe('v0.7.1');
    expect(currentGame.status).toBe('active-development');
    expect(currentGame.version).not.toBe(target.sourceVersion);
  });

  it('derives current TTS identity directly from current-game', async () => {
    const release = await resolveCurrentTtsRelease();
    expect(release.version).toBe(currentGame.version);
    expect(release.displayVersion).toBe(currentGame.displayVersion);
    expect(release.sourceVersion).toBe(currentGame.version);
    expect(release.targetStatus).toBe(currentGame.status);
    expect(release.outputRoot.replaceAll('\\', '/')).toMatch(new RegExp(`/tts/generated/${currentGame.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    expect(release).not.toHaveProperty('ttsReleaseTargetSource');
  });

  it('records current authority and published release identities explicitly', async () => {
    const catalog = await buildCatalog();
    expect(catalog.gameVersion).toBe(currentGame.version);
    expect(catalog.release.sourceVersion).toBe(currentGame.version);
    expect(catalog.release.canonicalDataVersion).toBe(currentGame.version);
    expect(catalog.release.publishedVersion).toBe('v0.7.1');
    expect(catalog.release).not.toHaveProperty('ttsReleaseTargetSource');
  });
});
