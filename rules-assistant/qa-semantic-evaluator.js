import { authorizeGitHubActionsQa } from "./github-actions-qa-auth.js";

export const QA_SEMANTIC_EVALUATOR_REVISION = "semantic-v2";

const FALLBACK_MODEL = "gpt-5.6-terra";
const MAX_REQUIRED_CRITERIA = 16;
const MAX_FORBIDDEN_CRITERIA = 12;
const MAX_CRITERION_ID_LENGTH = 120;
const MAX_CRITERION_STATEMENT_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;

const EVALUATOR_PROMPT = `You are a strict semantic equivalence evaluator for Gauntlet Rules Arbiter QA.

You are evaluating a candidate answer, not answering the game-rules question yourself. The supplied required and forbidden propositions are authoritative for this evaluation. Do not use outside Gauntlet knowledge, thematic expectations, or unstated rules.

For every required proposition, classify the candidate answer as exactly one of:
- satisfied: the answer communicates the same gameplay proposition, even with different wording, word order, pronouns, grammatical number, or synonymous phrasing;
- contradicted: the answer communicates a materially incompatible gameplay proposition;
- missing: the proposition is not communicated by the answer;
- unclear: the wording is too ambiguous to determine whether the proposition is satisfied or contradicted.

For every forbidden proposition, classify the candidate answer as exactly one of:
- absent: the forbidden gameplay proposition is not asserted;
- present: the answer asserts the forbidden gameplay proposition or a semantic equivalent;
- unclear: the answer may assert it, but the wording is genuinely ambiguous.

Semantic evaluation rules:
1. Never require an exact phrase or substring. Paraphrases count when they preserve the rule.
2. Treat negation, quantities, timing, conditions, scope, zones, ownership/control, triggers, costs, and destinations as material. A change to any of those can change the verdict.
3. Do not mark a proposition missing merely because the answer adds harmless grammar such as "your", "their", "normal", or a possessive, unless that addition changes the rule.
4. Do not infer an unstated proposition from topical similarity. The candidate must actually communicate the required rule.
5. A concise answer may satisfy a proposition without reproducing its rationale.
6. List an extra material claim only when the candidate asserts an additional gameplay rule, permission, prohibition, timing, zone, cost, quantity, trigger, ownership/control rule, or outcome that is not already equivalent to or logically contained in a supplied proposition. Do not list restatements, rhetorical explanation, or non-gameplay prose. Extra material claims are telemetry only: because the cited rules authority is not supplied to you, do not assume an extra claim is unsupported merely because it falls outside the benchmark propositions.
7. Evaluate only the supplied candidate answer. Source selection, ruling classification, citations, style, and infrastructure are graded separately.

Return only the required JSON object.`;

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    required_results: {
      type: "array",
      maxItems: MAX_REQUIRED_CRITERIA,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, maxLength: MAX_CRITERION_ID_LENGTH },
          status: { type: "string", enum: ["satisfied", "contradicted", "missing", "unclear"] },
          reason: { type: "string", minLength: 1, maxLength: 500 }
        },
        required: ["id", "status", "reason"]
      }
    },
    forbidden_results: {
      type: "array",
      maxItems: MAX_FORBIDDEN_CRITERIA,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, maxLength: MAX_CRITERION_ID_LENGTH },
          status: { type: "string", enum: ["absent", "present", "unclear"] },
          reason: { type: "string", minLength: 1, maxLength: 500 }
        },
        required: ["id", "status", "reason"]
      }
    },
    extra_material_claims: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          claim: { type: "string", minLength: 1, maxLength: 500 },
          reason: { type: "string", minLength: 1, maxLength: 500 }
        },
        required: ["claim", "reason"]
      }
    }
  },
  required: ["required_results", "forbidden_results", "extra_material_claims"]
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY_ITEMS).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 1600)
  })).filter((item) => item.content);
}

