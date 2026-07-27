import { expect, test } from "vitest";
import { buildReviewBundle, REVIEW_BUNDLE_SCHEMA } from "./review-bundle.js";

test("builds a sanitized ChatGPT review bundle", () => {
  const bundle = buildReviewBundle({
    exportedAt: "2026-07-27T20:00:00.000Z",
    matchedCount: 1,
    filters: { reviewStatus: "unreviewed" },
    interactions: [{
      id: "11111111-1111-4111-8111-111111111111",
      session_id: "private-session-value",
      previous_interaction_id: "private-previous-value",
      created_at: "2026-07-27T19:00:00.000Z",
      question: "Can Onward be used after a battle?",
      answer: "No.",
      game_version: "v0.6.0",
      ruling_status: "explicit",
      confidence: "high",
      answer_mode: "ai",
      model: "gpt-5.6-luna",
      feedback_rating: "yes",
      feedback_comment: "Clear",
      review_status: "unreviewed",
      issue_types_json: "[]",
      reviewer_notes: "",
      resolution: ""
    }],
    sources: [{
      interaction_id: "11111111-1111-4111-8111-111111111111",
      source_id: "rule-1",
      title: "Movement",
      source_path: "rulebook.md",
      source_url: "https://gauntlet.run/rulebook/",
      excerpt: "A battle ends further movement."
    }]
  });

  expect(bundle.schema).toBe(REVIEW_BUNDLE_SCHEMA);
  expect(bundle.scope.filters.reviewStatus).toBe("unreviewed");
  expect(bundle.interactions[0].interactionId).toBe("11111111-1111-4111-8111-111111111111");
  expect(bundle.interactions[0].sources[0].excerpt).toBe("A battle ends further movement.");
  expect(JSON.stringify(bundle)).not.toContain("private-session-value");
  expect(JSON.stringify(bundle)).not.toContain("private-previous-value");
  expect(bundle.reviewTask.allowedValues.reviewStatus).toContain("needs_correction");
});

test("marks a limited bundle as truncated", () => {
  const bundle = buildReviewBundle({ interactions: [{ id: "one" }], sources: [], matchedCount: 3 });
  expect(bundle.scope.includedInteractions).toBe(1);
  expect(bundle.scope.matchedInteractions).toBe(3);
  expect(bundle.scope.truncated).toBe(true);
});
