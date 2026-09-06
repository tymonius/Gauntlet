import { describe, expect, it } from "vitest";
import { createPrivacySafeRefinementSnapshot, REFINEMENT_SNAPSHOT_SCHEMA } from "./refinement-snapshot.js";

describe("Rules Arbiter refinement snapshot", () => {
  it("retains queue diagnostics while excluding interaction content and reviewer prose", () => {
    const snapshot = createPrivacySafeRefinementSnapshot({
      scope: "reviewed_backlog",
      stats: { eligible: 1, high: 1, historicalOnly: 1, resolvedByRefinement: 1 },
      resolutionLedger: {
        schema: "gauntlet.rules-refinement-resolution-ledger.v1",
        updatedAt: "2026-09-06T00:00:00.000Z",
        entries: 2,
        resolvedInteractionIds: 1
      },
      clusters: [{
        rootCause: "classification",
        label: "Classification",
        count: 1,
        highCount: 1,
        mediumCount: 0,
        maxScore: 60,
        averageScore: 60,
        interactionIds: ["active-id"],
        representatives: [{ interactionId: "active-id", question: "private representative question" }],
        recommendedAction: "Inspect classification."
      }],
      interactions: [{
        interactionId: "active-id",
        createdAt: "2026-09-05T12:00:00.000Z",
        question: "private player question",
        answer: "private arbiter answer",
        reviewStatus: "needs_correction",
        reviewerNotes: "private reviewer notes",
        score: 60,
        priority: "high",
        rootCause: "classification",
        rootCauseLabel: "Classification",
        signalCodes: ["audit_classification"],
        reasons: ["Audit recommends a different ruling classification."]
      }],
      historicalOnly: [{
        interactionId: "historical-id",
        currentValidity: "stale",
        reviewedAgainstVersion: "v0.7.0",
        historicalAccuracy: "incorrect",
        recommendedAction: "none",
        correctedAnswer: "private corrected answer",
        rationale: "private audit rationale"
      }],
      resolvedByRefinement: [{
        interactionId: "resolved-id",
        currentRootCause: "retrieval",
        resolutionId: "resolution-1",
        resolutionRootCause: "retrieval",
        resolutionSurface: "arbiter",
        summary: "public-ish resolution prose that is not needed in the snapshot",
        resolvedAt: "2026-09-05T00:00:00.000Z"
      }]
    }, { interactions: 10, diagnostics: 9, audits: 8 });

    expect(snapshot.schema).toBe(REFINEMENT_SNAPSHOT_SCHEMA);
    expect(snapshot.sourceRows).toEqual({ interactions: 10, diagnostics: 9, audits: 8 });
    expect(snapshot.interactions[0]).toMatchObject({
      interactionId: "active-id",
      score: 60,
      rootCause: "classification",
      signalCodes: ["audit_classification"]
    });
    expect(snapshot.clusters[0].interactionIds).toEqual(["active-id"]);
    expect(snapshot.historicalOnly[0]).toMatchObject({ interactionId: "historical-id", currentValidity: "stale" });
    expect(snapshot.resolvedByRefinement[0]).toMatchObject({ interactionId: "resolved-id", resolutionId: "resolution-1" });

    const serialized = JSON.stringify(snapshot);
    for (const forbidden of [
      "private player question",
      "private arbiter answer",
      "private representative question",
      "private reviewer notes",
      "private corrected answer",
      "private audit rationale",
      "public-ish resolution prose"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
