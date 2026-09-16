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
evaluator = replaceOnce(
  evaluator,
  '  for (const item of extraMaterialClaims) {\n    reviewReasons.push(`extra material claim: ${String(item.claim).trim()}`);\n  }\n',
  '',
  "extra-material automatic review block"
);
writeFileSync(evaluatorPath, evaluator, "utf8");

const semanticTestPath = "rules-assistant/qa-semantic-evaluator.test.mjs";
let semanticTest = readFileSync(semanticTestPath, "utf8");
semanticTest = replaceOnce(
  semanticTest,
  'test("requires review for ambiguity, extra material claims, or malformed evaluator output", () => {',
  'test("requires review for ambiguity or malformed evaluator output while retaining extra-claim telemetry", () => {',
  "semantic-v1 mixed-review test title"
);
semanticTest = replaceOnce(
  semanticTest,
  '    expect(verdict.reviewReasons.some((item) => item.startsWith("extra material claim:"))).toBe(true);',
  '    expect(verdict.reviewReasons.some((item) => item.startsWith("extra material claim:"))).toBe(false);\n    expect(verdict.extraMaterialClaims).toHaveLength(1);',
  "semantic-v1 extra-material review assertion"
);
writeFileSync(semanticTestPath, semanticTest, "utf8");

const classificationPath = "rules-assistant/r13-classification.js";
let classification = readFileSync(classificationPath, "utf8");
classification = replaceOnce(
  classification,
  '  if (/\\b(?:unless|except|versus|vs\\.?|interact|interaction|override|same as|different from)\\b/i.test(rawQuestion)) {\n    return false;\n  }',
  '  const conditionalQuestion = rawQuestion.replace(/\\bif able\\b/gi, "");\n  if (/\\b(?:if|unless|except|versus|vs\\.?|interact|interaction|override|same as|different from)\\b/i.test(conditionalQuestion)) {\n    return false;\n  }',
  "named-authority conditional guard"
);
classification = replaceOnce(
  classification,
  '/\\bgambit\\b[\\s\\S]{0,100}\\bgo(?:es)?\\s+to\\s+its?\\s+owners?[\'’]?\\s+graveyard\\b/',
  '/\\bgambit\\b[\\s\\S]{0,100}\\bgo(?:es)?\\s+to\\s+its?\\s+owner(?:[\'’]s|s[\'’]?)?\\s+graveyard\\b/',
  "Gambit owner possessive matcher"
);
classification = replaceOnce(
  classification,
  '/\\btactic\\b[\\s\\S]{0,100}\\bgo(?:es)?\\s+to\\s+its?\\s+owners?[\'’]?\\s+discard\\s+pile\\b/',
  '/\\btactic\\b[\\s\\S]{0,100}\\bgo(?:es)?\\s+to\\s+its?\\s+owner(?:[\'’]s|s[\'’]?)?\\s+discard\\s+pile\\b/',
  "Tactic owner possessive matcher"
);
classification = replaceOnce(
  classification,
  '/defender\\s+wins?\\s+tied\\s+battle\\s+totals?/',
  '/defender[\\s\\S]{0,80}\\bwins?\\s+tied\\s+battle\\s+totals?/',
  "Defensive Edge direct wording matcher"
);
writeFileSync(classificationPath, classification, "utf8");

const searchPath = "rules-assistant/local-search.js";
let search = readFileSync(searchPath, "utf8");
search = replaceOnce(
  search,
  '  const rawTitle = stripKindPrefix(title);\n  if (rawTitle.length > 2 && normalizedQuery.includes(rawTitle)) score += 95;\n  if (heading.length > 2 && normalizedQuery.includes(heading)) score += 90;',
  '  const rawTitle = stripKindPrefix(title);\n  if (rawTitle.length > 2 && normalizedQuery.includes(rawTitle)) score += 95;\n  if (rawTitle.length > 4 && !rawTitle.includes(" ") && queryTokens.includes(rawTitle)) score += 80;\n  if (heading.length > 2 && normalizedQuery.includes(heading)) score += 90;',
  "single-token named-mechanic title scoring"
);
writeFileSync(searchPath, search, "utf8");

