import { expect, test } from "vitest";
import {
  applyRefinementResolutionLedger,
  refinementResolutionLedger
} from "./refinement-resolution-ledger.js";
import { applyCurrentValidityToRefinementReport } from "./refinement-current-validity.js";

const resolvedId = "f9ae058b-e4de-4140-bd1f-189879e77678";

function reviewedReport() {
  const interaction = {
    interactionId: resolvedId,
    question: "Penance empty-Hand choice",
    score: 90,
    priority: "high",
    rootCause: "source_specificity",
    reasons: ["Ambiguous rule."]
  };
  return {
    schema: "gauntlet.rules-triage.v1",
    generatedAt: "2026-09-06T03:20:00.000Z",
    scope: "reviewed_backlog",
    stats: {
      scope: "reviewed_backlog",
      eligible: 1,
      unreviewed: 0,
      reviewedBacklog: 1,
      high: 1,
      medium: 0,
      low: 0,
      routine: 0,
      attention: 1,
      clusters: 1
    },
    interactions: [interaction],
    clusters: [{
      rootCause: "source_specificity",
      label: "Source specificity",
      count: 1,
      highCount: 1,
      mediumCount: 0,
      maxScore: 90,
      averageScore: 90,
      interactionIds: [resolvedId],
      representatives: [interaction],
      recommendedAction: "Clarify authority."
    }]
  };
}

test("ledger resolution takes precedence over a historical-only audit label", () => {
  const unresolved = applyRefinementResolutionLedger(reviewedReport(), refinementResolutionLedger);
  const finalReport = applyCurrentValidityToRefinementReport(unresolved, [{
    interaction_id: resolvedId,
    current_validity: "superseded",
    reviewed_against_version: "v0.7.1"
  }]);

  expect(finalReport.stats.eligible).toBe(0);
  expect(finalReport.stats.resolvedByRefinement).toBe(1);
  expect(finalReport.stats.historicalOnly).toBe(0);
  expect(finalReport.resolvedByRefinement).toEqual([
    expect.objectContaining({ interactionId: resolvedId })
  ]);
  expect(finalReport.historicalOnly).toEqual([]);
});
