import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v062 compatibility boundary', () => {
  it('archives the withdrawn and candidate implementations as one historical unit', () => {
    const archived = readdirSync('legacy/rules-assistant/v062');
    for (const file of [
      'worker-v062.js',
      'worker-v062-candidate.js',
      'v062-corpus.js',
      'v062-published-corpus.js',
      'rules-deterministic-v062.js',
    ]) expect(archived).toContain(file);

    const root = readdirSync('rules-assistant');
    expect(root).not.toContain('worker-v062.js');
    expect(root).not.toContain('worker-v062-candidate.js');
    expect(root).not.toContain('v062-corpus.js');
    expect(root).not.toContain('v062-published-corpus.js');
    expect(root).not.toContain('rules-deterministic-v062.js');
  });

  it('preserves explicit withdrawn and candidate routing through the current Worker entry', () => {
    const entry = read('rules-assistant/worker-entry.js');
    expect(entry).toContain('import candidateWorker from "../legacy/rules-assistant/v062/worker-v062-candidate.js";');
    expect(entry).toContain('import publishedWorker from "../legacy/rules-assistant/v062/worker-v062.js";');
    expect(entry).toContain('url.pathname === "/api/v062/rules"');
    expect(entry).toContain('url.pathname.startsWith("/api/v062-candidate/")');
  });

  it('keeps archived Workers on maintained shared runtime while retaining local v062 authorities', () => {
    const published = read('legacy/rules-assistant/v062/worker-v062.js');
    const candidate = read('legacy/rules-assistant/v062/worker-v062-candidate.js');
    expect(published).toContain('from "../../../rules-assistant/local-search.js"');
    expect(published).toContain('from "./v062-published-corpus.js"');
    expect(published).toContain('from "./rules-deterministic-v062.js"');
    expect(candidate).toContain('from "../../../rules-assistant/local-search.js"');
    expect(candidate).toContain('from "./v062-corpus.js"');
    expect(candidate).toContain('from "./rules-deterministic-v062.js"');
  });

  it('routes archived v062 changes through deployment syntax validation', () => {
    const workflow = read('.github/workflows/deploy-rules-arbiter.yml');
    expect(workflow).toContain('"legacy/rules-assistant/v062/**"');
    expect(workflow).toContain('node --check legacy/rules-assistant/v062/worker-v062.js');
    expect(workflow).toContain('node --check legacy/rules-assistant/v062/worker-v062-candidate.js');
    expect(workflow).toContain('node --check legacy/rules-assistant/v062/v062-published-corpus.js');
  });
});
