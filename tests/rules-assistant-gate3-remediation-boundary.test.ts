import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gate3 = [
  "v071-gate3-a-regressions.test.mjs",
  "v071-gate3-b-regressions.test.mjs",
  "v071-gate3-c-worker-integration.test.mjs",
  "v071-gate3-d-remediation.test.mjs",
  "v071-gate3-d-retrieval-priority.test.mjs",
  "v071-gate3-e-remediation.test.mjs",
  "v071-gate3-f-remediation.test.mjs",
  "v071-gate3-g-remediation.test.mjs",
  "v071-gate3-h-remediation.test.mjs",
  "v071-gate3-i-remediation.test.mjs",
  "v071-gate3-j-remediation.test.mjs",
  "v071-gate3-k-remediation.test.mjs",
  "v071-gate3-l-remediation.test.mjs",
  "v071-gate3-m-remediation.test.mjs",
  "v071-gate3-n-remediation.test.mjs",
  "v071-gate3-o-remediation.test.mjs",
  "v071-gate3-p-remediation.test.mjs",
  "v071-gate3-q-remediation.test.mjs"
];

describe('Rules Assistant v071 Gate 3 remediation QA boundary', () => {
  it('keeps historical Gate 3 regressions outside the active backend root', () => {
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for (const name of gate3) {
      expect(qa).toContain(name);
      expect(backend).not.toContain(name);
    }
  });

  it('continues executing all migrated suites in historical CI', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
