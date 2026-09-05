import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";

const page = enhanceRulesScaffoldAdmin(ADMIN_PAGE_WITH_RULES_INTELLIGENCE);

test("admin dashboard exposes cluster-specific refinement scaffolding", () => {
  expect(page).toContain('id="rules-triage"');
  expect(page).toContain('id="triage-scaffold-cluster"');
  expect(page).toContain('id="triage-scaffold"');
  expect(page).toContain("gauntlet.rules-refinement-scaffold.v1");
  expect(page).toContain("buildRefinementScaffold");
});

test("scaffold shares the authenticated triage runtime instead of creating a second admin client", () => {
  expect(page).toContain("document.addEventListener('gauntlet:rules-triage'");
  expect(page).toContain("typeof refreshRulesTriage==='function'");
  expect(page).toContain("saveFile(blob,'gauntlet-rules-refinement-");
  expect(page).not.toContain('id="rules-refinement-scaffold-script"');
});

test("scaffold dashboard stays on read-only admin data paths", () => {
  expect(page).toContain("/api/admin/export?format=json");
  expect(page).toContain("/api/admin/review-intelligence");
  expect(page).not.toContain("fetch('/api/rules");
  expect(page).not.toContain('fetch("/api/rules');
});

test("scaffold enhancer is idempotent", () => {
  expect(enhanceRulesScaffoldAdmin(page)).toBe(page);
  expect((page.match(/var rulesRefinementScaffoldEngine=/g) || []).length).toBe(1);
});
