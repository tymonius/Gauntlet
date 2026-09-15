export const SEMANTIC_GRADING_MODE = "semantic-v1";

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCriteria(caseId, criteria, label, failures) {
  if (!Array.isArray(criteria)) return;
  const seen = new Set();
  for (const criterion of criteria) {
    const id = String(criterion?.id || "").trim();
    const statement = String(criterion?.statement || "").trim();
    if (!id) failures.push(`${caseId}: ${label} criterion is missing an id`);
    if (!statement) failures.push(`${caseId}: ${label} criterion ${id || "<missing>"} is missing a statement`);
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
    validateCriteria(caseId, item?.semanticCriteria, "required", failures);
    validateCriteria(caseId, item?.forbiddenSemanticClaims, "forbidden", failures);

    const requiredIds = new Set((item?.semanticCriteria || []).map((criterion) => String(criterion?.id || "").trim()).filter(Boolean));
    for (const criterion of item?.forbiddenSemanticClaims || []) {
      const id = String(criterion?.id || "").trim();
      if (id && requiredIds.has(id)) failures.push(`${caseId}: semantic criterion id ${id} is reused across required and forbidden criteria`);
    }

    if (Array.isArray(item?.expectedAnswerPatterns) && item.expectedAnswerPatterns.length) {
      failures.push(`${caseId}: semantic-v1 forbids expectedAnswerPatterns; use semanticCriteria instead`);
    }
    if (Array.isArray(item?.forbiddenAnswerPatterns) && item.forbiddenAnswerPatterns.length) {
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
