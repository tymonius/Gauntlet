import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const releaseTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const materializer = readFileSync('.github/workflows/materialize-current-release-package.yml', 'utf8');
const currentBookletWorkflow = readFileSync('.github/workflows/build-current-rulebook-booklet.yml', 'utf8');
const currentBookletRouter = readFileSync('scripts/render-current-rulebook-booklet.mjs', 'utf8');
const releaseBuilder = readFileSync('scripts/build-v071-release-source.mjs', 'utf8');
const ttsCatalog = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardAuthorityModel = readFileSync('scripts/card-authority/model.mjs', 'utf8');
const renderedFaceValidator = readFileSync('scripts/card-authority/validate-rendered-faces.mjs', 'utf8');
const starterValidator = readFileSync('scripts/validate-starter-decks.mjs', 'utf8');
const playtestValidator = readFileSync('scripts/validate_current_playtest_sessions.py', 'utf8');
const playtestWorkflow = readFileSync('.github/workflows/deploy-playtest-sessions.yml', 'utf8');
const playtestSheetWorkflow = readFileSync('.github/workflows/render-playtest-sheet.yml', 'utf8');
const playtestCurrentRelease = readFileSync('apps/playtest/current-release.js', 'utf8');
const playtestHost = readFileSync('apps/playtest/host/create-event.js', 'utf8');
const playtestBatch = readFileSync('apps/playtest/batch/app.js', 'utf8');

describe('development and published-release boundary', () => {
  it('keeps the published release frozen while active development may advance independently', () => {
    const release = lifecycle.releases[lifecycle.current_release];
    const plan = JSON.parse(execFileSync(process.execPath, ['scripts/render-current-rulebook-booklet.mjs', '--plan'], { encoding: 'utf8' }));

    expect(releaseTarget.releaseTag).toBe(lifecycle.current_release);
    expect(release.status).toBe('current');
    expect(release.public_cutover).toBe(true);
    expect(release.publication.source_builder).toBe('scripts/build-v071-release-source.mjs');
    expect(release.publication.rulebook_booklet_renderer).toBe('scripts/render-v071-booklet.mjs');

    expect(currentGame.status).toBe('active-development');
    expect(currentGame.version).not.toBe(lifecycle.current_release);
    expect(plan).toMatchObject({
      version: lifecycle.current_release,
      authorityVersion: currentGame.version,
      authorityStatus: currentGame.status,
      materializationEligible: false,
    });

    expect(materializer).toContain('node scripts/render-current-rulebook-booklet.mjs --plan');
    expect(materializer).toContain("steps.plan.outputs.eligible == 'true'");
    expect(materializer).toContain('frozen; regeneration and writes are disabled');
    expect(materializer).not.toContain('node scripts/build-v071-release-source.mjs');
    expect(materializer).not.toContain('node scripts/render-v071-booklet.mjs');
    expect(currentBookletWorkflow).toContain("inputs.publish && steps.plan.outputs.eligible != 'true'");
    expect(currentBookletRouter).toContain("authorityVersion === version && authorityStatus === 'current-release'");
    expect(currentBookletRouter).toContain('refusing to rebuild frozen');
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
    expect(playtestWorkflow).toContain("expected_version = str(lifecycle.get('current_release', ''))");
    expect(playtestWorkflow).not.toContain('validate_v071_playtest_sessions.py');
  });

  it('names printable playtest-sheet outputs from the lifecycle-selected release', () => {
    expect(playtestSheetWorkflow).toContain('config/release-lifecycle.json');
    expect(playtestSheetWorkflow).toContain('apps/playtest/Gauntlet_${version}_Playtest_Sheet.pdf');
    expect(playtestSheetWorkflow).toContain('steps.release.outputs.pdf');
    expect(playtestSheetWorkflow).toContain('gauntlet-current-playtest-sheet-${{ steps.release.outputs.version }}');
    expect(playtestSheetWorkflow).not.toContain('Gauntlet_v0.7.1_Playtest_Sheet');
    expect(playtestSheetWorkflow).not.toContain('gauntlet-v071-playtest-sheet');
  });

  it('keeps maintained playtest clients on one current-release resolver', () => {
    expect(packageJson.scripts['test:playtest-sessions']).toContain('apps/playtest/current-release.test.mjs');
    expect(playtestCurrentRelease).toContain('DEFAULT_LIFECYCLE_URL = "/config/release-lifecycle.json"');
    expect(playtestCurrentRelease).toContain('health.version !== version');
    for (const caller of [playtestHost, playtestBatch]) {
      expect(caller).toContain('resolveCurrentPlaytestRelease');
      expect(caller).not.toContain('v0.7.1');
    }
    expect(playtestBatch).toContain('gauntlet-${batchMetadata.rulesVersion}-playtest-batch-${label}.json');
  });
});
