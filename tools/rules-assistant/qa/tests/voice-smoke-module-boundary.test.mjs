import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Assistant QA-only voice smoke validator boundary', () => {
  it('places manual smoke validation under QA tooling, not Worker source', () => {
    expect(existsSync('tools/rules-assistant/qa/v072-voice-smoke-report.js')).toBe(true);
    expect(existsSync('rules-assistant/v072-voice-smoke-report.js')).toBe(false);
  });
  it('keeps the manual live-QA script and workflow on the same implementation', () => {
    const script=readFileSync('scripts/run-v072-live-rules-qa.mjs','utf8');
    const workflow=readFileSync('.github/workflows/current-rules-arbiter-live-qa.yml','utf8');
    const test=readFileSync('tools/rules-assistant/qa/tests/v072-voice-smoke-report.test.mjs','utf8');
    expect(script).toContain('../tools/rules-assistant/qa/v072-voice-smoke-report.js');
    expect(workflow).toContain('./tools/rules-assistant/qa/v072-voice-smoke-report.js');
    expect(test).toContain('../v072-voice-smoke-report.js');
  });
});
