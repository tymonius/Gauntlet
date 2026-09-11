import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const entrypoint = readFileSync(new URL("./admin-refinement-worker.js", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("./wrangler.toml", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../.github/workflows/current-rules-arbiter-live-qa.yml", import.meta.url), "utf8");

describe("authorized Rules Arbiter live QA", () => {
  test("bypasses only model-budget reservations after signed QA authorization", () => {
    expect(entrypoint).toContain('import { authorizeGitHubActionsQa } from "./github-actions-qa-auth.js"');
    expect(entrypoint).toContain('const QA_BUDGET_SQL = /\\bINSERT\\s+INTO\\s+rules_model_usage_budget\\b/i;');
    expect(entrypoint).toContain('statements.every((statement) => statement?.[QA_BUDGET_STATEMENT] === true)');
    expect(entrypoint).toContain('statements.map(() => ({ meta: { changes: 1 } }))');
    expect(entrypoint).toContain('const authorization = await authorizeGitHubActionsQa(request);');
    expect(entrypoint).toContain('if (!authorization.authorized || !env?.DB) return env;');
    expect(entrypoint).toContain('const routedEnv = await envWithAuthorizedQaBudgetBypass(request, env);');
  });

  test("retains public abuse limits without a separate QA ceiling", () => {
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_IP_HOUR = "12"');
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_DAY = "50"');
    expect(wrangler).toContain('RULES_MODEL_REQUESTS_PER_MONTH = "200"');
    expect(wrangler).not.toContain("RULES_QA_MODEL_REQUESTS");
  });

  test("official live QA remains manual, paid-call confirmed, and OIDC-authenticated", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("confirm_paid_api:");
    expect(workflow).toContain('if [ "${{ inputs.confirm_paid_api }}" != "true" ]');
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("GAUNTLET_RULES_QA_USE_GITHUB_OIDC: 'true'");
  });
});
