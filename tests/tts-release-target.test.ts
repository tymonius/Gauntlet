import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, resolveCurrentTtsRelease } from '../scripts/tts-current-catalog.mjs';

const target = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));

describe('TTS development and publication identity', () => {
  it('targets stable v0.7.2 publication while retaining the frozen current-game candidate authority', () => {
    expect(target.releaseTag).toBe('v0.7.2');
    expect(target.displayVersion).toBe('v0.7.2');
    expect(target.sourceVersion).toBe('v0.7.2');
    expect(target.currentGameAuthority).toBe('packages/game-data/current-game.json');
    expect(target.status).toBe('release-candidate');

    expect(currentGame.authority).toBe('current-game');
    expect(currentGame.version).toBe('v0.7.2-candidate');
    expect(currentGame.version.replace(/-candidate$/, '')).toBe(target.sourceVersion);
  });

  it('uses the aligned TTS release target for package identity without changing gameplay authority', async () => {
    const release = await resolveCurrentTtsRelease();

    expect(release.version).toBe(target.releaseTag);
    expect(release.displayVersion).toBe(target.displayVersion);
    expect(release.sourceVersion).toBe(target.sourceVersion);
    expect(release.authorityVersion).toBe(currentGame.version);
    expect(release.currentGameSource).toBe(target.currentGameAuthority);
    expect(release.targetStatus).toBe(target.status);
    expect(release.publicationTargetActive).toBe(true);
    expect(release.ttsReleaseTargetSource).toBe('config/tts-release-target.json');
    expect(release.outputRoot.replaceAll('\\', '/')).toMatch(/\/tts\/generated\/v0\.7\.2$/);
  });

  it('records stable publication and frozen authority identities explicitly in generated catalog metadata', async () => {
    const catalog = await buildCatalog();

    expect(catalog.gameVersion).toBe('v0.7.2');
    expect(catalog.release.authorityVersion).toBe('v0.7.2-candidate');
    expect(catalog.release.sourceVersion).toBe('v0.7.2');
    expect(catalog.release.canonicalDataVersion).toBe('v0.7.2');
    expect(catalog.release.publicationTargetActive).toBe(true);
    expect(catalog.release.ttsReleaseTargetSource).toBe('config/tts-release-target.json');
    expect(catalog.release.publishedVersion).toBe('v0.7.2');
  });
});