function validateCriteriaInput(value, { label, maximum, required = false }, failures) {
  if (!Array.isArray(value)) {
    if (required) failures.push("at least one semantic criterion is required");
    else if (value !== undefined) failures.push(`${label} semantic criteria must be an array`);
    return [];
  }
  if (required && !value.length) failures.push("at least one semantic criterion is required");
  if (value.length > maximum) failures.push(`${label} semantic criteria exceed maximum of ${maximum}`);

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      failures.push(`${label} semantic criterion must be an object`);
      continue;
    }
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const statement = typeof item.statement === "string" ? item.statement.trim() : "";
    if (!id) failures.push(`${label} semantic criterion is missing an id`);
    if (id.length > MAX_CRITERION_ID_LENGTH) {
      failures.push(`${label} semantic criterion id exceeds ${MAX_CRITERION_ID_LENGTH} characters`);
    }
    if (!statement) failures.push(`${label} semantic criterion ${id || "<missing>"} is missing a statement`);
    if (statement.length > MAX_CRITERION_STATEMENT_LENGTH) {
      failures.push(`${label} semantic criterion ${id || "<missing>"} statement exceeds ${MAX_CRITERION_STATEMENT_LENGTH} characters`);
    }
    normalized.push({ id, statement });
  }
  return normalized;
}

export function validateSemanticEvaluationPayload(payload) {
  const failures = [];
  const question = String(payload?.question || "").trim();
  const answer = String(payload?.answer || "").trim();
  const semanticCriteria = validateCriteriaInput(
    payload?.semanticCriteria,
    { label: "required", maximum: MAX_REQUIRED_CRITERIA, required: true },
    failures
  );
  const forbiddenSemanticClaims = validateCriteriaInput(
    payload?.forbiddenSemanticClaims,
    { label: "forbidden", maximum: MAX_FORBIDDEN_CRITERIA },
    failures
  );

  if (!question) failures.push("question is required");
  if (question.length > 1200) failures.push("question exceeds 1200 characters");
  if (!answer) failures.push("answer is required");
  if (answer.length > 6000) failures.push("answer exceeds 6000 characters");

  const all = [
    ...semanticCriteria.map((item) => ({ ...item, kind: "required" })),
    ...forbiddenSemanticClaims.map((item) => ({ ...item, kind: "forbidden" }))
  ];
  const seen = new Set();
  for (const item of all) {
    if (item.id && seen.has(item.id)) failures.push(`duplicate semantic criterion id ${item.id}`);
    if (item.id) seen.add(item.id);
  }

  return {
    failures,
    value: {
      caseId: String(payload?.caseId || "").trim().slice(0, 160),
      question,
      history: sanitizeHistory(payload?.history),
      answer,
      rulingStatus: String(payload?.rulingStatus || "").trim().slice(0, 40),
      semanticCriteria,
      forbiddenSemanticClaims
    }
  };
}

function resultIndex(results = []) {
  const byId = new Map();
  const duplicateIds = new Set();
  for (const result of Array.isArray(results) ? results : []) {
    const id = String(result?.id || "").trim();
    if (!id) continue;
    if (byId.has(id)) duplicateIds.add(id);
    else byId.set(id, result);
  }
  return { byId, duplicateIds };
}

