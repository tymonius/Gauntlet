import { describe, expect, test } from "vitest";
import {
  inspectVoiceSmokeReport,
  VOICE_SMOKE_CASE_IDS
} from "./v072-voice-smoke-report.js";

function validReport() {
  return {
    rulesVersion: "v0.7.2",
    executedCaseIds: [...VOICE_SMOKE_CASE_IDS],
    executedCaseCount: 5,
    infrastructureFailure: null,
    results: VOICE_SMOKE_CASE_IDS.map((id) => ({
      id,
      httpStatus: 200,
      payload: { answer: "The governing rule settles this matter.", executionPath: "model-verified" },
      failures: [],
      warnings: []
    }))
  };
}

describe("manual five-question Chief Justice voice smoke", () => {
  test("accepts exactly five substantive model responses", () => {
    expect(inspectVoiceSmokeReport(validReport())).toEqual({
      passed: true, failures: [], warnings: []
    });
  });

  test("rejects missing responses or source-lookup fallback", () => {
    const report = validReport();
    report.results[0].payload.executionPath = "local-source-lookup";
    report.results[1].payload.answer = "";
    const check = inspectVoiceSmokeReport(report);
    expect(check.passed).toBe(false);
    expect(check.failures.join(" ")).toContain("production model path");
    expect(check.failures.join(" ")).toContain("no successful, substantive response");
  });

  test("rejects a changed or incomplete question set", () => {
    const report = validReport();
    report.executedCaseIds.pop();
    report.results.pop();
    report.executedCaseCount = 4;
    expect(inspectVoiceSmokeReport(report).passed).toBe(false);
  });

  test("treats voice faults as failures and verbose answers as review warnings", () => {
    const report = validReport();
    report.results[0].failures = ["voice: canned opener", "citations: matcher mismatch"];
    report.results[1].warnings = ["voice: unusually long"];
    const check = inspectVoiceSmokeReport(report);
    expect(check.passed).toBe(false);
    expect(check.failures).toEqual(["blind-u-negated-gambit-destination: voice: canned opener"]);
    expect(check.warnings).toEqual(["blind-u-line-credit-collateral-destination: voice: unusually long"]);
  });

  test("does not mistake citation-matcher diagnostics for failures of voice", () => {
    const report = validReport();
    report.results[0].failures = ["citations: matcher mismatch"];
    expect(inspectVoiceSmokeReport(report).passed).toBe(true);
  });
});
