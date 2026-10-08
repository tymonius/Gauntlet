import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v063 candidate boundary', () => {
  it('co-locates the superseded candidate stack with archived v063 source', () => {
    const archived = readdirSync('legacy/rules-assistant/v063');
    for (const file of [
      'worker-v063-candidate.js',
      'v063-development-corpus.js',
      'rules-deterministic-v063.js',
      'worker-entry-v063-candidate.js',
      'wrangler-v063-candidate.toml',
    ]) expect(archived).toContain(file);

    const root = readdirSync('rules-assistant');
    expect(root).not.toContain('worker-v063-candidate.js');
    expect(root).not.toContain('v063-development-corpus.js');
    expect(root).not.toContain('rules-deterministic-v063.js');
    expect(root).not.toContain('worker-entry-v063-candidate.js');
    expect(root).not.toContain('wrangler-v063-candidate.toml');
  });

  it('keeps candidate-only modules local while using maintained shared retrieval support', () => {
    const worker = read('legacy/rules-assistant/v063/worker-v063-candidate.js');
    const corpus = read('legacy/rules-assistant/v063/v063-development-corpus.js');
    expect(worker).toContain('from "../../../rules-assistant/local-search.js"');
    expect(worker).toContain('from "./v063-development-corpus.js"');
    expect(worker).toContain('from "./rules-deterministic-v063.js"');
    expect(corpus).toContain('from "../../../rules-assistant/local-search.js"');
  });

  it('preserves the candidate deployment entrypoint/config as historical source', () => {
    const entry = read('legacy/rules-assistant/v063/worker-entry-v063-candidate.js');
    const wrangler = read('legacy/rules-assistant/v063/wrangler-v063-candidate.toml');
    expect(entry).toContain('from "./worker-v063-candidate.js"');
    expect(wrangler).toContain('main = "worker-entry-v063-candidate.js"');
  });

  it('keeps v063 language validation watching archived candidate behavior inputs', () => {
    const workflow = read('.github/workflows/validate-v063-last-stand-language.yml');
    expect(workflow).toContain('"legacy/rules-assistant/v063/**"');
    expect(workflow).toContain('legacy/rules-assistant/v063/rules-deterministic-v063.js');
  });
});