export function deriveSemanticVerdict(expected, modelResult) {
  const contractIssues = [];
  const hardFailures = [];
  const reviewReasons = [];
  const required = Array.isArray(expected?.semanticCriteria) ? expected.semanticCriteria : [];
  const forbidden = Array.isArray(expected?.forbiddenSemanticClaims) ? expected.forbiddenSemanticClaims : [];
  const requiredIndex = resultIndex(modelResult?.required_results);
  const forbiddenIndex = resultIndex(modelResult?.forbidden_results);

  for (const id of requiredIndex.duplicateIds) contractIssues.push(`duplicate required result ${id}`);
  for (const id of forbiddenIndex.duplicateIds) contractIssues.push(`duplicate forbidden result ${id}`);

  const requiredIds = new Set(required.map((item) => item.id));
  const forbiddenIds = new Set(forbidden.map((item) => item.id));
  for (const id of requiredIndex.byId.keys()) {
    if (!requiredIds.has(id)) contractIssues.push(`unexpected required result ${id}`);
  }
  for (const id of forbiddenIndex.byId.keys()) {
    if (!forbiddenIds.has(id)) contractIssues.push(`unexpected forbidden result ${id}`);
  }

  for (const criterion of required) {
    const result = requiredIndex.byId.get(criterion.id);
    if (!result) {
      contractIssues.push(`missing required result ${criterion.id}`);
      continue;
    }
    if (["contradicted", "missing"].includes(result.status)) {
      hardFailures.push(`${criterion.id}: ${result.status} — ${String(result.reason || "").trim()}`);
    } else if (result.status === "unclear") {
      reviewReasons.push(`${criterion.id}: unclear — ${String(result.reason || "").trim()}`);
    } else if (result.status !== "satisfied") {
      contractIssues.push(`invalid required status for ${criterion.id}: ${result.status || "missing"}`);
    }
  }

  for (const criterion of forbidden) {
    const result = forbiddenIndex.byId.get(criterion.id);
    if (!result) {
      contractIssues.push(`missing forbidden result ${criterion.id}`);
      continue;
    }
    if (result.status === "present") {
      hardFailures.push(`${criterion.id}: forbidden claim present — ${String(result.reason || "").trim()}`);
    } else if (result.status === "unclear") {
      reviewReasons.push(`${criterion.id}: forbidden claim unclear — ${String(result.reason || "").trim()}`);
    } else if (result.status !== "absent") {
      contractIssues.push(`invalid forbidden status for ${criterion.id}: ${result.status || "missing"}`);
    }
  }

  const extraMaterialClaims = Array.isArray(modelResult?.extra_material_claims)
    ? modelResult.extra_material_claims.filter((item) => String(item?.claim || "").trim())
    : [];
  for (const issue of contractIssues) reviewReasons.push(`evaluator contract: ${issue}`);

  const verdict = hardFailures.length
    ? "fail"
    : reviewReasons.length
      ? "review"
      : "pass";
  return { verdict, hardFailures, reviewReasons, contractIssues, extraMaterialClaims };
}

