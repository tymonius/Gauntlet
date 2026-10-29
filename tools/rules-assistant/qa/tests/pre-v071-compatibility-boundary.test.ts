import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const suites = [
  "rules-deterministic-v063.test.mjs",
  "v061-defenders-advantage.test.mjs",
  "v062-candidate.test.mjs",
  "v062-published-routes.test.mjs",
  "v063-development-corpus.test.mjs"
];

describe('Rules Assistant pre-v071 compatibility QA boundary', () => {
  it('keeps historical compatibility regression suites outside the backend root', () => {
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for (const file of suites) { expect(qa).toContain(file); expect(backend).not.toContain(file); }
  });
  it('continues executing relocated suites in historical CI', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
