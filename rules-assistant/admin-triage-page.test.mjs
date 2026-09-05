import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_TRIAGE, enhanceRulesTriageAdmin } from "./admin-triage-page.js";

test("admin dashboard exposes deterministic triage and root-cause clusters", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="rules-triage"');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Deterministic attention queue");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("gauntlet.rules-triage.v1");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Conversation continuity");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Provisional overuse");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("/api/admin/review-intelligence");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("/api/admin/export?format=json");
});

test("triage export omits session identifiers while allowing in-memory conversation linkage", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Conversation linkage was used in-memory");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("session identifiers are not exported");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("session_id:lastReport");
});

test("triage enhancement is idempotent", () => {
  const twice = enhanceRulesTriageAdmin(ADMIN_PAGE_WITH_RULES_TRIAGE);
  expect((twice.match(/id="rules-triage"/g) || []).length).toBe(1);
  expect((twice.match(/id="rules-triage-script"/g) || []).length).toBe(1);
});

test("triage makes no paid Rules Arbiter model request", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("/api/rules");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("OPENAI_API_KEY");
});
