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

test("triage page is markup-only so runtime delivery is independently testable", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Waiting for refinement runtime");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("var rulesTriageEngine=");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("/api/admin/review-intelligence");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("/api/admin/export?format=json");
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
