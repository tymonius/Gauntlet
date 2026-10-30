import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const suites = [
  "admin-import-page.test.mjs",
  "admin-incremental-export-page.test.mjs",
  "admin-intelligence-page.test.mjs",
  "admin-refinement-worker.test.mjs",
  "admin-runtime-execution.test.mjs",
  "admin-scaffold-page.test.mjs",
  "admin-triage-page.test.mjs",
  "review-export-checkpoint.test.mjs",
  "review-export-scope.test.mjs",
  "review-intelligence.test.mjs"
];
describe('Rules Assistant admin test boundary', () => {
  it('keeps admin suites beside the maintained admin source', () => {
    const backend = readdirSync('rules-assistant');
    const admin = readdirSync('tools/rules-assistant/admin/tests');
    for (const file of suites) { expect(backend).not.toContain(file); expect(admin).toContain(file); }
  });
  it('keeps admin tests in the historical regression workflow', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('tools/rules-assistant/admin/tests/**');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/admin/tests/*.test.mjs');
  });
});
