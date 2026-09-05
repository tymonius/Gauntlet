import { expect, test } from "vitest";
import {
  applyRefinementResolutionLedger,
  refinementResolutionLedger,
  validateRefinementResolutionLedger
} from "./refinement-resolution-ledger.js";

function report(interactions, scope = "reviewed_backlog") {
  return {
    schema: "gauntlet.rules-triage.v1",
    generatedAt: "2026-09-05T22:30:00.000Z",
    scope,
    stats: {
      scope,
      eligible: interactions.length,
      unreviewed: 0,
      reviewedBacklog: scope === "reviewed_backlog" ? interactions.length : 0,
      high: interactions.filter((item) => item.priority === "high").length,
      medium: interactions.filter((item) => item.priority === "medium").length,
      low: 0,
      routine: 0,
      attention: interactions.length,
      clusters: 1
    },
    interactions,
    clusters: [{
      rootCause: "source_specificity",
      label: "Source specificity",
      count: interactions.length,
      highCount: interactions.filter((item) => item.priority === "high").length,
      mediumCount: interactions.filter((item) => item.priority === "medium").length,
      maxScore: Math.max(...interactions.map((item) => item.score)),
      averageScore: Math.round(interactions.reduce((sum, item) => sum + item.score, 0) / interactions.length),
      interactionIds: interactions.map((item) => item.interactionId),
      representatives: interactions.slice(0, 3),
      recommendedAction: "Clarify current game authority."
    }]
  };
}

const resolvedId = "f9ae058b-e4de-4140-bd1f-189879e77678";
const unresolvedId = "11111111-1111-4111-8111-111111111111";

const resolvedInteraction = {
  interactionId: resolvedId,
  question: "May an opponent with an empty Hand choose Penance's discard option?",
  score: 75,
  priority: "high",
  rootCause: "source_specificity",
  reasons: ["Review identified an ambiguous rule."]
};

const unresolvedInteraction = {
  interactionId: unresolvedId,
  question: "Another unresolved source question",
  score: 55,
  priority: "high",
  rootCause: "source_specificity",
  reasons: ["Review identified a missing rule."]
};

test("checked-in refinement resolution ledger is valid", () => {
  const result = validateRefinementResolutionLedger(refinementResolutionLedger);
  expect(result.ok).toBe(true);
  expect(result.resolvedInteractionCount).toBeGreaterThanOrEqual(1);
});

test("reviewed backlog excludes resolved interactions but reports them separately", () => {
  const applied = applyRefinementResolutionLedger(
    report([resolvedInteraction, unresolvedInteraction]),
    refinementResolutionLedger
  );

  expect(applied.interactions.map((item) => item.interactionId)).toEqual([unresolvedId]);
  expect(applied.stats.eligible).toBe(1);
  expect(applied.stats.reviewedBacklog).toBe(1);
  expect(applied.stats.resolvedByRefinement).toBe(1);
  expect(applied.clusters).toHaveLength(1);
  expect(applied.clusters[0].interactionIds).toEqual([unresolvedId]);
  expect(applied.resolvedByRefinement).toEqual([
    expect.objectContaining({
      interactionId: resolvedId,
      resolutionId: "available-choice-rule-v071",
      resolutionSurface: "rules_authority"
    })
  ]);
});

test("a completely resolved cluster disappears from the active backlog", () => {
  const applied = applyRefinementResolutionLedger(report([resolvedInteraction]), refinementResolutionLedger);
  expect(applied.stats.eligible).toBe(0);
  expect(applied.stats.clusters).toBe(0);
  expect(applied.clusters).toEqual([]);
  expect(applied.resolvedByRefinement).toHaveLength(1);
});

test("unreviewed triage is never suppressed by historical resolution records", () => {
  const input = report([resolvedInteraction], "unreviewed");
  input.stats.unreviewed = 1;
  const applied = applyRefinementResolutionLedger(input, refinementResolutionLedger);
  expect(applied.interactions).toEqual(input.interactions);
  expect(applied.stats.resolvedByRefinement).toBe(0);
});

test("resolved entries require a durable authority or implementation binding", () => {
  const invalid = {
    schema: "gauntlet.rules-refinement-resolution-ledger.v1",
    entries: [{
      id: "bad-resolution",
      status: "resolved",
      rootCause: "retrieval",
      interactionIds: [unresolvedId],
      resolutionSurface: "arbiter_retrieval",
      summary: "Fixed retrieval.",
      resolvedAt: "2026-09-05T22:30:00.000Z",
      binding: {}
    }]
  };
  const result = validateRefinementResolutionLedger(invalid);
  expect(result.ok).toBe(false);
  expect(result.failures.join(" ")).toMatch(/authoritySetId, behaviorRevision, or fix commit/i);
});
