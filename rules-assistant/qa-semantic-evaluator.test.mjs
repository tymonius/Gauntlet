import { describe, expect, test } from "vitest";
import {
  deriveSemanticVerdict,
  validateSemanticEvaluationPayload
} from "./qa-semantic-evaluator.js";

function expected() {
  return {
    semanticCriteria: [
      { id: "movement-ends", statement: "The movement sequence ends when the battle begins." },
      { id: "unused-lost", statement: "Unused movement from that sequence cannot be spent after the battle." }
    ],
    forbiddenSemanticClaims: [
      { id: "resume-movement", statement: "The player may resume the same movement sequence after the battle." }
    ]
  };
}

describe("semantic QA payload validation", () => {
  test("accepts a complete semantic case", () => {
    const result = validateSemanticEvaluationPayload({
      caseId: "semantic-example",
      question: "Can I keep moving after the battle?",
      answer: "No. Entering the opponent's Position ends that movement sequence, so the unused movement is lost.",
      rulingStatus: "explicit",
      semanticCriteria: expected().semanticCriteria,
      forbiddenSemanticClaims: expected().forbiddenSemanticClaims
    });
    expect(result.failures).toEqual([]);
    expect(result.value.semanticCriteria).toHaveLength(2);
  });

  test("rejects missing criteria and duplicate ids", () => {
    const noCriteria = validateSemanticEvaluationPayload({ question: "Question", answer: "Answer" });
    expect(noCriteria.failures).toContain("at least one semantic criterion is required");

    const duplicate = validateSemanticEvaluationPayload({
      question: "Question",
      answer: "Answer",
      semanticCriteria: [{ id: "same", statement: "One" }],
      forbiddenSemanticClaims: [{ id: "same", statement: "Two" }]
    });
    expect(duplicate.failures).toContain("duplicate semantic criterion id same");
  });
});

describe("semantic QA verdict derivation", () => {
  test("passes when every required proposition is satisfied and forbidden propositions are absent", () => {
    const verdict = deriveSemanticVerdict(expected(), {
      required_results: [
        { id: "movement-ends", status: "satisfied", reason: "Equivalent meaning." },
        { id: "unused-lost", status: "satisfied", reason: "Equivalent meaning." }
      ],
      forbidden_results: [
        { id: "resume-movement", status: "absent", reason: "The answer says the opposite." }
      ],
      extra_material_claims: []
    });
    expect(verdict.verdict).toBe("pass");
    expect(verdict.hardFailures).toEqual([]);
    expect(verdict.reviewReasons).toEqual([]);
  });

  test("fails on a contradicted or missing required proposition", () => {
    const verdict = deriveSemanticVerdict(expected(), {
      required_results: [
        { id: "movement-ends", status: "contradicted", reason: "Answer says movement continues." },
        { id: "unused-lost", status: "missing", reason: "Unused movement is not addressed." }
      ],
      forbidden_results: [
        { id: "resume-movement", status: "present", reason: "Answer expressly permits resuming." }
      ],
      extra_material_claims: []
    });
    expect(verdict.verdict).toBe("fail");
    expect(verdict.hardFailures).toHaveLength(3);
  });

  test("requires review for ambiguity, extra material claims, or malformed evaluator output", () => {
    const verdict = deriveSemanticVerdict(expected(), {
      required_results: [
        { id: "movement-ends", status: "satisfied", reason: "Equivalent meaning." },
        { id: "unused-lost", status: "unclear", reason: "The answer is ambiguous about unused movement." },
        { id: "unexpected", status: "satisfied", reason: "Not requested." }
      ],
      forbidden_results: [],
      extra_material_claims: [
        { claim: "The winner draws a card.", reason: "Additional gameplay outcome not in the criteria." }
      ]
    });
    expect(verdict.verdict).toBe("review");
    expect(verdict.contractIssues).toContain("unexpected required result unexpected");
    expect(verdict.contractIssues).toContain("missing forbidden result resume-movement");
    expect(verdict.reviewReasons.some((item) => item.startsWith("extra material claim:"))).toBe(true);
  });
});
