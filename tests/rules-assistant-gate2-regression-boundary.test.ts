import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const suites = [
  'v071-gate2-live-regressions.test.mjs',
  'v071-gate2-r6-regressions.test.mjs',
  'v071-gate2-r7-combined-authority.test.mjs',
  'v071-gate2-r8-conflict-discipline.test.mjs',
];

describe('Rules Assistant historical Gate 2 QA boundary', () => {
  it('keeps Gate 2 v071 regressions under QA tooling, not the active backend', () => {
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for (const name of suites) {
      expect(qa).toContain(name);
      expect(backend).not.toContain(name);
    }
  });

  it('continues running migrated QA regression suites in CI', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
