export const SEMANTIC_GRADING_MODE = "semantic-v1";

const MAX_REQUIRED_CRITERIA = 16;
const MAX_FORBIDDEN_CRITERIA = 12;
const MAX_CRITERION_ID_LENGTH = 120;
const MAX_CRITERION_STATEMENT_LENGTH = 1200;

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCriteria(caseId, criteria, label, failures, maximum) {
  if (!Array.isArray(criteria)) {
    failures.push(`${caseId}: ${label} criteria must be an array`);
    return;
  }
  if (criteria.length > maximum) {
    failures.push(`${caseId}: ${label} criteria exceed maximum of ${maximum}`);
  }

  const seen = new Set();
  for (const criterion of criteria) {
    if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
      failures.push(`${caseId}: ${label} criterion must be an object`);
      continue;
    }

    const id = typeof criterion.id === "string" ? criterion.id.trim() : "";
    const statement = typeof criterion.statement === "string" ? criterion.statement.trim() : "";
    if (!id) failures.push(`${caseId}: ${label} criterion is missing an id`);
    if (id.length > MAX_CRITERION_ID_LENGTH) {
      failures.push(`${caseId}: ${label} criterion id exceeds ${MAX_CRITERION_ID_LENGTH} characters`);
    }
    if (!statement) failures.push(`${caseId}: ${label} criterion ${id || "<missing>"} is missing a statement`);
    if (statement.length > MAX_CRITERION_STATEMENT_LENGTH) {
      failures.push(`${caseId}: ${label} criterion ${id || "<missing>"} statement exceeds ${MAX_CRITERION_STATEMENT_LENGTH} characters`);
    }
    if (id && seen.has(id)) failures.push(`${caseId}: duplicate ${label} criterion id ${id}`);
    if (id) seen.add(id);
  }
}

export function validateSemanticBenchmark(benchmark) {
  const failures = [];
  if (benchmark?.gradingMode !== SEMANTIC_GRADING_MODE) return failures;
  if (!Array.isArray(benchmark?.cases) || !benchmark.cases.length) {
    return ["semantic-v1 benchmark has no cases"];
  }

  const seenCaseIds = new Set();
  for (const item of benchmark.cases) {
    const caseId = String(item?.id || "").trim() || "<missing-case-id>";
    if (!nonemptyString(item?.id)) failures.push("semantic-v1 case is missing an id");
    if (seenCaseIds.has(caseId)) failures.push(`duplicate semantic-v1 case id ${caseId}`);
    seenCaseIds.add(caseId);

    if (!Array.isArray(item?.semanticCriteria) || !item.semanticCriteria.length) {
      failures.push(`${caseId}: semantic-v1 case requires at least one semanticCriteria entry`);
    }
    validateCriteria(caseId, item?.semanticCriteria, "required", failures, MAX_REQUIRED_CRITERIA);

    if (item?.forbiddenSemanticClaims !== undefined && !Array.isArray(item.forbiddenSemanticClaims)) {
      failures.push(`${caseId}: forbidden criteria must be an array`);
    } else {
      validateCriteria(caseId, item?.forbiddenSemanticClaims || [], "forbidden", failures, MAX_FORBIDDEN_CRITERIA);
    }

    const requiredIds = new Set((item?.semanticCriteria || [])
      .map((criterion) => typeof criterion?.id === "string" ? criterion.id.trim() : "")
      .filter(Boolean));
    for (const criterion of item?.forbiddenSemanticClaims || []) {
      const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
      if (id && requiredIds.has(id)) failures.push(`${caseId}: semantic criterion id ${id} is reused across required and forbidden criteria`);
    }

    if (Object.prototype.hasOwnProperty.call(item || {}, "expectedAnswerPatterns")) {
      failures.push(`${caseId}: semantic-v1 forbids expectedAnswerPatterns; use semanticCriteria instead`);
    }
    if (Object.prototype.hasOwnProperty.call(item || {}, "forbiddenAnswerPatterns")) {
      failures.push(`${caseId}: semantic-v1 forbids forbiddenAnswerPatterns; use forbiddenSemanticClaims instead`);
    }
  }
  return failures;
}

export function semanticCaseMap(benchmark) {
  return new Map((benchmark?.cases || []).map((item) => [item.id, item]));
}

export function summarizeSemanticResults(results) {
  const semantic = { pass: 0, fail: 0, review: 0, notEvaluated: 0 };
  const revisions = new Set();
  const models = new Set();
  for (const result of results || []) {
    const evaluation = result?.semanticEvaluation;
    if (!evaluation) {
      semantic.notEvaluated += 1;
      continue;
    }
    const verdict = String(evaluation?.verdict || "");
    if (Object.hasOwn(semantic, verdict)) semantic[verdict] += 1;
    else semantic.review += 1;
    if (evaluation?.evaluatorRevision) revisions.add(String(evaluation.evaluatorRevision));
    if (evaluation?.model) models.add(String(evaluation.model));
  }
  return {
    ...semantic,
    evaluatorRevisions: [...revisions].sort(),
    models: [...models].sort()
  };
}

export function semanticFailures(evaluation) {
  if (!evaluation) return ["infrastructure: semantic evaluator result is missing"];
  if (evaluation.verdict === "fail") {
    const reasons = Array.isArray(evaluation.hardFailures) && evaluation.hardFailures.length
      ? evaluation.hardFailures
      : ["semantic evaluator returned fail without a reason"];
    return reasons.map((reason) => `semantic: ${reason}`);
  }
  if (evaluation.verdict === "review") {
    const reasons = Array.isArray(evaluation.reviewReasons) && evaluation.reviewReasons.length
      ? evaluation.reviewReasons
      : ["semantic evaluator requested manual review without a reason"];
    return reasons.map((reason) => `semantic-review: ${reason}`);
  }
  if (evaluation.verdict !== "pass") {
    return [`infrastructure: semantic evaluator returned invalid verdict ${evaluation.verdict || "missing"}`];
  }
  return [];
}
