import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";

const page = enhanceRulesScaffoldAdmin(ADMIN_PAGE_WITH_RULES_INTELLIGENCE);

test("admin dashboard exposes cluster-specific refinement scaffold controls", () => {
  expect(page).toContain('id="rules-triage"');
  expect(page).toContain('id="triage-scaffold-cluster"');
  expect(page).toContain('id="triage-scaffold"');
  expect(page).toContain("No cluster selected");
  expect(page).toContain("Scaffold refinement");
});

test("scaffold enhancer adds markup only and does not splice its runtime into the legacy script", () => {
  expect(page).not.toContain("var rulesRefinementScaffoldEngine=");
  expect(page).not.toContain("buildRefinementScaffold");
  expect(page).not.toContain("rulesScaffoldReport");
  expect(page).not.toContain("document.addEventListener('gauntlet:rules-triage'");
});

test("scaffold enhancer is idempotent", () => {
  expect(enhanceRulesScaffoldAdmin(page)).toBe(page);
  expect((page.match(/id="triage-scaffold"/g) || []).length).toBe(1);
});
