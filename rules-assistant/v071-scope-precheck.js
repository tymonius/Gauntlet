import { persistSmartInteraction } from "./rules-persistence.js";
import { buildOutOfScopeRuling, isClearlyOutOfScopeQuestion } from "./rules-status.js";
import { BEHAVIOR_REVISION, RULES_VERSION } from "./worker-v071.js";
import { V071_VERSION_LABEL } from "./v071-public-corpus.js";

export const V071_SCOPE_PRECHECK_REVISION = "v071-scope-20260905-1";

const CURRENT_RULE_PATHS = new Set([
  "/rules",
  "/api/rules",
  "/v071/rules",
  "/api/v071/rules"
]);

function text(value) {
  return String(value == null ? "" : value).trim();
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return origin;
  const allowed = String(
    env?.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000"
  ).split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function sanitizeSessionId(value) {
  const candidate = text(value);
  if (/^[a-zA-Z0-9_-]{8,80}$/.test(candidate)) return candidate;
  return crypto.randomUUID();
}

function sanitizeContextValue(value) {
  const normalized = text(value);
  return /^[a-zA-Z0-9_.:-]{3,120}$/.test(normalized) ? normalized : null;
}

function responseHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

export function classifyV071ScopePrecheck(question) {
  return isClearlyOutOfScopeQuestion(question) ? buildOutOfScopeRuling() : null;
}

export async function handleV071ScopePrecheck(request, env = {}) {
  const url = new URL(request.url);
  if (request.method !== "POST" || !CURRENT_RULE_PATHS.has(url.pathname)) return null;

  const origin = allowedOrigin(request, env);
  if (!origin) return null;

  let payload;
  try {
    payload = await request.clone().json();
  } catch {
    return null;
  }

  if (text(payload?.rulesVersion) !== RULES_VERSION) return null;
  const question = text(payload?.question);
  if (!question || question.length > 600) return null;

  const ruling = classifyV071ScopePrecheck(question);
  if (!ruling) return null;

  const sessionId = sanitizeSessionId(payload?.sessionId);
  const playtestSessionId = sanitizeContextValue(payload?.playtestSessionId);
  const sheetSerial = sanitizeContextValue(payload?.sheetSerial);
  const diagnostics = {
    questionPlan: {
      questionType: "out_of_scope",
      activeSubject: null,
      activeTopic: "scope",
      deterministicCaseId: ruling.id,
      executionPath: "deterministic-scope",
      scopePrecheckRevision: V071_SCOPE_PRECHECK_REVISION
    },
    retrievalQueries: [],
    candidateSources: [],
    reasoningEffort: "none",
    verification: null,
    retryCount: 0,
    gameState: null,
    corpusHash: ""
  };

  const interactionId = await persistSmartInteraction(env, {
    sessionId,
    playtestSessionId,
    sheetSerial,
    question,
    answer: ruling.answer,
    gameVersion: RULES_VERSION,
    rulingStatus: ruling.rulingStatus,
    confidence: ruling.confidence,
    mode: "retrieval_only",
    model: null,
    sources: [],
    diagnostics
  });

  return new Response(JSON.stringify({
    answer: ruling.answer,
    rulingStatus: ruling.rulingStatus,
    confidence: ruling.confidence,
    responseType: "out_of_scope",
    sources: [],
    executionPath: "deterministic-scope",
    interactionId: interactionId || null,
    version: RULES_VERSION,
    versionLabel: V071_VERSION_LABEL,
    reconstruction: false,
    published: true,
    currentPublicRelease: RULES_VERSION,
    behaviorRevision: BEHAVIOR_REVISION,
    scopePrecheckRevision: V071_SCOPE_PRECHECK_REVISION
  }), {
    status: 200,
    headers: responseHeaders(origin)
  });
}
