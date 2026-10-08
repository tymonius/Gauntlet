import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowDir = '.github/workflows';
const paidWorkflowName = 'v071-rules-arbiter-live-qa.yml';
const worker = readFileSync('rules-assistant/worker-v071.js', 'utf8');
const entry = readFileSync('rules-assistant/worker-entry.js', 'utf8');
const wrangler = readFileSync('rules-assistant/wrangler.toml', 'utf8');
const migration = readFileSync('rules-assistant/migrations/0011_rules_model_usage_budget.sql', 'utf8');

describe('Rules Arbiter paid-model spend guardrails', () => {
  it('keeps every automatic workflow free of paid Rules Arbiter calls', () => {
    for (const filename of readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name))) {
      const source = readFileSync(join(workflowDir, filename), 'utf8');
      if (filename === paidWorkflowName) {
        expect(source).toContain('workflow_dispatch:');
        expect(source).not.toContain('pull_request:');
        expect(source).not.toContain('push:');
        continue;
      }

      expect(source).not.toMatch(/api\.openai\.com/i);
      expect(source).not.toMatch(/gauntlet-rules-assistant\.tymon-scott\.workers\.dev\/api\/rules/i);
      expect(source).not.toContain('run-v071-live-rules-qa.mjs');
    }
  });

  it('fails closed when the server-side model budget cannot be enforced', () => {
    expect(worker).toContain('await reserveModelRequest(request, env)');
    expect(worker).toContain('budget_store_unavailable');
    expect(worker).toContain('budget_store_error');
    expect(worker).toContain('local-budget-fallback');
    expect(worker.indexOf('await reserveModelRequest(request, env)'))
      .toBeLessThan(worker.indexOf('const modelResult = await askOpenAI'));
  });

  it('enforces per-IP, daily, and monthly hard request ceilings', () => {
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_IP_HOUR = "12"');
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_DAY = "50"');
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_MONTH = "200"');
    expect(worker).toContain('scope: "ip_hour"');
    expect(worker).toContain('scope: "global_day"');
    expect(worker).toContain('scope: "global_month"');
    expect(worker).toContain('WHERE request_count < ?');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS rules_model_usage_budget');
  });

  it('does not expose the paid model key to historical compatibility routes', () => {
    expect(entry).toContain('function withoutPaidModel(env)');
    expect(entry).toContain('OPENAI_API_KEY: undefined');
    expect(entry.match(/withoutPaidModel\(env\)/g)?.length).toBeGreaterThanOrEqual(8);
  });
});
