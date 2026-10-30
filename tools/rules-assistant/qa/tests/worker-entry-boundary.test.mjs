import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const suites=[
  "worker-deployment-gate.test.mjs",
  "worker-entry-corpus-health.test.mjs",
  "worker-entry-semantic-qa.test.mjs",
  "worker-entry-theme.test.mjs",
  "worker-entry-v072-candidate.test.mjs",
  "worker-entry-v072-final.test.mjs"
];
describe('Rules Assistant Worker entrypoint/deployment test boundary', () => {
  it('keeps deployed Worker source separate from maintained Worker tests', () => {
    const qa=readdirSync('tools/rules-assistant/qa/tests');
    const backend=readdirSync('rules-assistant');
    for(const suite of suites){expect(qa).toContain(suite);expect(backend).not.toContain(suite);}
  });
  it('retains QA coverage in historical workflow', () => {
    const workflow=readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
