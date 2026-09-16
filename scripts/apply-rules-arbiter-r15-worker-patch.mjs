import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(text, before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${label}; found ${count}.`);
  return text.replace(before, after);
}

const evaluatorPath = "rules-assistant/qa-semantic-evaluator.js";
let evaluator = readFileSync(evaluatorPath, "utf8");
evaluator = replaceOnce(
  evaluator,
  'export const QA_SEMANTIC_EVALUATOR_REVISION = "semantic-v1";',
  'export const QA_SEMANTIC_EVALUATOR_REVISION = "semantic-v2";',
  "semantic-v1 revision marker"
);
evaluator = replaceOnce(
  evaluator,
  '6. List an extra material claim only when the candidate asserts an additional gameplay rule, permission, prohibition, timing, zone, cost, quantity, trigger, ownership/control rule, or outcome that is not already equivalent to or logically contained in a supplied proposition. Do not list restatements, rhetorical explanation, or non-gameplay prose.',
  '6. List an extra material claim only when the candidate asserts an additional gameplay rule, permission, prohibition, timing, zone, cost, quantity, trigger, ownership/control rule, or outcome that is not already equivalent to or logically contained in a supplied proposition. Do not list restatements, rhetorical explanation, or non-gameplay prose. Extra material claims are telemetry only: because the cited rules authority is not supplied to you, do not assume an extra claim is unsupported merely because it falls outside the benchmark propositions.',
  "semantic prompt extra-material rule"
);
const oldExtraReview = '  for (const item of extraMaterialClaims) {\n    reviewReasons.push(`extra material claim: ${String(item.claim).trim()}`);\n  }\n';
evaluator = replaceOnce(
  evaluator,
  oldExtraReview,
  '',
  "extra-material automatic review block"
);
writeFileSync(evaluatorPath, evaluator, "utf8");

const testPath = "rules-assistant/qa-semantic-evaluator.test.mjs";
let testText = readFileSync(testPath, "utf8");
testText = replaceOnce(
  testText,
  'test("requires review for ambiguity, extra material claims, or malformed evaluator output", () => {',
  'test("requires review for ambiguity or malformed evaluator output while retaining extra-claim telemetry", () => {',
  "semantic-v1 mixed-review test title"
);
testText = replaceOnce(
  testText,
  '    expect(verdict.reviewReasons.some((item) => item.startsWith("extra material claim:"))).toBe(true);',
  '    expect(verdict.reviewReasons.some((item) => item.startsWith("extra material claim:"))).toBe(false);\n    expect(verdict.extraMaterialClaims).toHaveLength(1);',
  "semantic-v1 extra-material review assertion"
);
writeFileSync(testPath, testText, "utf8");
