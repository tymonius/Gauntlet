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

test("triage runs inside the authenticated admin runtime", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("var rulesTriageEngine=");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("if(!state.token)");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("api('/api/admin/export?format=json')");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("document.getElementById('triage-refresh').onclick");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain('id="rules-triage-script"');
});

test("triage exposes separate new-interaction and reviewed-backlog scopes", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('id="triage-scope"');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('value="unreviewed">New / unreviewed');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain('value="reviewed_backlog">Reviewed backlog');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("{scope:scope}");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Mining reviewed interactions for deterministic refinement signals");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("reviewed-backlog");
});

test("triage renders useful zero-work states for both scopes", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("There are no unreviewed interactions to triage right now.");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("there is nothing new to triage");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("No reviewed interactions currently carry deterministic refinement signals.");
});

test("triage export omits session identifiers while allowing in-memory conversation linkage", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("Conversation linkage was used in-memory");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).toContain("session identifiers are not exported");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("session_id:rulesTriageLastReport");
});

test("triage enhancement is idempotent", () => {
  const twice = enhanceRulesTriageAdmin(ADMIN_PAGE_WITH_RULES_TRIAGE);
  expect((twice.match(/id="rules-triage"/g) || []).length).toBe(1);
  expect((twice.match(/var rulesTriageEngine=/g) || []).length).toBe(1);
});

test("triage makes no paid Rules Arbiter model request", () => {
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("fetch('/api/rules");
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain('fetch("/api/rules');
  expect(ADMIN_PAGE_WITH_RULES_TRIAGE).not.toContain("OPENAI_API_KEY");
});