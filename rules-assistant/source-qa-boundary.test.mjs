import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quarantined = [
  'busy-focus-accessibility.test.mjs',
  'reliable-worker.test.mjs',
  'v071-corpus-sync-guard.test.mjs',
  'widget-accessibility.test.mjs',
].sort();

describe('Rules Assistant backend source and QA boundary', () => {
  it('keeps just the one maintained boundary test beside Worker source', () => {
    const current = readdirSync('rules-assistant').filter(name => name.endsWith('.test.mjs')).sort();
    expect(current).toEqual(['source-qa-boundary.test.mjs', ...quarantined].sort());
  });
  it('keeps every historical exception quarantined and moved QA in the history runner', () => {
    const manifest = JSON.parse(readFileSync('tests/vitest-quarantine.json', 'utf8'));
    const entries = manifest.groups.flatMap(group => group.files);
    for (const name of quarantined) expect(entries).toContain('rules-assistant/' + name);
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npm run test:rules-assistant');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
