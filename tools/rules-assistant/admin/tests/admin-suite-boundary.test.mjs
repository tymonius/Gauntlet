import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const suites = [
  "admin-import-page.test.mjs",
  "admin-incremental-export-page.test.mjs",
  "admin-intelligence-page.test.mjs",
  "admin-refinement-worker.test.mjs",
  "admin-runtime-execution.test.mjs",
  "admin-scaffold-page.test.mjs",
  "admin-triage-page.test.mjs"
];
describe('Rules Assistant admin test boundary', () => {
  it('keeps admin suites beside the maintained admin source', () => {
    const backend = readdirSync('rules-assistant');
    const admin = readdirSync('tools/rules-assistant/admin/tests');
    for (const file of suites) { expect(backend).not.toContain(file); expect(admin).toContain(file); }
  });
  it('keeps admin tests in the Rules Assistant command and CI watch', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts['test:rules-assistant']).toContain('tools/rules-assistant/admin/tests/*.test.mjs');
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('tools/rules-assistant/admin/tests/**');
  });
});
