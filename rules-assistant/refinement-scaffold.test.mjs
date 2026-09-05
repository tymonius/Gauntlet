import { expect, test } from "vitest";
import { refinementScaffold } from "./refinement-scaffold.js";

const triage = {
  schema: "gauntlet.rules-triage.v1",
  generatedAt: "2026-09-05T04:00:00.000Z",
  clusters: [{
    rootCause: "conversation_continuity",
    label: "Conversation continuity",
    count: 2,
    highCount: 1,
    mediumCount: 1,
    maxScore: 82,
    averageScore: 61,
    interactionIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
    recommendedAction: "Review follow-up resolution."
  }],
  interactions: [
    { interactionId: "11111111-1111-4111-8111-111111111111", question: "Which are?", score: 82, priority: "high", rootCause: "conversation_continuity", reasons: ["Context-dependent follow-up."], signalCodes: ["elliptical_followup"] },
    { interactionId: "22222222-2222-4222-8222-222222222222", question: "What about tactics?", score: 40, priority: "medium", rootCause: "conversation_continuity", reasons: ["Weak retrieval."], signalCodes: ["audit_retrieval_weak"] }
  ]
};

const sourceGapTriage = {
  schema: "gauntlet.rules-triage.v1",
  generatedAt: "2026-09-05T05:00:00.000Z",
  clusters: [{
    rootCause: "source_specificity",
    label: "Source specificity",
    count: 2,
    highCount: 2,
    mediumCount: 0,
    maxScore: 100,
    averageScore: 96,
    interactionIds: ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"],
    recommendedAction: "Check whether the game authority itself is ambiguous."
  }],
  interactions: [
    { interactionId: "33333333-3333-4333-8333-333333333333", question: "Can I choose the impossible option?", score: 100, priority: "high", rootCause: "source_specificity", reasons: ["Review identified an ambiguous rule."], signalCodes: ["review_ambiguous_rule"] },
    { interactionId: "44444444-4444-4444-8444-444444444444", question: "What happens if neither choice works?", score: 92, priority: "high", rootCause: "source_specificity", reasons: ["Audit recommends a rule clarification."], signalCodes: ["audit_rule_clarification"] }
  ]
};

test("builds a cluster-specific branch and PR scaffold", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(triage, "conversation_continuity", { generatedAt: "2026-09-05T04:05:00.000Z" });
  expect(scaffold.schema).toBe("gauntlet.rules-refinement-scaffold.v1");
  expect(scaffold.branch.suggestedName).toBe("fix/rules-arbiter-conversation-continuity-20260905");
  expect(scaffold.cluster.interactionIds).toHaveLength(2);
  expect(scaffold.implementationHints.likelyFiles).toContain("rules-assistant/local-search.js");
  expect(scaffold.pullRequest.draft).toBe(true);
  expect(scaffold.remediation.sourceAuthorityRequired).toBe(false);
});

test("source-gap signals require current game authority remediation before Arbiter changes", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(sourceGapTriage, "source_specificity");
  expect(scaffold.remediation.sourceAuthorityRequired).toBe(true);
  expect(scaffold.remediation.reasonSignalCodes).toEqual(expect.arrayContaining(["review_ambiguous_rule", "audit_rule_clarification"]));
  expect(scaffold.remediation.authorityFileCandidates).toContain("rulebook/player-facing/current-rulebook.md");
  expect(scaffold.implementationHints.likelyFiles[0]).toBe("rulebook/player-facing/current-rulebook.md");
  expect(scaffold.pullRequest.body).toContain("Source authority remediation: REQUIRED");
  expect(scaffold.pullRequest.body).toContain("correct the game rules at the source");
});

test("attaches only reviewed regression candidates from the selected cluster", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(triage, "conversation_continuity");
  const bundle = {
    schema: "gauntlet.rules-regression-candidates.v1",
    candidates: [
      { interactionId: "11111111-1111-4111-8111-111111111111", fixtureReadiness: { ready: true }, suggestedFixture: { id: "review-11111111" } },
      { interactionId: "99999999-9999-4999-8999-999999999999", fixtureReadiness: { ready: true }, suggestedFixture: { id: "review-99999999" } }
    ]
  };
  const attached = refinementScaffold.attachRegressionCandidates(scaffold, bundle);
  expect(attached.regression.candidateCount).toBe(1);
  expect(attached.regression.readyCount).toBe(1);
  expect(attached.regression.missingInteractionIds).toEqual(["22222222-2222-4222-8222-222222222222"]);
});

test("public manifest preserves source-remediation requirement but omits raw player question text", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(sourceGapTriage, "source_specificity");
  const manifest = refinementScaffold.toPublicManifest(scaffold);
  const serialized = JSON.stringify(manifest);
  expect(serialized).not.toContain("Can I choose the impossible option?");
  expect(serialized).not.toContain("What happens if neither choice works?");
  expect(manifest.remediation.sourceAuthorityRequired).toBe(true);
  expect(manifest.remediation.reasonSignalCodes).toContain("review_ambiguous_rule");
  expect(manifest.privacy.containsPlayerQuestionText).toBe(false);
});

test("public manifest and PR body omit raw player question text", () => {
  const scaffold = refinementScaffold.buildRefinementScaffold(triage, "conversation_continuity");
  const manifest = refinementScaffold.toPublicManifest(scaffold);
  const serialized = JSON.stringify(manifest);
  expect(serialized).not.toContain("Which are?");
  expect(serialized).not.toContain("What about tactics?");
  expect(scaffold.pullRequest.body).not.toContain("Which are?");
  expect(scaffold.pullRequest.body).toContain("11111111-1111-4111-8111-111111111111");
  expect(manifest.privacy.containsPlayerQuestionText).toBe(false);
});
