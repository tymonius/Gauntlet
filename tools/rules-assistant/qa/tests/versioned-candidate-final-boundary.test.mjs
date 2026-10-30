import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const suites=[
  "v072-candidate-corpus.test.mjs",
  "v072-candidate-polarity-probe.test.mjs",
  "v072-candidate-regression-replay.test.mjs",
  "v072-final-worker-port.test.mjs",
  "v072-leveraged-buyout-authority.test.mjs",
  "v072-r33-worker-port.test.mjs",
  "v072-voice-smoke-citation-corrections.test.mjs",
  "v072-voice-smoke-report.test.mjs"
];
describe('Rules Assistant candidate/final regression QA boundary',()=>{
  it('keeps the versioned QA suites out of the Worker implementation root',()=>{
    const qa=readdirSync('tools/rules-assistant/qa/tests');
    const backend=readdirSync('rules-assistant');
    for(const suite of suites){expect(qa).toContain(suite);expect(backend).not.toContain(suite);}
  });
  it('retains the historical-regression test wildcard',()=>{
    const workflow=readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
