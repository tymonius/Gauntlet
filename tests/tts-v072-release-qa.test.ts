import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));
const publicationTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const candidateQa = JSON.parse(readFileSync('tts/release-qa/v0.7.2-candidate.json', 'utf8'));
const stableQa = JSON.parse(readFileSync('tts/release-qa/v0.7.2.json', 'utf8'));

describe('v0.7.2 TTS release QA gate', () => {
  it('preserves candidate QA provenance while opening a stable v0.7.2 Workshop gate', () => {
    expect(currentGame.version).toBe('v0.7.2-candidate');
    expect(currentGame.version.replace(/-candidate$/, '')).toBe('v0.7.2');
    expect(candidateQa.gameVersion).toBe('v0.7.2-candidate');

    expect(publicationTarget.releaseTag).toBe('v0.7.2');
    expect(publicationTarget.displayVersion).toBe('v0.7.2');
    expect(publicationTarget.sourceVersion).toBe('v0.7.2');
    expect(publicationTarget.status).toBe('release-candidate');

    expect(stableQa.gameVersion).toBe('v0.7.2');
    expect(stableQa.status).toBe('passed');
    expect(stableQa.approvedForWorkshop).toBe(true);
  });

  it('records the owner's completed 18-check manual QA and explicit Workshop approval', () => {
    const checks = Object.values(stableQa.checks).flatMap((group: any) => Object.values(group));
    expect(checks).toHaveLength(18);
    expect(checks.every((value) => value === true)).toBe(true);

    expect(stableQa.notes.some((note: string) => /stable v0\.7\.2 TTS QA/i.test(note))).toBe(true);
    expect(stableQa.notes.some((note: string) => /reader-order/i.test(note))).toBe(true);
    expect(stableQa.notes.some((note: string) => /starter/i.test(note))).toBe(true);
    expect(stableQa.notes.some((note: string) => /Workshop promotion remains blocked/i.test(note))).toBe(true);
    expect(stableQa.notes.some((note: string) => /owner explicitly confirmed completion of the full v0\.7\.2 hands-on TTS QA/i.test(note))).toBe(true);
    expect(stableQa.notes.some((note: string) => /six Faction Guides match the 2\.2× tabletop/i.test(note))).toBe(true);
  });
});
