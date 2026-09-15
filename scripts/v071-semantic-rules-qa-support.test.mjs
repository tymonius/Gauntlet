import { describe, expect, test } from "vitest";
import {
  SEMANTIC_GRADING_MODE,
  semanticFailures,
  summarizeSemanticResults,
  validateSemanticBenchmark
} from "./v071-semantic-rules-qa-support.mjs";

function semanticBenchmark() {
  return {
    gradingMode: SEMANTIC_GRADING_MODE,
    cases: [
      {
        id: "case-1",
        semanticCriteria: [
          { id: "rule-a", statement: "The movement sequence ends when battle begins." }
        ],
        forbiddenSemanticClaims: [
          { id: "rule-b", statement: "The same movement sequence resumes after battle." }
        ]
      }
    ]
  };
}

describe("semantic-v1 benchmark validation", () => {
  test("accepts proposition-based grading without lexical answer patterns", () => {
    expect(validateSemanticBenchmark(semanticBenchmark())).toEqual([]);
  });

  test("rejects lexical answer patterns", () => {
    const benchmark = semanticBenchmark();
    benchmark.cases[0].expectedAnswerPatterns = ["movement sequence ends"];
    benchmark.cases[0].forbiddenAnswerPatterns = ["resume movement"];
    expect(validateSemanticBenchmark(benchmark)).toEqual([
      "case-1: semantic-v1 forbids expectedAnswerPatterns; use semanticCriteria instead",
      "case-1: semantic-v1 forbids forbiddenAnswerPatterns; use forbiddenSemanticClaims instead"
    ]);
  });

  test("requires criteria and unique ids", () => {
    const benchmark = semanticBenchmark();
    benchmark.cases.push({
      id: "case-1",
      semanticCriteria: [
        { id: "same", statement: "One" },
        { id: "same", statement: "Two" }
      ],
      forbiddenSemanticClaims: [{ id: "same", statement: "Three" }]
    });
    const failures = validateSemanticBenchmark(benchmark);
    expect(failures).toContain("duplicate semantic-v1 case id case-1");
    expect(failures).toContain("case-1: duplicate required criterion id same");
    expect(failures).toContain("case-1: semantic criterion id same is reused across required and forbidden criteria");
  });

  test("leaves legacy benchmarks unchanged", () => {
    expect(validateSemanticBenchmark({ cases: [{ id: "legacy", expectedAnswerPatterns: ["literal"] }] })).toEqual([]);
  });
});

describe("semantic result handling", () => {
  test("turns fail and review verdicts into blocking failures", () => {
    expect(semanticFailures({ verdict: "fail", hardFailures: ["required rule missing"] })).toEqual([
      "semantic: required rule missing"
    ]);
    expect(semanticFailures({ verdict: "review", reviewReasons: ["answer is ambiguous"] })).toEqual([
      "semantic-review: answer is ambiguous"
    ]);
    expect(semanticFailures({ verdict: "pass" })).toEqual([]);
  });

  test("summarizes semantic verdicts and evaluator identity", () => {
    expect(summarizeSemanticResults([
      { semanticEvaluation: { verdict: "pass", evaluatorRevision: "semantic-v1", model: "judge-a" } },
      { semanticEvaluation: { verdict: "fail", evaluatorRevision: "semantic-v1", model: "judge-a" } },
      { semanticEvaluation: { verdict: "review", evaluatorRevision: "semantic-v1", model: "judge-b" } },
      {}
    ])).toEqual({
      pass: 1,
      fail: 1,
      review: 1,
      notEvaluated: 1,
      evaluatorRevisions: ["semantic-v1"],
      models: ["judge-a", "judge-b"]
    });
  });
});
