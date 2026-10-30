import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const suites = [
  "github-actions-qa-auth.test.mjs",
  "local-search.test.mjs",
  "resourcefulness-copied-effect.test.mjs",
  "rules-deterministic.test.mjs",
  "rules-intelligence.test.mjs",
  "rules-persistence-contract.test.mjs",
  "rules-status.test.mjs",
  "smart-worker.test.mjs"
];
describe('Rules Assistant runtime helper QA boundary', () => {
  it('keeps maintained runtime-helper suites in test tooling rather than the Worker source root', () => {
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for (const suite of suites) { expect(qa).toContain(suite); expect(backend).not.toContain(suite); }
  });
  it('preserves historical-regression coverage for the moved suites', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
