import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  sourceRequirementGroups,
  validateClassificationExpectations
} from "./v071-live-rules-qa-support.mjs";

describe("v0.7.1 live QA alternative governing-source groups", () => {
  test("keeps legacy expectedSourcePatterns as mandatory one-pattern groups", () => {
    const item = {
      expectedSourcePatterns: ["Negation", "Clearing battle cards"]
    };
    expect(sourceRequirementGroups(item)).toEqual([
      ["Negation"],
      ["Clearing battle cards"]
    ]);
  });

  test("accepts one alternative group for direct authority", () => {
    const benchmark = {
      cases: [{
        id: "direct-alternatives",
        expectedClassification: "explicit",
        classificationBasis: "direct-authority",
        expectedSourceGroups: [[
          "Negation",
          "Clearing battle cards"
        ]]
      }]
    };
    expect(validateClassificationExpectations(benchmark)).toEqual([]);
  });

  test("requires two independent governing groups for combined authority", () => {
    const invalid = {
      cases: [{
        id: "combined-one-group",
        expectedClassification: "inferred",
        classificationBasis: "combined-authority",
        expectedSourceGroups: [["Transmutation", "Entering the Graveyard"]]
      }]
    };
    expect(validateClassificationExpectations(invalid)).toContain(
      "benchmark: combined-one-group marks combined authority without multiple governing source requirements"
    );

    const valid = {
      cases: [{
        id: "combined-two-groups",
        expectedClassification: "inferred",
        classificationBasis: "combined-authority",
        expectedSourceGroups: [
          ["Transmutation"],
          ["Grave Ward", "Entering the Graveyard"]
        ]
      }]
    };
    expect(validateClassificationExpectations(valid)).toEqual([]);
  });

  test("rejects malformed or empty source groups", () => {
    const benchmark = {
      cases: [{
        id: "bad-groups",
        expectedClassification: "explicit",
        classificationBasis: "direct-authority",
        expectedSourceGroups: [[], [""]]
      }]
    };
    const failures = validateClassificationExpectations(benchmark);
    expect(failures).toContain("benchmark: bad-groups source group 1 must be a nonempty array");
    expect(failures).toContain("benchmark: bad-groups source group 2 contains an empty or non-string pattern");
  });

  test("runner grades each group as an OR while preserving legacy diagnostics", () => {
    const source = readFileSync(new URL("./run-v071-live-rules-qa.mjs", import.meta.url), "utf8");
    expect(source).toContain("const sourceGroups = sourceRequirementGroups(item);");
    expect(source).toContain("normalizedGroup.some((pattern) => haystacks.some((text) => text.includes(pattern)))");
    expect(source).toContain("expected governing source pattern");
    expect(source).toContain("expected one governing source from group");
    expect(source).toContain("expectedSourceGroups: item.expectedSourceGroups || []");
  });
});
