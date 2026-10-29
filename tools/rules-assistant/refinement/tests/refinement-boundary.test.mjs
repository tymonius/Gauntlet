import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const suites=[
  "refinement-current-validity.test.mjs",
  "refinement-filter-order.test.mjs",
  "refinement-loop.test.mjs",
  "refinement-resolution-ledger.test.mjs",
  "refinement-scaffold.test.mjs",
  "refinement-snapshot.test.mjs",
  "refinement-triage.test.mjs"
];
describe('Rules Assistant refinement test boundary', () => {
  it('retains tests beside the maintained refinement modules', () => {
    const root=readdirSync('rules-assistant');
    const tooling=readdirSync('tools/rules-assistant/refinement/tests');
    for(const suite of suites){expect(root).not.toContain(suite); expect(tooling).toContain(suite);}
  });
  it('retains explicit historical CI coverage', () => {
    const workflow=readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(workflow).toContain('tools/rules-assistant/refinement/tests/**');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/refinement/tests/*.test.mjs');
  });
});
