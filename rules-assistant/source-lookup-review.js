import { persistSmartInteraction } from "./rules-persistence.js";

const RULES_VERSION = "v0.7.1";
const DEFAULT_ALLOWED_ORIGINS = ["https://gauntlet.run", "https://www.gauntlet.run"];

function allowedOrigins(env) {
  const configured = String(env?.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function corsHeaders(origin) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return headers;
}

function jsonResponse(payload, status, origin = "") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(origin)
  });
}

export function sanitizeClientSourceLookupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const rulesVersion = String(payload.rulesVersion || "").trim();
  const sessionId = String(payload.sessionId || "").trim();
  const question = String(payload.question || "").trim();
  const answer = String(payload.answer || "").trim();

  if (rulesVersion !== RULES_VERSION) throw new Error(`Only ${RULES_VERSION} source lookups can be recorded here.`);
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) throw new Error("Invalid Rules Arbiter session id.");
  if (!question || question.length > 2000) throw new Error("Question must contain 1–2000 characters.");
  if (!answer || answer.length > 4000) throw new Error("Answer must contain 1–4000 characters.");

  const sources = (Array.isArray(payload.sources) ? payload.sources : []).slice(0, 8).map((source) => ({
    id: String(source?.id || source?.canonicalId || "").slice(0, 80),
    title: String(source?.title || "Canonical source").slice(0, 300),
    sourcePath: String(source?.sourcePath || "").slice(0, 500),
    sourceUrl: String(source?.sourceUrl || "").slice(0, 1000),
    excerpt: String(source?.excerpt || source?.body || "").slice(0, 5000)
  }));

  return {
    sessionId,
    question,
    answer,
    gameVersion: RULES_VERSION,
    rulingStatus: "source_lookup",
    confidence: "low",
    mode: "source_lookup",
    model: null,
    sources,
    diagnostics: {
      reasoningEffort: "none",
      retrievalQueries: [question],
      candidateSources: sources.map(({ id, title, sourcePath, sourceUrl }) => ({ id, title, sourcePath, sourceUrl }))
    }
  };
}

export async function handleClientSourceLookupReview(request, env) {
  const origin = String(request.headers.get("Origin") || "").trim();
  const allowed = allowedOrigins(env);

  if (request.method === "OPTIONS") {
    if (!origin || !allowed.has(origin)) return jsonResponse({ error: "Origin not allowed." }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, allowed.has(origin) ? origin : "");
  if (!origin || !allowed.has(origin)) return jsonResponse({ error: "Origin not allowed." }, 403);

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 40_000) {
    return jsonResponse({ error: "Request body is too large." }, 413, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, origin);
  }

  let record;
  try {
    record = sanitizeClientSourceLookupPayload(payload);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400, origin);
  }

  const interactionId = await persistSmartInteraction(env, record);
  if (!interactionId) {
    return jsonResponse({ error: "Rules Arbiter review storage is temporarily unavailable." }, 503, origin);
  }

  return jsonResponse({ ok: true, interactionId }, 201, origin);
}
