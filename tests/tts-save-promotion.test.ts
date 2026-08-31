import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REQUIRED_QA_CHECKS, promoteSaveIdentity, validatePromotionGate, validateQaRecordShape } from '../scripts/promote-tts-save.mjs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const qa = JSON.parse(readFileSync('tts/release-qa/v0.7.0.json', 'utf8'));
const release = { version: 'v0.7.0' };
const v071Qa = JSON.parse(readFileSync('tts/release-qa/v0.7.1.json', 'utf8'));
const ttsWorkflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');

function completedQa(overrides = {}) {
  return {
    ...qa,
    status: 'passed',
    checks: Object.fromEntries(Object.entries(REQUIRED_QA_CHECKS).map(([group, checks]) => [
      group,
      Object.fromEntries(checks.map((check) => [check, true])),
    ])),
    approvedForWorkshop: true,
    ...overrides,
  };
}

describe('TTS final save promotion', () => {
  it('keeps promotion explicit and outside ordinary package generation', () => {
    expect(packageJson.scripts['tts:save:promote']).toBe('node scripts/promote-tts-save.mjs');
    expect(packageJson.scripts['tts:package']).not.toContain('tts:save:promote');
    expect(packageJson.scripts['tts:check']).toContain('node --check scripts/promote-tts-save.mjs');
    expect(packageJson.scripts['tts:check']).not.toContain('promote-tts-save.mjs --check');
  });

  it('tracks the passed and explicitly Workshop-approved v0.7.0 manual-QA record', () => {
    expect(qa).toEqual(expect.objectContaining({
      schemaVersion: 3,
      gameVersion: 'v0.7.0',
      status: 'passed',
      approvedForWorkshop: true,
    }));
    expect(() => validateQaRecordShape(qa)).not.toThrow();

    const expectedGroups = Object.keys(REQUIRED_QA_CHECKS);
    expect(Object.keys(qa.checks)).toEqual(expectedGroups);
    for (const [group, checks] of Object.entries(REQUIRED_QA_CHECKS)) {
      expect(Object.keys(qa.checks[group])).toEqual([...checks]);
    }
    expect(Object.values(REQUIRED_QA_CHECKS).flat()).toHaveLength(18);
    expect(qa.checks.fullGame).toBeUndefined();
    expect(Object.values(qa.checks.tableSetup).every((value) => value === true)).toBe(true);
    expect(Object.values(qa.checks.factionComponents).every((value) => value === true)).toBe(true);
    expect(Object.values(qa.checks.handlingValidation).every((value) => value === true)).toBe(true);
    expect(qa.notes.some((note) => /hosted gauntlet\.run/i.test(note))).toBe(true);
    expect(qa.notes.some((note) => /White\/Green perspectives/i.test(note))).toBe(true);
    expect(qa.notes.some((note) => /All nine faction-component QA checks passed/i.test(note))).toBe(true);
    expect(qa.notes.some((note) => /Focused handling validation passed/i.test(note))).toBe(true);
    expect(qa.notes.some((note) => /remote two-player game is not required/i.test(note))).toBe(true);
    expect(qa.notes.some((note) => /Workshop promotion explicitly approved/i.test(note))).toBe(true);
  });

  it('refuses promotion while machine readiness still has blockers', () => {
    expect(() => validatePromotionGate({
      release,
      readiness: { gameVersion: 'v0.7.0', machineReady: false, blockers: [{ id: 'universal-reference' }] },
      qa: completedQa(),
    })).toThrow(/universal-reference/);
  });

  it('refuses promotion at the first incomplete granular QA check', () => {
    const readiness = { gameVersion: 'v0.7.0', machineReady: true, blockers: [] };

    const almostComplete = completedQa();
    almostComplete.checks.handlingValidation.coreHandlingExercised = false;
    expect(() => validatePromotionGate({ release, readiness, qa: almostComplete }))
      .toThrow(/handlingValidation\.coreHandlingExercised/);

    almostComplete.checks.handlingValidation.coreHandlingExercised = true;
    almostComplete.checks.factionComponents.intelligenceNestedOperationStack = false;
    expect(() => validatePromotionGate({ release, readiness, qa: almostComplete }))
      .toThrow(/factionComponents\.intelligenceNestedOperationStack/);
  });

  it('still requires explicit Workshop approval after all manual checks pass', () => {
    const readiness = { gameVersion: 'v0.7.0', machineReady: true, blockers: [] };
    expect(() => validatePromotionGate({
      release,
      readiness,
      qa: completedQa({ approvedForWorkshop: false }),
    })).toThrow(/not approved for Workshop/);
  });

  it('opens the current v0.7.0 promotion gate after explicit approval', () => {
    expect(() => validatePromotionGate({
      release,
      readiness: { gameVersion: 'v0.7.0', machineReady: true, blockers: [] },
      qa,
    })).not.toThrow();
  });

  it('allows promotion only after machine readiness and every granular manual QA check pass', () => {
    const result = validatePromotionGate({
      release,
      readiness: { gameVersion: 'v0.7.0', machineReady: true, blockers: [] },
      qa: completedQa(),
    });
    expect(result.version).toBe('v0.7.0');
    expect(result.checks).toEqual(Object.fromEntries(Object.entries(REQUIRED_QA_CHECKS).map(([group, checks]) => [group, [...checks]])));
  });

  it('opens the stable v0.7.1 promotion gate after explicit manual approval', () => {
    expect(v071Qa).toEqual(expect.objectContaining({
      schemaVersion: 3,
      gameVersion: 'v0.7.1',
      status: 'passed',
      approvedForWorkshop: true,
    }));
    expect(() => validateQaRecordShape(v071Qa)).not.toThrow();
    expect(() => validatePromotionGate({
      release: { version: 'v0.7.1' },
      readiness: { gameVersion: 'v0.7.1', machineReady: true, blockers: [] },
      qa: v071Qa,
    })).not.toThrow();
  });

  it('automates strict v0.7.1 promotion and release upload only from main push', () => {
    expect(ttsWorkflow).toContain("tts/release-qa/v0.7.1.json");
    expect(ttsWorkflow).toContain("npm run tts:release:strict");
    expect(ttsWorkflow).toContain("npm run tts:save:promote");
    expect(ttsWorkflow).toContain("github.event_name == 'push'");
    expect(ttsWorkflow).toContain('Gauntlet_${tag}_TTS_Mod.json');
    expect(ttsWorkflow).toContain('Gauntlet_v0.7.1_TTS_Mod.json');
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
