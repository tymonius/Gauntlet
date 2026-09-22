import { spawnSync } from "node:child_process";

process.env.GAUNTLET_RULES_QA_BENCHMARK ??= "rules-assistant/evals/rules-arbiter-v072-final-regression-replay.json";
process.env.GAUNTLET_RULES_QA_CORRECTIONS ??= "rules-assistant/evals/rules-arbiter-v072-final-regression-replay-corrections.json";
process.env.GAUNTLET_RULES_QA_OUTPUT ??= "artifacts/rules-qa/v072-live-answer-run.json";

const collect = spawnSync(process.execPath, ["scripts/run-v071-live-rules-qa.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (collect.error) throw collect.error;

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
