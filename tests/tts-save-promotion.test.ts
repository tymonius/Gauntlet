import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { promoteSaveIdentity, validatePromotionGate } from '../scripts/promote-tts-save.mjs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const qa = JSON.parse(readFileSync('tts/release-qa/v0.7.0.json', 'utf8'));
const release = { version: 'v0.7.0' };

describe('TTS final save promotion', () => {
  it('keeps promotion explicit and outside ordinary package generation', () => {
    expect(packageJson.scripts['tts:save:promote']).toBe('node scripts/promote-tts-save.mjs');
    expect(packageJson.scripts['tts:package']).not.toContain('tts:save:promote');
    expect(packageJson.scripts['tts:check']).toContain('promote-tts-save.mjs --check');
  });

  it('ships a pending v0.7.0 manual-QA record rather than pre-approving Workshop publication', () => {
    expect(qa).toEqual(expect.objectContaining({
      schemaVersion: 1,
      gameVersion: 'v0.7.0',
      status: 'pending',
      approvedForWorkshop: false,
    }));
    expect(qa.checks).toEqual({ tableSetup: false, factionComponents: false, fullGame: false });
  });

  it('refuses promotion while machine readiness still has blockers', () => {
    expect(() => validatePromotionGate({
      release,
      readiness: { gameVersion: 'v0.7.0', machineReady: false, blockers: [{ id: 'universal-reference' }] },
      qa: { ...qa, checks: { tableSetup: true, factionComponents: true, fullGame: true }, approvedForWorkshop: true },
    })).toThrow(/universal-reference/);
  });

  it('refuses promotion until every manual QA category and Workshop approval are explicit', () => {
    const readiness = { gameVersion: 'v0.7.0', machineReady: true, blockers: [] };
    expect(() => validatePromotionGate({ release, readiness, qa })).toThrow(/tableSetup/);

    const completedChecks = { ...qa, checks: { tableSetup: true, factionComponents: true, fullGame: true } };
    expect(() => validatePromotionGate({ release, readiness, qa: completedChecks })).toThrow(/not approved for Workshop/);
  });

  it('allows promotion only after machine readiness and manual QA both pass', () => {
    const result = validatePromotionGate({
      release,
      readiness: { gameVersion: 'v0.7.0', machineReady: true, blockers: [] },
      qa: {
        ...qa,
        status: 'passed',
        checks: { tableSetup: true, factionComponents: true, fullGame: true },
        approvedForWorkshop: true,
      },
    });
    expect(result).toEqual({ version: 'v0.7.0', checks: ['tableSetup', 'factionComponents', 'fullGame'] });
  });

  it('creates final mod identity without mutating the preserved review scaffold', () => {
    const review = {
      SaveName: 'Gauntlet v0.7.0 — TTS Review Scaffold',
      Note: 'Gauntlet v0.7.0 Tabletop Simulator review scaffold.\n\nReview scaffold instructions.',
      Rules: 'Gauntlet v0.7.0 Tabletop Simulator review scaffold.',
    };
    const promoted = promoteSaveIdentity(review, 'v0.7.0');

    expect(promoted.SaveName).toBe('Gauntlet v0.7.0');
    expect(promoted.Note).toContain('Gauntlet v0.7.0 Tabletop Simulator mod.');
    expect(promoted.Note).not.toMatch(/review scaffold/i);
    expect(promoted.Rules).not.toMatch(/review scaffold/i);
    expect(review.SaveName).toContain('Review Scaffold');
  });
});
