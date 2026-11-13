import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as maintained from '../tools/rules-assistant/qa/qa-semantic-evaluator.js';
import * as compatibility from '../rules-assistant/qa-semantic-evaluator.js';

describe('Rules Arbiter semantic QA implementation boundary', () => {
  it('retains identical API exports for the deployed Worker import', () => {
    expect(Object.keys(compatibility).sort()).toEqual(Object.keys(maintained).sort());
    for (const [name, value] of Object.entries(maintained)) {
      expect((compatibility as Record<string, unknown>)[name]).toBe(value);
    }
  });

  it('keeps the semantic QA endpoint deployed and authorization sourced from the same helper', () => {
    const wrapper = readFileSync('rules-assistant/qa-semantic-evaluator.js', 'utf8');
    const implementation = readFileSync('tools/rules-assistant/qa/qa-semantic-evaluator.js', 'utf8');
    const worker = readFileSync('rules-assistant/worker-entry.js', 'utf8');
    expect(wrapper).toContain('export * from "../tools/rules-assistant/qa/qa-semantic-evaluator.js"');
    expect(wrapper).not.toContain('function handleQaSemanticEvaluation');
    expect(implementation).toContain('from "./github-actions-qa-auth.js"');
    expect(worker).toContain('import { handleQaSemanticEvaluation } from "./qa-semantic-evaluator.js"');
    expect(worker).toContain('url.pathname === "/api/qa/semantic-evaluate"');
    expect(worker).toContain('handleQaSemanticEvaluation(request, env)');
  });

  it('watches either source in deployment CI and the maintained source in regression CI', () => {
    const deploy = readFileSync('.github/workflows/deploy-rules-arbiter.yml', 'utf8');
    const regression = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(deploy).toContain('rules-assistant/qa-semantic-evaluator.js');
    expect(deploy).toContain('tools/rules-assistant/qa/qa-semantic-evaluator.js');
    expect(deploy).toContain('node --check tools/rules-assistant/qa/qa-semantic-evaluator.js');
    expect(regression).toContain("'tools/rules-assistant/qa/qa-semantic-evaluator.js'");
    expect(regression).toContain("'tools/rules-assistant/qa/tests/**'");
  });
});
