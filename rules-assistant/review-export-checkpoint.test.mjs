import { expect, test } from "vitest";
import {
  normalizeCheckpoint,
  normalizeExportFilters
} from "./review-export-checkpoint.js";

test("normalizes filter scopes deterministically", () => {
  expect(normalizeExportFilters({
    confidence: "low",
    q: "  Fog OF WAR  ",
    feedback: "incorrect"
  })).toEqual({
    q: "fog of war",
    feedback: "incorrect",
    confidence: "low"
  });
});

test("rejects unsupported checkpoint filter values", () => {
  expect(() => normalizeExportFilters({ reviewStatus: "approved" })).toThrow("Invalid review-status filter");
  expect(() => normalizeExportFilters([])).toThrow("must be an object");
});

test("normalizes tuple checkpoints", () => {
  expect(normalizeCheckpoint({
    createdAt: "2026-07-30T12:00:00Z",
    interactionId: "6a0d051b-cd65-4002-b6fa-33afe83d5ba4"
  })).toEqual({
    createdAt: "2026-07-30T12:00:00.000Z",
    interactionId: "6a0d051b-cd65-4002-b6fa-33afe83d5ba4"
  });
  expect(normalizeCheckpoint({ createdAt: "2026-07-30T12:00:00Z", interactionId: null }).interactionId).toBeNull();
});

test("rejects malformed checkpoints", () => {
  expect(() => normalizeCheckpoint({ createdAt: "not-a-date" })).toThrow("valid date");
  expect(() => normalizeCheckpoint({ createdAt: "2026-07-30T12:00:00Z", interactionId: "bad" })).toThrow("UUID");
});
