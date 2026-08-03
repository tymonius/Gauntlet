import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const persistence = readFileSync(new URL("./rules-persistence.js", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("./migrations/0009_rules_answer_mode_v2.sql", import.meta.url),
  "utf8"
);

test("smart interactions write legacy-safe and current answer modes", () => {
  expect(persistence).toContain("const currentMode = normalizeCurrentAnswerMode");
  expect(persistence).toContain("const legacyMode = toLegacyAnswerMode");
  expect(persistence).toContain("answer_mode, answer_mode_v2");
  expect(persistence).toContain("legacyMode, currentMode");
});

test("answer-mode migration preserves existing rows and accepts current modes", () => {
  expect(migration).toContain("ADD COLUMN answer_mode_v2");
  expect(migration).toContain("'ai_verified'");
  expect(migration).toContain("'local_fallback'");
  expect(migration).toContain("SET answer_mode_v2 = answer_mode");
});
