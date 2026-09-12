import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseRequestedCaseIds,
  selectBenchmarkCases
} from "../scripts/v071-live-rules-qa-case-selection.mjs";

const cases = [
  { id: "alpha" },
  { id: "beta" },
  { id: "gamma" },
  { id: "delta" }
];

describe("targeted live Rules Arbiter QA selection", () => {
  it("parses comma or whitespace separated ids and removes duplicates", () => {
    expect(parseRequestedCaseIds(" beta, gamma\nbeta  delta ")).toEqual([
      "beta",
      "gamma",
      "delta"
    ]);
  });

  it("runs exactly the requested cases in requested order", () => {
    expect(selectBenchmarkCases(cases, {
      limit: 1,
      smokeCaseIds: ["alpha"],
      requestedCaseIds: ["gamma", "beta"]
    }).map((item) => item.id)).toEqual(["gamma", "beta"]);
  });

  it("fails closed when a targeted id is not in the benchmark", () => {
    expect(() => selectBenchmarkCases(cases, {
      requestedCaseIds: ["beta", "missing-case"]
    })).toThrow("Unknown Rules Arbiter QA case id(s): missing-case");
  });

  it("preserves representative smoke selection when no targeted ids are supplied", () => {
    expect(selectBenchmarkCases(cases, {
      limit: 3,
      smokeCaseIds: ["delta", "beta"]
    }).map((item) => item.id)).toEqual(["delta", "beta", "alpha"]);
  });

  it("keeps explicit paid-API confirmation in the targeted workflow", () => {
    const workflow = readFileSync(
      resolve(".github/workflows/current-rules-arbiter-live-qa.yml"),
      "utf8"
    );
    expect(workflow).toContain("- targeted");
    expect(workflow).toContain("case_ids:");
    expect(workflow).toContain("GAUNTLET_RULES_QA_CASE_IDS");
    expect(workflow).toContain("confirm_paid_api:");
    expect(workflow).toContain("Require paid-API confirmation");
  });
});
