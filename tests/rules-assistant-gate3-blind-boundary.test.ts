import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Assistant Gate 3 blind QA boundary', () => {
  it('retains historical blind regression suites only under QA tooling', () => {
    const archived = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for(const file of ["v071-gate3-blind-a.test.mjs","v071-gate3-blind-b.test.mjs","v071-gate3-blind-c.test.mjs","v071-gate3-blind-d.test.mjs","v071-gate3-blind-e.test.mjs","v071-gate3-blind-f.test.mjs","v071-gate3-blind-g.test.mjs","v071-gate3-blind-h.test.mjs","v071-gate3-blind-i.test.mjs","v071-gate3-blind-j.test.mjs","v071-gate3-blind-s.test.mjs","v071-gate3-blind-t.test.mjs","v071-gate3-blind-u.test.mjs","v071-gate3-blind-v.test.mjs"]) {
      expect(archived).toContain(file);
      expect(backend).not.toContain(file);
    }
  });

  it('keeps historical-regression execution coverage for QA tests', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml','utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
