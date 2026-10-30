// A bounded, manually approved production smoke test for the Chief Justice's written voice.
// These are existing v0.7.2 benchmark cases; this mode does not alter their rules expectations.
export const VOICE_SMOKE_CASE_IDS = Object.freeze([
  "blind-u-negated-gambit-destination",
  "blind-u-line-credit-collateral-destination",
  "blind-u-transmutation-payment",
  "blind-u-commandant-repel-order",
  "blind-u-player-stake"
]);

export function inspectVoiceSmokeReport(report) {
  const failures = [];
  const warnings = [];
  const expected = VOICE_SMOKE_CASE_IDS;
  const executed = Array.isArray(report?.executedCaseIds) ? report.executedCaseIds : [];
  const results = Array.isArray(report?.results) ? report.results : [];

  if (report?.rulesVersion !== "v0.7.2") {
    failures.push("The report is not for the published v0.7.2 Rules Arbiter.");
  }
  if (executed.length !== expected.length || executed.some((id, index) => id !== expected[index])) {
    failures.push("The report did not execute exactly the five selected voice-smoke questions.");
  }
  if (report?.executedCaseCount !== expected.length || results.length !== expected.length) {
    failures.push("The report does not contain exactly five responses.");
  }
  if (report?.infrastructureFailure) {
    failures.push("An infrastructure failure prevented a valid production voice smoke.");
  }

  for (const [index, result] of results.entries()) {
    const label = result?.id || `case ${index + 1}`;
    if (result?.id !== expected[index]) {
      failures.push(`${label}: response order or case identity does not match the requested test.`);
    }
    if (result?.httpStatus !== 200 || !String(result?.payload?.answer || "").trim()) {
      failures.push(`${label}: no successful, substantive response was captured.`);
    }
    if (!String(result?.payload?.executionPath || "").startsWith("model")) {
      failures.push(`${label}: response was not generated through the production model path.`);
    }
    for (const failure of result?.failures || []) {
      if (failure.startsWith("voice:") || failure.startsWith("infrastructure:")) {
        failures.push(`${label}: ${failure}`);
      }
    }
    for (const warning of result?.warnings || []) {
      if (warning.startsWith("voice:")) warnings.push(`${label}: ${warning}`);
    }
  }

  return { passed: failures.length === 0, failures, warnings };
}
