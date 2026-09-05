import { expect, test } from "vitest";
import { buildRefinementPlan } from "./scaffold-rules-refinement-pr.mjs";
import { refinementScaffold } from "../rules-assistant/refinement-scaffold.js";

const report = {
  schema: "gauntlet.rules-triage.v1",
  generatedAt: "2026-09-05T04:00:00.000Z",
  clusters: [{ rootCause: "retrieval", label: "Retrieval", count: 1, highCount: 1, mediumCount: 0, maxScore: 75, averageScore: 75, interactionIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"], recommendedAction: "Inspect retrieval." }],
  interactions: [{ interactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", question: "Can this move there?", score: 75, priority: "high", rootCause: "retrieval", reasons: ["Retrieval failed."], signalCodes: ["audit_retrieval_failure"] }]
};

const bundle = {
  schema: "gauntlet.rules-regression-candidates.v1",
  candidates: [{
    interactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    fixtureReadiness: { ready: true, missing: [] },
    suggestedFixture: {
      id: "review-aaaaaaaa",
      category: "live-regression",
      question: "Can this move there?",
      expectedClassification: "explicit",
      expectedSourcePatterns: ["rulebook:movement"],
      interactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      origin: "review-audit-regression-candidate"
    }
  }]
};

const benchmark = { schema: "gauntlet.rules-arbiter-evals.v2", cases: [] };

test("materialization plan filters and merges cluster regression fixtures", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(report, "retrieval");
  const plan = buildRefinementPlan(scaffold, bundle, benchmark);
  expect(plan.filteredBundle.candidates).toHaveLength(1);
  expect(plan.merge.added).toHaveLength(1);
  expect(plan.merge.benchmark.cases[0].interactionId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
});

test("materialization public manifest stays free of player question text", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(report, "retrieval");
  const plan = buildRefinementPlan(scaffold, bundle, benchmark);
  expect(JSON.stringify(plan.publicManifest)).not.toContain("Can this move there?");
  expect(plan.publicManifest.cluster.interactionIds).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
});
