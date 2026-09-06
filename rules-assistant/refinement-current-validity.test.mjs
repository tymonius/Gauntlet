import { expect, test } from "vitest";
import { applyCurrentValidityToRefinementReport } from "./refinement-current-validity.js";

function report(interactions, scope = "reviewed_backlog") {
  return {
    schema: "gauntlet.rules-triage.v1",
    generatedAt: "2026-09-06T03:20:00.000Z",
    scope,
    stats: {
      scope,
      eligible: interactions.length,
      unreviewed: scope === "unreviewed" ? interactions.length : 0,
      reviewedBacklog: scope === "reviewed_backlog" ? interactions.length : 0,
      high: interactions.filter((item) => item.priority === "high").length,
      medium: interactions.filter((item) => item.priority === "medium").length,
      low: interactions.filter((item) => item.priority === "low").length,
      routine: interactions.filter((item) => item.priority === "routine").length,
      attention: interactions.filter((item) => item.score >= 10).length,
      clusters: 1
    },
    interactions,
    clusters: [{
      rootCause: "retrieval",
      label: "Retrieval",
      count: interactions.length,
      highCount: interactions.filter((item) => item.priority === "high").length,
      mediumCount: interactions.filter((item) => item.priority === "medium").length,
      maxScore: Math.max(...interactions.map((item) => item.score)),
      averageScore: Math.round(interactions.reduce((sum, item) => sum + item.score, 0) / interactions.length),
      interactionIds: interactions.map((item) => item.interactionId),
      representatives: interactions.slice(0, 3),
      recommendedAction: "Inspect retrieval."
    }]
  };
}

const current = {
  interactionId: "11111111-1111-4111-8111-111111111111",
  question: "Current defect",
  score: 80,
  priority: "high",
  rootCause: "retrieval",
  reasons: ["Retrieval failed."]
};

const stale = {
  interactionId: "22222222-2222-4222-8222-222222222222",
  question: "Historical defect",
  score: 70,
  priority: "high",
  rootCause: "retrieval",
  reasons: ["Old rules differed."]
};

test("reviewed backlog excludes audits marked stale, superseded, or not applicable", () => {
  for (const validity of ["stale", "superseded", "not_applicable"]) {
    const applied = applyCurrentValidityToRefinementReport(report([current, stale]), [{
      interaction_id: stale.interactionId,
      current_validity: validity,
      reviewed_against_version: "v0.7.1",
      historical_accuracy: "incorrect",
      recommended_action: "none"
    }]);

    expect(applied.interactions.map((item) => item.interactionId)).toEqual([current.interactionId]);
    expect(applied.stats.eligible).toBe(1);
    expect(applied.stats.historicalOnly).toBe(1);
    expect(applied.clusters).toHaveLength(1);
    expect(applied.clusters[0].interactionIds).toEqual([current.interactionId]);
    expect(applied.historicalOnly).toEqual([
      expect.objectContaining({ interactionId: stale.interactionId, currentValidity: validity })
    ]);
  }
});

test("current, indeterminate, and unaudited interactions stay active", () => {
  for (const validity of ["current", "indeterminate", ""]) {
    const audits = validity ? [{ interaction_id: stale.interactionId, current_validity: validity }] : [];
    const applied = applyCurrentValidityToRefinementReport(report([current, stale]), audits);
    expect(applied.interactions).toHaveLength(2);
    expect(applied.stats.historicalOnly).toBe(0);
  }
});

test("a fully historical cluster disappears instead of becoming refinement work", () => {
  const applied = applyCurrentValidityToRefinementReport(report([stale]), [{
    interaction_id: stale.interactionId,
    current_validity: "superseded",
    reviewed_against_version: "v0.7.1"
  }]);
  expect(applied.stats.eligible).toBe(0);
  expect(applied.stats.clusters).toBe(0);
  expect(applied.clusters).toEqual([]);
});

test("new/unreviewed triage is never filtered by review audit current validity", () => {
  const input = report([stale], "unreviewed");
  const applied = applyCurrentValidityToRefinementReport(input, [{
    interaction_id: stale.interactionId,
    current_validity: "stale"
  }]);
  expect(applied.interactions).toEqual(input.interactions);
  expect(applied.stats.historicalOnly).toBe(0);
});
