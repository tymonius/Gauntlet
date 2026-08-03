import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";

test("admin review export includes current corpus and retrieval diagnostics", () => {
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("gauntlet.rules-review-bundle.v2");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("currentCorpus:corpus.current");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("rulesCorpora:corpus.byVersion");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("diagnostics:diagnostic");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("/api/admin/review-corpus");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("/api/admin/review-intelligence");
});

test("review schema separates historical accuracy from current validity", () => {
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("historicalAccuracy");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("currentValidity");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("versioned_precedent_candidate");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("designerReviewRequired");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("regressionCandidate");
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("reviewedAgainstCorpusHash");
});

test("admin filters use the current player-facing ruling statuses", () => {
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain('value="provisional">Provisional Arbiter Ruling');
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain('value="out_of_scope">Out of Scope');
  expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).not.toContain('value="unresolved">Unresolved');
});
