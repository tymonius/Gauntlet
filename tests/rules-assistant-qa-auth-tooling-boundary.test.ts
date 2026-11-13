import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as maintained from '../tools/rules-assistant/qa/github-actions-qa-auth.js';
import * as compatibility from '../rules-assistant/github-actions-qa-auth.js';

describe('Rules Arbiter shared QA OIDC authorization source boundary', () => {
  it('forwards all security policy exports as identical objects and functions', () => {
    expect(Object.keys(compatibility).sort()).toEqual(Object.keys(maintained).sort());
    for (const [name, value] of Object.entries(maintained)) {
      expect((compatibility as Record<string, unknown>)[name]).toBe(value);
    }
    expect(compatibility.githubActionsQaAuthContract).toBe(maintained.githubActionsQaAuthContract);
  });

  it('rejects missing credentials consistently through both imports', async () => {
    const request = new Request('https://example.invalid/api/qa/semantic-evaluate');
    const [canonical, shim] = await Promise.all([
      maintained.authorizeGitHubActionsQa(request),
      compatibility.authorizeGitHubActionsQa(request),
    ]);
    expect(canonical).toEqual({ authorized: false, reason: 'qa_oidc_not_present' });
    expect(shim).toEqual(canonical);
  });

  it('retains a single authorization implementation for active Worker consumers', () => {
    const shim = readFileSync('rules-assistant/github-actions-qa-auth.js', 'utf8');
    const source = readFileSync('tools/rules-assistant/qa/github-actions-qa-auth.js', 'utf8');
    const evaluator = readFileSync('tools/rules-assistant/qa/qa-semantic-evaluator.js', 'utf8');
    expect(shim).toContain("export * from '../tools/rules-assistant/qa/github-actions-qa-auth.js'");
    expect(shim).not.toContain('function claimsAreAuthorized');
    expect(source).toContain('export function claimsAreAuthorized(');
    expect(source).toContain('export async function authorizeGitHubActionsQa(');
    expect(source).toContain('GITHUB_ACTIONS_OIDC_ISSUER');
    expect(source).toContain('QA_WORKFLOW_EVENT_NAMES');
    expect(evaluator).toContain('from "./github-actions-qa-auth.js"');
    for (const path of [
      'rules-assistant/admin-refinement-worker.js',
      'rules-assistant/worker-v072.js',
      'rules-assistant/worker-v072-candidate.js',
      'legacy/rules-assistant/v071/worker-v071.js',
    ]) {
      expect(readFileSync(path, 'utf8'), path).toContain('github-actions-qa-auth.js');
    }
  });

  it('watches canonical auth changes in every production and regression CI path', () => {
    const deploy = readFileSync('.github/workflows/deploy-rules-arbiter.yml', 'utf8');
    const live = readFileSync('.github/workflows/verify-current-live-publication.yml', 'utf8');
    const regression = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(deploy).toContain('"rules-assistant/github-actions-qa-auth.js"');
    expect(deploy).toContain('"tools/rules-assistant/qa/github-actions-qa-auth.js"');
    expect(deploy).toContain('node --check tools/rules-assistant/qa/github-actions-qa-auth.js');
    expect(live).toContain("'tools/rules-assistant/qa/github-actions-qa-auth.js'");
    expect(live).toContain('rules-assistant/github-actions-qa-auth.js|tools/rules-assistant/qa/github-actions-qa-auth.js');
    expect(regression.split("'tools/rules-assistant/qa/github-actions-qa-auth.js'").length - 1).toBe(2);
  });
});
