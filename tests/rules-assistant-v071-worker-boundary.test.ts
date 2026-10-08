import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v071 Worker compatibility boundary', () => {
  it('archives the v071 Worker implementation with its frozen corpus', () => {
    const archived = readdirSync('legacy/rules-assistant/v071');
    expect(archived).toContain('worker-v071.js');
    expect(archived).toContain('v071-public-corpus.js');
    expect(readdirSync('rules-assistant')).not.toContain('worker-v071.js');
  });

  it('preserves live versioned routing through the current Worker entry and scope precheck', () => {
    const entry = read('rules-assistant/worker-entry.js');
    const scope = read('rules-assistant/v071-scope-precheck.js');
    expect(entry).toContain('import worker from "../legacy/rules-assistant/v071/worker-v071.js";');
    expect(entry).toContain('url.pathname === "/api/v071/rules"');
    expect(entry).toContain('requestedVersion === "v0.7.1"');
    expect(scope).toContain('from "../legacy/rules-assistant/v071/worker-v071.js"');
  });

  it('keeps the archived Worker coupled only to maintained shared helpers and its frozen corpus', () => {
    const worker = read('legacy/rules-assistant/v071/worker-v071.js');
    expect(worker).toContain('from "../../../rules-assistant/local-search.js"');
    expect(worker).toContain('from "./v071-public-corpus.js"');
    expect(worker).toContain('from "../../../rules-assistant/rules-persistence.js"');
    expect(worker).toContain('from "../../../rules-assistant/v071-answer-verifier.js"');
  });

  it('routes archived Worker changes through deployment validation', () => {
    const deploy = read('.github/workflows/deploy-rules-arbiter.yml');
    expect(deploy).toContain('"legacy/rules-assistant/v071/worker-v071.js"');
    expect(deploy).toContain('node --check legacy/rules-assistant/v071/worker-v071.js');
  });
});
