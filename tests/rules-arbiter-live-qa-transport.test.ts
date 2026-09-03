import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runner = readFileSync('scripts/run-v071-live-rules-qa.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/v071-rules-arbiter-live-qa.yml', 'utf8');

describe('v0.7.1 live Rules Arbiter QA transport handling', () => {
  it('uses the first bounded QA case as the production preflight', () => {
    expect(runner).toContain('async function runInfrastructurePreflight()');
    expect(runner).toContain('benchmarkStatus: "not_run"');
    expect(runner).toContain('const result = await postCase(benchmarkCases[0], 0)');
    expect(runner).toContain('const results = [preflight.result, ...remainingResults]');
    expect(runner).toContain('production endpoint failed preflight');
    expect(runner).toContain('errorCode: result.payload?.errorCode || null');
    expect(runner).toContain('upstreamStatus: Number.isInteger(result.payload?.upstreamStatus)');
    expect(runner).toContain('upstreamCategory: result.payload?.upstreamCategory || null');
    expect(runner).toContain('Upstream status:');
    expect(runner).toContain('Upstream category:');
  });

  it('requires explicit manual confirmation before making paid API calls', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toContain('push:');
    expect(workflow).toContain('confirm_paid_api:');
    expect(workflow).toContain('I understand this workflow makes paid OpenAI API calls');
  });

  it('defaults manual QA to a bounded smoke scope and serial execution', () => {
    expect(workflow).toContain('default: smoke');
    expect(workflow).toContain('GAUNTLET_RULES_QA_LIMIT=10');
    expect(workflow).toContain('GAUNTLET_RULES_QA_LIMIT=0');
    expect(workflow).toContain("GAUNTLET_RULES_QA_CONCURRENCY: '1'");
    expect(workflow).toContain("GAUNTLET_RULES_QA_MAX_ATTEMPTS: '2'");
    expect(workflow).toContain("GAUNTLET_RULES_QA_INTER_CASE_DELAY_MS: '750'");
    expect(runner).toContain('const benchmarkCases = caseLimit ? benchmark.cases.slice(0, caseLimit) : benchmark.cases');
    expect(runner.match(/question: item\.question/g)?.length).toBe(1);
  });
});
