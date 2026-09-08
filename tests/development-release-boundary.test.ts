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
});
