import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const suites=[
  "qa-semantic-evaluator-v2.test.mjs",
  "qa-semantic-evaluator.test.mjs",
  "blind-benchmark-fixes.test.mjs",
  "blind-v2-fixes.test.mjs",
  "blind-v2-model-packets.test.mjs",
  "final-benchmark-fixes.test.mjs",
  "fallback-source-lookup-regression.test.mjs"
];
describe('Rules Assistant semantic and benchmark QA boundary',()=>{
  it('retains old benchmark and semantic regression tests outside backend source',()=>{
    const qa=readdirSync('tools/rules-assistant/qa/tests');
    const backend=readdirSync('rules-assistant');
    for(const name of suites){expect(qa).toContain(name);expect(backend).not.toContain(name);}
  });
  it('preserves historical QA coverage',()=>{
    const workflow=readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
