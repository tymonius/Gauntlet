import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_TRIAGE, enhanceRulesTriageAdmin } from "./admin-triage-page.js";

test("admin dashboard exposes deterministic triage controls and both scopes", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="rules-triage"');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Deterministic attention queue");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="triage-scope"');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('value="unreviewed">New / unreviewed');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('value="reviewed_backlog">Reviewed backlog');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="triage-refresh"');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="triage-export"');
});

test("triage enhancer adds markup only and does not inject its runtime into the legacy script", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Waiting for refinement runtime");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("var rulesTriageEngine=");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("createTriageEngine.toString");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("refreshRulesTriage");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("gauntlet:rules-triage");
});

test("triage enhancement is idempotent", () => {
  const twice = enhanceRulesTriageAdmin(ADMIN_PAGE_WITH_RULES_TRIAGE);
  expect(twice).toBe(ADMIN_PAGE_WITH_RULES_TRIAGE);
  expect((twice.match(/id="rules-triage"/g) || []).length).toBe(1);
});

test("triage markup makes no paid Rules Arbiter model request", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("fetch('/api/rules");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain('fetch("/api/rules');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("OPENAI_API_KEY");
});