const workerPath = "rules-assistant/worker-v071.js";
let worker = readFileSync(workerPath, "utf8");
worker = replaceOnce(
  worker,
  'const MYSTICS_TRANSMUTATION_AUTHORITY_IDS = [\n  "rulebook:transmutation"\n];',
  'const MYSTICS_TRANSMUTATION_AUTHORITY_IDS = [\n  "rulebook:transmutation"\n];\nconst INQUISITION_CONDEMNATION_AUTHORITY_IDS = [\n  "rulebook:condemnation"\n];',
  "Condemnation authority constant"
);
worker = replaceOnce(
  worker,
  '  const mysticsTransmutationTopic = /\\btransmutation\\b/;',
  '  const mysticsTransmutationTopic = /\\btransmut(?:ation|e|es|ed|ing)\\b/;\n  const inquisitionCondemnationFocus = /\\bcondemn(?:ation|s|ed|ing)?\\b/.test(current)\n    || (currentWordCount <= 8 && /\\bcondemn(?:ation|s|ed|ing)?\\b/.test(recent));',
  "inflected named-mechanic focus"
);
worker = replaceOnce(
  worker,
  '    : namedCardSpecificityFocus && !specificRulePrecedenceFocus && !mysticsTransmutationFocus && !peaceTreatyFocus && !shockAndAweFocus && !intelligenceInterferenceFocus && !battleCardReplacementFocus && !genericBattleCardDestinationFocus && !battleCardQuantityFocus && !acceptedTermsFocus',
  '    : namedCardSpecificityFocus && !specificRulePrecedenceFocus && !inquisitionCondemnationFocus && !mysticsTransmutationFocus && !peaceTreatyFocus && !shockAndAweFocus && !intelligenceInterferenceFocus && !battleCardReplacementFocus && !genericBattleCardDestinationFocus && !battleCardQuantityFocus && !acceptedTermsFocus',
  "named-card priority exclusion"
);
worker = replaceOnce(
  worker,
  '    : specificRulePrecedenceFocus\n      ? specificRulePrecedenceAuthorityIds\n    : mysticsTransmutationFocus\n      ? mysticsTransmutationAuthorityIds',
  '    : specificRulePrecedenceFocus\n      ? specificRulePrecedenceAuthorityIds\n    : inquisitionCondemnationFocus\n      ? INQUISITION_CONDEMNATION_AUTHORITY_IDS\n    : mysticsTransmutationFocus\n      ? mysticsTransmutationAuthorityIds',
  "Condemnation retrieval priority branch"
);
worker = replaceOnce(
  worker,
  '18. When an effect grants Actions in multiple phases and requires at least one of those Actions to be a phase-limited Feature, treat that requirement as constraining which granted Action must be used for the Feature, not as permission to change the Feature\'s timing. If only one granted phase is legal for that Feature, the Feature must be used in that phase; another legal Action must fill any other granted phase.\n${ADJUDICATION_GUIDE}',
  '18. When an effect grants Actions in multiple phases and requires at least one of those Actions to be a phase-limited Feature, treat that requirement as constraining which granted Action must be used for the Feature, not as permission to change the Feature\'s timing. If only one granted phase is legal for that Feature, the Feature must be used in that phase; another legal Action must fill any other granted phase.\n19. Do not classify a terse gameplay-rules question out_of_scope merely because it uses an inflected or colloquial form of a supplied named mechanic. When retrieved authority directly matches the gameplay term or procedure being asked about, treat the question as in scope and adjudicate it from that authority.\n${ADJUDICATION_GUIDE}',
  "terse named-mechanic scope instruction"
);
writeFileSync(workerPath, worker, "utf8");
