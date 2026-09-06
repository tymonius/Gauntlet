import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const releaseTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const materializer = readFileSync('.github/workflows/materialize-current-release-package.yml', 'utf8');
const releaseBuilder = readFileSync('scripts/build-v071-release-source.mjs', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardAuthorityModel = readFileSync('scripts/card-authority/model.mjs', 'utf8');
const renderedFaceValidator = readFileSync('scripts/card-authority/validate-rendered-faces.mjs', 'utf8');
const starterValidator = readFileSync('scripts/validate-starter-decks.mjs', 'utf8');
const playtestValidator = readFileSync('scripts/validate_current_playtest_sessions.py', 'utf8');
const playtestWorkflow = readFileSync('.github/workflows/deploy-playtest-sessions.yml', 'utf8');
const playtestSheetWorkflow = readFileSync('.github/workflows/render-playtest-sheet.yml', 'utf8');
const playtestReleaseResolver = readFileSync('playtest/current-release.js', 'utf8');
const playtestHostCreator = readFileSync('playtest/host/create-event.js', 'utf8');
const playtestBatchCreator = readFileSync('playtest/batch/app.js', 'utf8');

describe('development and published-release boundary', () => {
  it('keeps current release materialization lifecycle-driven while the TTS target matches the live Workshop release', () => {
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(releaseTarget.releaseTag).toBe('v0.7.1');
    expect(currentGame.version).toBe(releaseTarget.releaseTag);
    expect(materializer).toContain('pull_request:');
    expect(materializer).toContain('node scripts/render-current-rulebook-booklet.mjs');
    expect(materializer).not.toContain('node scripts/build-v071-release-source.mjs');
    expect(materializer).not.toContain('node scripts/render-v071-booklet.mjs');
    expect(materializer).toContain('git status --porcelain -- "$release_root"');
    expect(releaseBuilder).toContain('[RELEASE_VERSION, CANDIDATE_VERSION].includes(authority.version)');
    expect(releaseBuilder).toContain('repairAndValidateFrozenReleaseSources');
  });

  it('derives current TTS identity from current-game rather than the publication target', () => {
    expect(packageJson.scripts['tts:check']).not.toContain('promote-tts-save.mjs --check');
    expect(packageJson.scripts['tts:check']).toContain('node --check scripts/promote-tts-save.mjs');
    expect(ttsCatalog).not.toContain('TTS_RELEASE_TARGET_SOURCE');
    expect(ttsCatalog).toContain('version: sourceVersion');
    expect(ttsCatalog).toContain('targetStatus: String(authority.status');
  });

  it('keeps current-development validators version-agnostic', () => {
    for (const source of [cardAuthorityModel, renderedFaceValidator, starterValidator]) {
      expect(source).not.toMatch(/authority\.version\s*!==\s*['"]v\d/);
      expect(source).not.toMatch(/requires the complete v\d/);
    }
  });

  it('derives physical-face render scope from current authority rather than family-specific constants', () => {
    expect(cardAuthorityModel).toContain('expectedFaceIds(authority)');
    expect(renderedFaceValidator).toContain('resolveAllFaceSpecs(runtimeGameFromAuthority(authority))');
    expect(renderedFaceValidator).not.toContain('EXPECTED_RITES');
    expect(renderedFaceValidator).not.toContain('EXPECTED_CATALOG_COUNT');
  });

  it('validates the deployed playtest service against the lifecycle-selected current release', () => {
    expect(playtestValidator).toContain('CURRENT_VERSION = str(LIFECYCLE.get("current_release", ""))');
    expect(playtestValidator).not.toContain('current v0.7.1 playtest workflow');
    expect(playtestWorkflow).toContain('scripts/validate_current_playtest_sessions.py');
    expect(playtestWorkflow).toContain('config/release-lifecycle.json');
    expect(playtestWorkflow).not.toContain('validate_v071_playtest_sessions.py');
    expect(playtestWorkflow).toContain("expected_version = str(lifecycle.get('current_release', ''))");
    expect(playtestWorkflow).not.toContain("sessions.get('version') != 'v0.7.1'");
  });

  it('matches maintained playtest clients to lifecycle and service identity', () => {
    expect(playtestReleaseResolver).toContain('const DEFAULT_LIFECYCLE_URL = "/config/release-lifecycle.json"');
    expect(playtestReleaseResolver).toContain('health.version !== version');
    expect(playtestHostCreator).toContain('resolveCurrentPlaytestRelease(API_ORIGIN)');
    expect(playtestBatchCreator).toContain('resolveCurrentPlaytestRelease(API_ORIGIN)');
    expect(playtestHostCreator).not.toContain('CURRENT_RULES_VERSION');
    expect(playtestBatchCreator).not.toContain('rulesVersion: "v0.7.1"');
  });

  it('names printable playtest-sheet outputs from the lifecycle-selected release', () => {
    expect(playtestSheetWorkflow).toContain('config/release-lifecycle.json');
    expect(playtestSheetWorkflow).toContain('steps.release.outputs.pdf');
    expect(playtestSheetWorkflow).toContain('gauntlet-current-playtest-sheet-${{ steps.release.outputs.version }}');
    expect(playtestSheetWorkflow).not.toContain('Gauntlet_v0.7.1_Playtest_Sheet');
    expect(playtestSheetWorkflow).not.toContain('gauntlet-v071-playtest-sheet');
    expect(playtestSheetWorkflow).toContain('preview_serial=${gameSerialPrefix}-PREVIEW');
    expect(playtestSheetWorkflow).not.toContain('serial=G071-PREVIEW');
  });
});
