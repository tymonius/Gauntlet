import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v071 corpus compatibility boundary', () => {
  it('archives the frozen corpus loader outside the backend root', () => {
    expect(readdirSync('legacy/rules-assistant/v071')).toContain('v071-public-corpus.js');
    expect(readdirSync('rules-assistant')).not.toContain('v071-public-corpus.js');
  });

  it('keeps the versioned Worker and current review tooling pointed at the archived corpus', () => {
    expect(read('legacy/rules-assistant/v071/worker-v071.js')).toContain('./v071-public-corpus.js');
    expect(read('rules-assistant/v071-scope-precheck.js')).toContain('../legacy/rules-assistant/v071/v071-public-corpus.js');
    expect(read('tools/rules-assistant/admin/review-intelligence.js')).toContain('../../../legacy/rules-assistant/v071/v071-public-corpus.js');
    expect(read('tools/rules-assistant/refinement/refinement-scaffold.js')).toContain('legacy/rules-assistant/v071/v071-public-corpus.js');
  });

  it('keeps the archived loader bound to shared retrieval and frozen release artifacts', () => {
    const corpus = read('legacy/rules-assistant/v071/v071-public-corpus.js');
    expect(corpus).toContain("from '../../../rules-assistant/local-search.js'");
    expect(corpus).toContain("releases/v0.7.1/");
  });

  it('routes corpus changes through Worker deployment validation', () => {
    const workflow = read('.github/workflows/deploy-rules-arbiter.yml');
    expect(workflow).toContain('"legacy/rules-assistant/v071/v071-public-corpus.js"');
    expect(workflow).toContain('node --check legacy/rules-assistant/v071/v071-public-corpus.js');
  });
});
