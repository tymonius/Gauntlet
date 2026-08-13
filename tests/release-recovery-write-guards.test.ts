import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

function run(script: string, args: string[] = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('withdrawn release write guards', () => {
  test.each([
    ['central writable gate', 'scripts/assert-release-writable.mjs', ['v0.6.2']],
    ['public synchronizer', 'scripts/synchronize-v062-public-site.mjs', []],
    ['print synchronizer', 'scripts/synchronize-v062-print-release.mjs', []],
    ['release runner', 'scripts/build-v062-release-runner.mjs', []],
    ['print HTML generator', 'scripts/build-v062-print-html.mjs', []],
    ['PDF renderer', 'scripts/render-v062-print-package.mjs', []],
    ['canonical-data writer', 'scripts/generate-v062-canonical-data.mjs', ['--write']],
  ])('%s refuses to write v0.6.2', (_label, script, args) => {
    const result = run(script, args as string[]);
    expect(result.status).toBe(2);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/withdrawn/i);
  });

  test.each([
    ['public synchronization check', 'scripts/synchronize-v062-public-site.mjs', ['--check']],
    ['print synchronization check', 'scripts/synchronize-v062-print-release.mjs', ['--check']],
    ['release runner check', 'scripts/build-v062-release-runner.mjs', ['--check']],
    ['print HTML check', 'scripts/build-v062-print-html.mjs', ['--check']],
    ['published-release validator', 'scripts/validate-v062-published-release.mjs', []],
    ['print-package validator', 'scripts/validate-v062-print-package.mjs', []],
  ])('%s remains read-only and valid during withdrawal', (_label, script, args) => {
    const result = run(script, args as string[]);
    expect(result.status).toBe(0);
  });
});
