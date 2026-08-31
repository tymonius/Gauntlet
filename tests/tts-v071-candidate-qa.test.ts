import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const publicationTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const candidateQa = JSON.parse(readFileSync('tts/release-qa/v0.7.1-candidate.json', 'utf8'));
const stableQa = JSON.parse(readFileSync('tts/release-qa/v0.7.1.json', 'utf8'));

describe('v0.7.1 release / TTS QA boundary', () => {
  it('aligns the stable TTS publication target with the current v0.7.1 release', () => {
    expect(currentGame.version).toBe('v0.7.1');
    expect(currentGame.status).toBe('current-release');
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(publicationTarget.releaseTag).toBe('v0.7.1');
    expect(publicationTarget.displayVersion).toBe('v0.7.1');
    expect(publicationTarget.sourceVersion).toBe('v0.7.1');
  });

  it('preserves the candidate QA record as historical pre-release evidence', () => {
    expect(candidateQa.gameVersion).toBe('v0.7.1-candidate');
    expect(candidateQa.status).toBe('in-progress');
    expect(candidateQa.approvedForWorkshop).toBe(false);

    const checks = Object.values(candidateQa.checks).flatMap((group: any) => Object.values(group));
    expect(checks).toHaveLength(18);
    expect(checks.every((value) => value === false)).toBe(true);
  });

  it('records stable v0.7.1 manual QA as passed and explicitly Workshop-approved', () => {
    expect(stableQa.gameVersion).toBe('v0.7.1');
    expect(stableQa.status).toBe('passed');
    expect(stableQa.approvedForWorkshop).toBe(true);

    const checks = Object.values(stableQa.checks).flatMap((group: any) => Object.values(group));
    expect(checks).toHaveLength(18);
    expect(checks.every((value) => value === true)).toBe(true);
    expect(stableQa.notes.some((note: string) => /Workshop promotion explicitly approved/i.test(note))).toBe(true);
  });
});
