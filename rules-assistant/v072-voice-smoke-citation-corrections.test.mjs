import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyBenchmarkCorrections,
  normalizeQaText,
  sourceRequirementGroups,
  sourceText,
  validateClassificationExpectations
} from "../scripts/v071-live-rules-qa-support.mjs";

// Original selected-source excerpts from GitHub Actions run 35879903652,
// artifact current-rules-arbiter-live-qa-v0.7.2 / v072-live-answer-run.json.
// Keep this fixture independent of the corrected expectation text.
const selectedExcerpts = {
  "blind-u-line-credit-collateral-destination": [
    "Text: Use one card from Hand or Treasury as collateral. It contributes up to half the purchase cost, rounded down; pay the rest with Capital, then discard the collateral. Classification: Leader Ability Descriptor: No Action · First Deed purchase each turn · Collateral"
  ],
  "blind-u-transmutation-payment": [
    "No Action · Before dice · Put 1 card from Hand in Graveyard\n• Limit: Once per turn",
    "Text: Once per turn, before dice are rolled in a battle, you may put one card from your Hand in your Graveyard. Add its value to your battle total. Count: 2 Rites"
  ],
  "blind-u-player-stake": [
    "After refused Terms and before battle dice are rolled. Spend available Influence to increase your battle total. The total cost for +N is triangular: 1 + 2 + … + N Influence.",
    "Influence begins at 1, cannot fall below 0, and cannot exceed 10. Influence staked for Terms is not spent, but it is unavailable while staked. Influence spent on Leverage is spent normally and does not return when a stake is returned."
  ]
};

const benchmark = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-v072-final-regression-replay.json", import.meta.url), "utf8"
));
const corrections = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-v072-final-regression-replay-corrections.json", import.meta.url), "utf8"
));
const amended = applyBenchmarkCorrections(benchmark, corrections);

function groupsMatch(caseItem, excerpts) {
  const selected = excerpts.map((excerpt) => sourceText({ excerpt }));
  return sourceRequirementGroups(caseItem).every((group) =>
    group.map(normalizeQaText).some((pattern) =>
      selected.some((source) => source.includes(pattern))
    )
  );
}

describe("v0.7.2 Chief Justice voice-smoke citation corrections", () => {
  test("corrects exactly the three documented false-negative source expectations", () => {
    expect(corrections.qaEvidence.workflowRun).toBe("35879903652");
    expect(corrections.cases.map((item) => item.id)).toEqual(Object.keys(selectedExcerpts));
    expect(corrections.cases.every((item) => Object.keys(item).sort().join(",") === "expectedSourceGroups,id")).toBe(true);
    expect(validateClassificationExpectations(amended)).toEqual([]);

    for (const [id, excerpts] of Object.entries(selectedExcerpts)) {
      const original = benchmark.cases.find((item) => item.id === id);
      const corrected = amended.cases.find((item) => item.id === id);
      expect(groupsMatch(original, excerpts), `original ${id} should reproduce the false negative`).toBe(false);
      expect(groupsMatch(corrected, excerpts), `amended ${id} should match the actually selected sources`).toBe(true);
      expect({ ...corrected, expectedSourceGroups: original.expectedSourceGroups }).toEqual(original);
    }
  });

  test("staked-Influence expectation still requires both stake and Leverage authorities", () => {
    const item = amended.cases.find((value) => value.id === "blind-u-player-stake");
    const excerpts = selectedExcerpts[item.id];
    expect(groupsMatch(item, excerpts)).toBe(true);
    expect(groupsMatch(item, [excerpts[0]])).toBe(false);
    expect(groupsMatch(item, [excerpts[1]])).toBe(false);
  });

  test("transmutation expectation retains both payment and battle-total requirements", () => {
    const item = amended.cases.find((value) => value.id === "blind-u-transmutation-payment");
    expect(groupsMatch(item, selectedExcerpts[item.id])).toBe(true);
    expect(groupsMatch(item, [selectedExcerpts[item.id][0]])).toBe(false);
    expect(groupsMatch(item, ["Add its value to your battle total."])).toBe(false);
  });

  test("does not relax requirements for the other 30 frozen benchmark cases", () => {
    const changed = new Set(Object.keys(selectedExcerpts));
    for (const original of benchmark.cases) {
      if (!changed.has(original.id)) {
        expect(amended.cases.find((item) => item.id === original.id)).toEqual(original);
      }
    }
    expect(amended.cases).toHaveLength(benchmark.cases.length);
  });
});
