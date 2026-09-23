import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { inspectVoiceSmokeReport } from "../rules-assistant/v072-voice-smoke-report.js";

process.env.GAUNTLET_RULES_QA_BENCHMARK ??= "rules-assistant/evals/rules-arbiter-v072-final-regression-replay.json";
process.env.GAUNTLET_RULES_QA_CORRECTIONS ??= "rules-assistant/evals/rules-arbiter-v072-final-regression-replay-corrections.json";
process.env.GAUNTLET_RULES_QA_OUTPUT ??= "artifacts/rules-qa/v072-live-answer-run.json";

const collect = spawnSync(process.execPath, ["scripts/run-v071-live-rules-qa.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (collect.error) throw collect.error;

// This deliberately runs only the five approved questions, not the paid semantic
// evaluator. The report retains the actual answers for human character review.
if (process.env.GAUNTLET_RULES_QA_VOICE_ONLY === "true") {
  const report = JSON.parse(readFileSync(process.env.GAUNTLET_RULES_QA_OUTPUT, "utf8"));
  const check = inspectVoiceSmokeReport(report);
  for (const warning of check.warnings) console.warn("VOICE REVIEW: " + warning);
  for (const failure of check.failures) console.error("VOICE FAIL: " + failure);
  if (!check.passed) process.exit(1);
  console.log("Chief Justice voice smoke: 5/5 production-model responses captured without automated voice faults.");
  console.log("Review the five actual answers in the uploaded QA report for subjective in-character quality.");
  process.exit(0);
}

process.env.GAUNTLET_RULES_QA_SEMANTIC_INPUT = process.env.GAUNTLET_RULES_QA_OUTPUT;
process.env.GAUNTLET_RULES_QA_SEMANTIC_OUTPUT = process.env.GAUNTLET_RULES_QA_OUTPUT;
process.env.GAUNTLET_RULES_QA_SEMANTIC_ONLY = "true";

const semantic = spawnSync(process.execPath, ["scripts/run-v071-semantic-rules-qa.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (semantic.error) throw semantic.error;
if (semantic.status !== 0) process.exit(semantic.status ?? 1);

console.log("v0.7.2 live Rules Arbiter semantic QA passed. Collection citation/classification diagnostics remain non-gating.");
