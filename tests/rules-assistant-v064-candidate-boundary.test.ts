import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Arbiter v064 historical candidate boundary', () => {
  it('archives the superseded candidate source', () => {
    expect(readdirSync('legacy/rules-assistant/v064')).toContain('v064-candidate-corpus.js');
    expect(readdirSync('rules-assistant')).not.toContain('v064-candidate-corpus.js');
  });

  it('retains historical v063 corpus dependency and candidate regression imports', () => {
    const source = readFileSync('legacy/rules-assistant/v064/v064-candidate-corpus.js', 'utf8');
    expect(source).toContain('../v063/v063-public-corpus.js');
    for (const path of ['tests/v064-rules-arbiter-proposals.test.ts', 'tests/v064-rules-arbiter-territories.test.ts']) {
      expect(readFileSync(path, 'utf8')).toContain('../legacy/rules-assistant/v064/v064-candidate-corpus.js');
    }
  });
});
