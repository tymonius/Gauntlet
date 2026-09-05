import { expect, test } from "vitest";
import { createTriageEngine } from "./refinement-triage.js";

const engine = createTriageEngine();

function row(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    session_id: "session-a",
    sequence_index: 1,
    created_at: "2026-09-04T20:00:00.000Z",
    question: "Can a Gambit move to an occupied Territory?",
    answer: "No.",
    review_status: "unreviewed",
    ruling_status: "explicit",
    confidence: "high",
    source_count: 1,
    feedback_rating: null,
    issueTypes: [],
    ...overrides
  };
}

test("routine explicit answers stay out of the attention queue", () => {
  const report = engine.triageInteractions([row()]);
  expect(report.stats.unreviewed).toBe(1);
  expect(report.stats.routine).toBe(1);
  expect(report.stats.attention).toBe(0);
  expect(report.clusters).toEqual([]);
});

test("terse risky follow-ups cluster as conversation continuity", () => {
  const first = row({ id: "11111111-1111-4111-8111-111111111111", sequence_index: 1 });
  const second = row({
    id: "22222222-2222-4222-8222-222222222222",
    sequence_index: 2,
    created_at: "2026-09-04T20:01:00.000Z",
    question: "Which are?",
    answer: "I cannot determine that.",
    ruling_status: "provisional",
    confidence: "low",
    source_count: 0
  });
  const report = engine.triageInteractions([first, second]);
  const item = report.interactions.find((candidate) => candidate.interactionId === second.id);
  expect(item.priority).toBe("high");
  expect(item.rootCause).toBe("conversation_continuity");
  expect(item.signalCodes).toContain("elliptical_followup");
  expect(item.signalCodes).toContain("fragile_followup");
  expect(report.clusters[0].rootCause).toBe("conversation_continuity");
});

test("negative feedback with missing authority becomes a high-priority retrieval cluster", () => {
  const interaction = row({
    feedback_rating: "incorrect",
    confidence: "low",
    source_count: 0,
    question: "When does this effect end?"
  });
  const report = engine.triageInteractions([interaction]);
  expect(report.stats.high).toBe(1);
  expect(report.clusters[0].rootCause).toBe("retrieval");
  expect(report.clusters[0].recommendedAction).toMatch(/query planning/i);
});

test("review evidence drives terminology and source-specificity root causes", () => {
  const terminology = row({
    id: "33333333-3333-4333-8333-333333333333",
    issueTypes: ["inconsistent_terminology"]
  });
  const sourceGap = row({
    id: "44444444-4444-4444-8444-444444444444",
    session_id: "session-b",
    issueTypes: ["ambiguous_rule"],
    source_count: 1
  });
  const report = engine.triageInteractions([terminology, sourceGap]);
  expect(report.interactions.find((item) => item.interactionId === terminology.id).rootCause).toBe("terminology_voice");
  expect(report.interactions.find((item) => item.interactionId === sourceGap.id).rootCause).toBe("source_specificity");
});

test("provisional answers with authority and non-low confidence are isolated from pure retrieval failures", () => {
  const interaction = row({
    ruling_status: "provisional",
    confidence: "medium",
    source_count: 2
  });
  const report = engine.triageInteractions([interaction]);
  expect(report.interactions[0].rootCause).toBe("provisional_overuse");
  expect(report.interactions[0].priority).toBe("medium");
});

test("reviewed interactions do not remain in the unreviewed triage queue", () => {
  const report = engine.triageInteractions([
    row({ review_status: "correct" }),
    row({ review_status: "needs_correction", feedback_rating: "incorrect" })
  ]);
  expect(report.stats.unreviewed).toBe(0);
  expect(report.interactions).toEqual([]);
});
