import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as archived from '../legacy/rules-assistant/v071/v071-scope-precheck.js';
import * as compatibility from '../rules-assistant/v071-scope-precheck.js';
import worker from '../rules-assistant/admin-refinement-worker.js';

describe('historical v071 scope-precheck implementation boundary', () => {
  it('keeps the deployed compatibility import an exact re-export of the archived implementation', () => {
    expect(Object.keys(compatibility).sort()).toEqual(Object.keys(archived).sort());
    for (const [name, value] of Object.entries(archived)) {
      expect((compatibility as Record<string, unknown>)[name]).toBe(value);
    }
    const shim = readFileSync('rules-assistant/v071-scope-precheck.js', 'utf8');
    const source = readFileSync('legacy/rules-assistant/v071/v071-scope-precheck.js', 'utf8');
    expect(shim).toContain('export * from "../legacy/rules-assistant/v071/v071-scope-precheck.js"');
    expect(shim).not.toContain('function classifyV071ScopePrecheck');
    expect(source).toContain('from "./worker-v071.js"');
    expect(source).toContain('from "./v071-public-corpus.js"');
    expect(source).toContain('from "../../../rules-assistant/rules-persistence.js"');
    expect(source).toContain('from "../../../rules-assistant/rules-status.js"');
    expect(source).toContain('export async function handleV071ScopePrecheck');
  });

  it('retains the real deployed precheck for versioned requests without calling a model', async () => {
    const response = await worker.fetch(new Request('https://gauntlet-rules-assistant.example/api/rules', {
      method: 'POST',
      headers: { 'Origin': 'https://gauntlet.run', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rulesVersion: 'v0.7.1',
        sessionId: 'test-v071-scope-session',
        question: 'When is the next expansion coming?'
      })
    }), {
      ALLOWED_ORIGINS: 'https://gauntlet.run',
      OPENAI_API_KEY: 'not-for-use-in-this-test'
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version).toBe('v0.7.1');
    expect(body.rulingStatus).toBe('out_of_scope');
    expect(body.executionPath).toBe('deterministic-scope');
    expect(body.scopePrecheckRevision).toBe(archived.V071_SCOPE_PRECHECK_REVISION);
    expect(body.interactionId).toBeNull();
  });

  it('keeps exact source dependencies in protected and independent deployment paths', () => {
    const deploy = readFileSync('.github/workflows/deploy-rules-arbiter.yml', 'utf8');
    const live = readFileSync('.github/workflows/verify-current-live-publication.yml', 'utf8');
    const historical = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    for (const path of ['legacy/rules-assistant/v071/v071-scope-precheck.js', 'rules-assistant/v071-scope-precheck.js']) {
      expect(deploy, path).toContain(`"${path}"`);
      expect(deploy, path).toContain(`node --check ${path}`);
    }
    expect(deploy).toContain('tools/rules-assistant/qa/tests/v071-scope-precheck.test.mjs');
    expect(live).toContain('legacy/rules-assistant/v071/*.js');
    expect(live).toContain('rules-assistant/v071-scope-precheck.js');
    expect(live).toContain("'rules-assistant/**'");
    expect(live).toContain("'legacy/rules-assistant/**'");
    expect(historical).toContain("'legacy/rules-assistant/**'");
    expect(historical).toContain("'tools/rules-assistant/qa/tests/**'");
  });
});
