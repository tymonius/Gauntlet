import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));
const publicationTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const candidateQa = JSON.parse(readFileSync('tts/release-qa/v0.7.2-candidate.json', 'utf8'));

describe('v0.7.2 TTS candidate gate', () => {
  it('binds candidate QA to the frozen v0.7.2 candidate while leaving the live Workshop target on v0.7.1', () => {
    expect(currentGame.version).toBe('v0.7.2-candidate');
    expect(['active-development', 'release-candidate']).toContain(currentGame.status);
    expect(candidateQa.gameVersion).toBe(currentGame.version);
    expect(publicationTarget.releaseTag).toBe('v0.7.1');
    expect(publicationTarget.displayVersion).toBe('v0.7.1');
    expect(publicationTarget.sourceVersion).toBe('v0.7.1');
  });

  it('starts all 18 manual candidate checks incomplete and forbids Workshop promotion', () => {
    expect(candidateQa.status).toBe('in-progress');
    expect(candidateQa.approvedForWorkshop).toBe(false);

    const checks = Object.values(candidateQa.checks).flatMap((group: any) => Object.values(group));
    expect(checks).toHaveLength(18);
    expect(checks.every((value) => value === false)).toBe(true);
    expect(candidateQa.notes.some((note: string) => /public Workshop item remains on v0\.7\.1/i.test(note))).toBe(true);
    expect(candidateQa.notes.some((note: string) => /Focused v0\.7\.2 QA must exercise/i.test(note))).toBe(true);
  });
});
