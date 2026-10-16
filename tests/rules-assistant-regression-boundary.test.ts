import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Assistant regression test boundary', () => {
  it('keeps the v061 baseline suites outside the production backend root', () => {
    const dest = readdirSync('tests/rules-assistant');
    const root = readdirSync('rules-assistant');
    for(const file of ['rules-evals.test.mjs','game-night-regression.test.mjs','worker.test.mjs']) {
      expect(dest).toContain(file);
      expect(root).not.toContain(file);
    }
  });

  it('keeps both test locations in historical regression validation', () => {
    const pkg = readFileSync('package.json','utf8');
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(pkg).toContain('tests/rules-assistant/*.test.mjs');
    expect(pkg).toContain('rules-assistant/*.test.mjs');
    expect(workflow).toContain("'tests/rules-assistant/**'");
  });
});
