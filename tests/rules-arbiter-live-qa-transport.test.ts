import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runner = readFileSync('scripts/run-v071-live-rules-qa.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/v071-rules-arbiter-live-qa.yml', 'utf8');

describe('v0.7.1 live Rules Arbiter QA transport handling', () => {
  it('fails fast when the production endpoint cannot pass a real rules preflight', () => {
    expect(runner).toContain('async function runInfrastructurePreflight()');
    expect(runner).toContain('benchmarkStatus: "not_run"');
    expect(runner).toContain('production endpoint failed preflight');
    expect(runner).toContain('errorCode: last?.payload?.errorCode || null');
    expect(runner).toContain('upstreamStatus: Number.isInteger(last?.payload?.upstreamStatus)');
    expect(runner).toContain('Upstream status:');
  });

  it('runs the production sweep serially with a small inter-case delay', () => {
    expect(workflow).toContain("GAUNTLET_RULES_QA_CONCURRENCY: '1'");
    expect(workflow).toContain("GAUNTLET_RULES_QA_INTER_CASE_DELAY_MS: '500'");
  });
});
