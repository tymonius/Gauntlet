import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Assistant historical v071 suite boundary', () => {
  it('keeps all v071 test-only suites out of the active Rules Assistant backend', () => {
    const backend = readdirSync('rules-assistant');
    expect(backend.filter((file) => /^v071-.*\.test\.mjs$/.test(file))).toEqual([]);
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    expect(qa.filter((file) => /^v071-.*\.test\.mjs$/.test(file)).length).toBeGreaterThan(30);
  });
  it('runs historical QA tests separately from backend implementation tests', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
