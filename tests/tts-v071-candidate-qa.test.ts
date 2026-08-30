import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const publicationTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const qa = JSON.parse(readFileSync('tts/release-qa/v0.7.1-candidate.json', 'utf8'));

describe('v0.7.1 release / TTS QA boundary', () => {
  it('keeps development and publication identities separate', () => {
    expect(currentGame.version).toBe('v0.7.1');
    expect(currentGame.status).toBe('active-development');
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(publicationTarget.releaseTag).toBe('v0.7.0');
  });

  it('starts candidate manual QA closed to Workshop publication', () => {
    expect(qa.gameVersion).toBe('v0.7.1-candidate');
    expect(qa.status).toBe('in-progress');
    expect(qa.approvedForWorkshop).toBe(false);

    const checks = Object.values(qa.checks).flatMap((group: any) => Object.values(group));
    expect(checks).toHaveLength(18);
    expect(checks.every((value) => value === false)).toBe(true);
  });
});
