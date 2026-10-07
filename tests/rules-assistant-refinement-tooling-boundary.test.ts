import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const refinementSources = [
  'refinement-current-validity.js',
  'refinement-resolution-ledger.js',
  'refinement-scaffold.js',
  'refinement-snapshot.js',
  'refinement-triage.js',
];

describe('Rules Assistant refinement tooling boundary', () => {
  it('owns refinement implementation under tools instead of the backend root', () => {
    for (const file of refinementSources) {
      expect(existsSync(`tools/rules-assistant/refinement/${file}`), file).toBe(true);
      expect(existsSync(`rules-assistant/${file}`), file).toBe(false);
    }
  });

  it('keeps the deployed wrapper and repository scripts pointed at maintained refinement tooling', () => {
    const worker = read('rules-assistant/admin-refinement-worker.js');
    const scaffold = read('scripts/scaffold-rules-refinement-pr.mjs');
    const snapshot = read('scripts/build-rules-refinement-snapshot.mjs');

    expect(worker).toContain('../tools/rules-assistant/refinement/refinement-triage.js');
    expect(worker).toContain('../tools/rules-assistant/refinement/refinement-scaffold.js');
    expect(worker).toContain('../tools/rules-assistant/refinement/refinement-resolution-ledger.js');
    expect(worker).toContain('../tools/rules-assistant/refinement/refinement-current-validity.js');
    expect(scaffold).toContain('../tools/rules-assistant/refinement/refinement-scaffold.js');
    expect(snapshot).toContain('../tools/rules-assistant/refinement/refinement-snapshot.js');
  });

  it('aligns refinement artifacts and source-first authority with current repository contracts', () => {
    const scaffold = read('scripts/scaffold-rules-refinement-pr.mjs');
    const sourceFirst = read('scripts/validate-rules-refinement-source-first.mjs');

    expect(scaffold).toContain('artifacts/rules-refinement/manifests/');
    expect(scaffold).not.toContain('rules-assistant/refinement-manifests/');
    expect(sourceFirst).toContain("'packages/game-data/current-game.json'");
    expect(sourceFirst).not.toContain("'game-data/current-game.json'");
  });

  it('routes refinement-tooling changes through Worker deployment and live verification', () => {
    const deploy = read('.github/workflows/deploy-rules-arbiter.yml');
    const live = read('.github/workflows/verify-current-live-publication.yml');

    expect(deploy).toContain('"tools/rules-assistant/refinement/**"');
    expect(live).toContain("'tools/rules-assistant/refinement/**'");
    expect(live).toContain('tools/rules-assistant/refinement/*.js');
    expect(live).toContain("'tools/rules-assistant/admin/**'");
    expect(live).toContain('tools/rules-assistant/admin/*.js');
    expect(live).not.toContain('rules-assistant/refinement-*.js');
    expect(live).not.toContain('rules-assistant/review-*.js');
  });
});