async function reserveSemanticQaBudget(env, authorization) {
  if (!env?.DB) return { allowed: false, reason: "semantic_qa_budget_store_unavailable" };
  const now = new Date();
  const timestamp = now.toISOString();
  const counters = [
    {
      scope: "qa_semantic_run",
      bucket: `${authorization.runId}:${authorization.runAttempt}`,
      limit: positiveInteger(env.RULES_QA_SEMANTIC_REQUESTS_PER_RUN, 150)
    },
    {
      scope: "qa_semantic_global_day",
      bucket: timestamp.slice(0, 10),
      limit: positiveInteger(env.RULES_QA_SEMANTIC_REQUESTS_PER_DAY, 150)
    },
    {
      scope: "qa_semantic_global_month",
      bucket: timestamp.slice(0, 7),
      limit: positiveInteger(env.RULES_QA_SEMANTIC_REQUESTS_PER_MONTH, 500)
    }
  ];

  try {
    const statements = counters.map(({ scope, bucket, limit }) => env.DB.prepare(`
      INSERT INTO rules_model_usage_budget (scope, bucket, request_count, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(scope, bucket) DO UPDATE SET
        request_count = request_count + 1,
        updated_at = excluded.updated_at
      WHERE request_count < ?
    `).bind(scope, bucket, timestamp, limit));
    const results = await env.DB.batch(statements);
    const blockedIndex = counters.findIndex((_, index) => Number(results?.[index]?.meta?.changes || 0) < 1);
    if (blockedIndex >= 0) {
      return { allowed: false, reason: `${counters[blockedIndex].scope}_limit_reached` };
    }
    return { allowed: true, reason: "semantic_qa_reserved" };
  } catch (error) {
    console.error("Rules Arbiter semantic QA budget reservation failed closed", error);
    return { allowed: false, reason: "semantic_qa_budget_store_error" };
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

async function callSemanticEvaluator({ env, authorization, item }) {
  const userText = [
    `CASE ID\n${item.caseId || "unspecified"}`,
    `QUESTION\n${item.question}`,
    `RECENT CONTEXT\n${item.history.length ? item.history.map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`).join("\n") : "None."}`,
    `CANDIDATE RULING STATUS\n${item.rulingStatus || "not supplied"}`,
    `CANDIDATE ANSWER\n${item.answer}`,
    `REQUIRED PROPOSITIONS\n${JSON.stringify(item.semanticCriteria)}`,
    `FORBIDDEN PROPOSITIONS\n${JSON.stringify(item.forbiddenSemanticClaims)}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.RULES_QA_EVALUATOR_MODEL || env.OPENAI_MODEL || FALLBACK_MODEL,
      store: false,
      reasoning: { effort: env.RULES_QA_EVALUATOR_REASONING_EFFORT || "medium" },
      max_output_tokens: 1200,
      safety_identifier: `gauntlet_rules_qa_${authorization.runId}`,
      prompt_cache_key: "gauntlet_rules_semantic_qa_v1",
      input: [
        { role: "system", content: [{ type: "input_text", text: EVALUATOR_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "gauntlet_rules_semantic_qa_v1",
          strict: true,
          schema: RESULT_SCHEMA
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Semantic evaluator model request failed (${response.status}): ${body.slice(0, 300)}`);
    error.upstreamStatus = response.status;
    throw error;
  }
  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("Semantic evaluator model returned no output text.");
  const parsed = JSON.parse(outputText);
  return {
    parsed,
    model: env.RULES_QA_EVALUATOR_MODEL || env.OPENAI_MODEL || FALLBACK_MODEL,
    usage: payload?.usage || null
  };
}

export async function handleQaSemanticEvaluation(request, env) {
  if (request.method !== "POST") return json({ error: "Not found." }, 404);

  const authorization = await authorizeGitHubActionsQa(request);
  if (!authorization.authorized) {
    return json({ error: "Semantic QA evaluator authorization failed.", reason: authorization.reason }, 403);
  }
  if (!env?.OPENAI_API_KEY) return json({ error: "Semantic QA evaluator model is not configured." }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  const validation = validateSemanticEvaluationPayload(payload);
  if (validation.failures.length) {
    return json({ error: "Invalid semantic QA request.", details: validation.failures }, 400);
  }

  const budget = await reserveSemanticQaBudget(env, authorization);
  if (!budget.allowed) return json({ error: "Semantic QA evaluator budget unavailable.", reason: budget.reason }, 429);

  try {
    const evaluated = await callSemanticEvaluator({
      env,
      authorization,
      item: validation.value
    });
    const derived = deriveSemanticVerdict(validation.value, evaluated.parsed);
    return json({
      evaluatorRevision: QA_SEMANTIC_EVALUATOR_REVISION,
      model: evaluated.model,
      verdict: derived.verdict,
      requiredResults: evaluated.parsed.required_results,
      forbiddenResults: evaluated.parsed.forbidden_results,
      extraMaterialClaims: derived.extraMaterialClaims,
      hardFailures: derived.hardFailures,
      reviewReasons: derived.reviewReasons,
      contractIssues: derived.contractIssues,
      usage: evaluated.usage
    });
  } catch (error) {
    console.error("Rules Arbiter semantic QA evaluation failed", error);
    return json({
      error: "Semantic QA evaluator could not complete the request.",
      upstreamStatus: Number.isInteger(error?.upstreamStatus) ? error.upstreamStatus : null
    }, 502);
  }
}
