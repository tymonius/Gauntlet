import { describe, expect, test } from "vitest";
import {
  QA_SEMANTIC_EVALUATOR_REVISION,
  deriveSemanticVerdict
} from "./qa-semantic-evaluator.js";

describe("semantic QA v2 extra-material telemetry", () => {
  test("does not fail or review an otherwise passing answer merely because extra material was reported", () => {
    const expected = {
      semanticCriteria: [
        { id: "required", statement: "The stated rule applies." }
      ],
      forbiddenSemanticClaims: [
        { id: "forbidden", statement: "The opposite rule applies." }
      ]
    };
    const verdict = deriveSemanticVerdict(expected, {
      required_results: [
        { id: "required", status: "satisfied", reason: "Equivalent meaning." }
      ],
      forbidden_results: [
        { id: "forbidden", status: "absent", reason: "Not asserted." }
      ],
      extra_material_claims: [
        {
          claim: "A directly related supporting rule also applies.",
          reason: "This gameplay statement is outside the benchmark propositions."
        }
      ]
    });

    expect(QA_SEMANTIC_EVALUATOR_REVISION).toBe("semantic-v2");
    expect(verdict.verdict).toBe("pass");
    expect(verdict.reviewReasons).toEqual([]);
    expect(verdict.extraMaterialClaims).toHaveLength(1);
  });
});
