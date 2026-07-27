import { ADMIN_PAGE } from "./admin-page.js";
import {
  defaultSourceUrls,
  loadRulesCorpus,
  retrieveRules
} from "./local-search.js";

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the canonical v0.6.0 pre-release playtest edition.

Use only the source passages supplied with the question. Do not use outside knowledge, prior conversations, old Gauntlet versions, or invented rulings.

Apply these rules:
1. A specific card, Leader, faction, Territory, or supplemental-component rule overrides a general rule.
2. Resolve instructions in the order written unless a supplied rule says otherwise.
3. Distinguish an explicit rule from an interpretation.
4. If the supplied sources do not answer the question, say: "The current v0.6.0 rules do not specify this clearly."
5. Never silently fill a gap. State the unresolved point and identify the closest relevant source.
6. Keep the answer direct and useful at the table. Explain the sequence only when timing or interaction matters.
7. Cite only supplied source IDs. Do not cite a source that does not support the answer.

Return the required JSON object and no additional text.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 2400 },
    ruling_status: {
      type: "string",
      enum: ["explicit", "inferred", "unresolved"]
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"]
    },
    source_ids: {
      type: "array",
      items: { type: "string" },
      maxItems: 6
    }
  },
  required: ["answer", "ruling_status", "confidence", "source_ids"]
};

const REVIEW_STATUSES = new Set([
  "unreviewed",
  "correct",
  "needs_correction",
  "rules_unclear",
  "duplicate"
]);
const FEEDBACK_RATINGS = new Set(["yes", "unclear", "incorrect"]);
const ISSUE_TYPES = new Set([
  "incorrect_answer",
  "missing_rule",
  "ambiguous_rule",
  "inconsistent_terminology",
  "uncovered_interaction",
  "unclear_explanation",
  "retrieval_failure",
  "duplicate"
]);
const RESOLUTIONS = new Set([
  "",
  "no_action",
  "prompt_fix",
  "retrieval_fix",
  "source_data_fix",
  "rule_rewrite",
  "faq_addition",
  "other"
]);

let corpusPromise;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin)
      });
    }

    if (request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)) {
      return htmlResponse(ADMIN_PAGE);
    }

    if (request.method === "GET" && ["/", "/health", "/api/health"].includes(url.pathname)) {
      return jsonResponse({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: "v0.6.0",
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
        interactionLogging: Boolean(env.DB)
      }, 200, allowedOrigin);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      return handleAdminRequest(request, env, url, allowedOrigin);
    }

    if (request.method === "POST" && ["/api/feedback", "/feedback"].includes(url.pathname)) {
      if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);
      return handleFeedback(request, env, allowedOrigin);
    }

    if (request.method !== "POST" || !["/api/rules", "/rules"].includes(url.pathname)) {
      return jsonResponse({ error: "Not found." }, 404, allowedOrigin);
    }

    if (!allowedOrigin) {
      return jsonResponse({ error: "Origin not allowed." }, 403, null);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: "The rules assistant is not configured." }, 503, allowedOrigin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be JSON." }, 400, allowedOrigin);
    }

    const question = String(payload?.question || "").trim();
    if (!question) {
      return jsonResponse({ error: "A question is required." }, 400, allowedOrigin);
    }
    if (question.length > 600) {
      return jsonResponse({ error: "Questions are limited to 600 characters." }, 400, allowedOrigin);
    }

    const history = sanitizeHistory(payload?.history);
    const sessionId = sanitizeSessionId(payload?.sessionId);

    try {
      const corpus = await getCorpus(env);
      const sources = retrieveRules(corpus, question, { limit: 8, excerptLength: 1300 });
      if (!sources.length) {
        const result = {
          answer: "The current v0.6.0 rules do not specify this clearly, and I could not identify a sufficiently relevant canonical passage.",
          rulingStatus: "unresolved",
          confidence: "low",
          sources: [],
          version: corpus.version
        };
        result.interactionId = await persistInteraction(env, {
          sessionId,
          question,
          answer: result.answer,
          gameVersion: corpus.version,
          rulingStatus: result.rulingStatus,
          confidence: result.confidence,
          mode: "retrieval_only",
          model: null,
          sources: []
        });
        return jsonResponse(result, 200, allowedOrigin);
      }

      const modelResult = await askOpenAI({
        env,
        request,
        question,
        history,
        sources
      });

      const usedSources = selectUsedSources(sources, modelResult.source_ids);
      const result = {
        answer: modelResult.answer,
        rulingStatus: modelResult.ruling_status,
        confidence: modelResult.confidence,
        sources: usedSources,
        version: corpus.version
      };
      result.interactionId = await persistInteraction(env, {
        sessionId,
        question,
        answer: result.answer,
        gameVersion: corpus.version,
        rulingStatus: result.rulingStatus,
        confidence: result.confidence,
        mode: "ai",
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
        sources: usedSources
      });
      return jsonResponse(result, 200, allowedOrigin);
    } catch (error) {
      console.error("Rules assistant failure", error);
      return jsonResponse({
        error: "The rules assistant could not complete the request."
      }, 502, allowedOrigin);
    }
  }
};

async function getCorpus(env) {
  if (!corpusPromise) {
    const urls = defaultSourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");
    corpusPromise = loadRulesCorpus({ ...urls }).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

async function askOpenAI({ env, request, question, history, sources }) {
  const sourceText = sources.map((source) => [
    `[${source.id}] ${source.title}`,
    `Path: ${source.sourcePath}`,
    source.body
  ].join("\n")).join("\n\n---\n\n");

  const historyText = history.length
    ? history.map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n")
    : "No prior conversation.";

  const userText = [
    `QUESTION\n${question}`,
    `RECENT CONVERSATION\n${historyText}`,
    `CANONICAL SOURCES\n${sourceText}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      reasoning: { effort: env.OPENAI_REASONING_EFFORT || "low" },
      max_output_tokens: 900,
      safety_identifier: await makeSafetyIdentifier(request, env),
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userText }]
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "gauntlet_rules_answer",
          strict: true,
          schema: OUTPUT_SCHEMA
        }
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OpenAI returned no output text.");

  try {
    return JSON.parse(outputText);
  } catch {
    throw new Error("OpenAI returned invalid structured output.");
  }
}

async function persistInteraction(env, record) {
  if (!env.DB) return null;

  try {
    const previous = await env.DB.prepare(`
      SELECT id, sequence_index
      FROM rules_interactions
      WHERE session_id = ?
      ORDER BY sequence_index DESC, created_at DESC
      LIMIT 1
    `).bind(record.sessionId).first();

    const id = crypto.randomUUID();
    const sequenceIndex = Number(previous?.sequence_index || 0) + 1;
    const createdAt = new Date().toISOString();
    const sourceRows = Array.isArray(record.sources) ? record.sources.slice(0, 6) : [];
    const statements = [
      env.DB.prepare(`
        INSERT INTO rules_interactions (
          id, session_id, previous_interaction_id, sequence_index, created_at, updated_at,
          question, answer, game_version, ruling_status, confidence, answer_mode, model,
          source_count, review_status, issue_types_json, reviewer_notes, resolution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', '[]', '', '')
      `).bind(
        id,
        record.sessionId,
        previous?.id || null,
        sequenceIndex,
        createdAt,
        createdAt,
        record.question,
        record.answer,
        record.gameVersion || "v0.6.0",
        record.rulingStatus || "unresolved",
        record.confidence || "low",
        record.mode || "ai",
        record.model || null,
        sourceRows.length
      )
    ];

    sourceRows.forEach((source, index) => {
      statements.push(env.DB.prepare(`
        INSERT INTO rules_interaction_sources (
          interaction_id, ordinal, source_id, title, source_path, source_url, excerpt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        index + 1,
        String(source.id || "").slice(0, 80),
        String(source.title || "Canonical source").slice(0, 300),
        String(source.sourcePath || "").slice(0, 500),
        String(source.sourceUrl || "").slice(0, 1000),
        String(source.excerpt || "").slice(0, 4000)
      ));
    });

    await env.DB.batch(statements);
    return id;
  } catch (error) {
    console.error("Could not persist rules interaction", error);
    return null;
  }
}

async function handleFeedback(request, env, origin) {
  if (!env.DB) {
    return jsonResponse({ error: "Interaction logging is not configured." }, 503, origin);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400, origin);
  }

  const interactionId = String(payload?.interactionId || "").trim();
  const rating = String(payload?.rating || "").trim();
  const comment = String(payload?.comment || "").trim().slice(0, 1200);
  if (!/^[0-9a-f-]{36}$/i.test(interactionId)) {
    return jsonResponse({ error: "A valid interaction ID is required." }, 400, origin);
  }
  if (!FEEDBACK_RATINGS.has(rating)) {
    return jsonResponse({ error: "Feedback must be yes, unclear, or incorrect." }, 400, origin);
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE rules_interactions
    SET feedback_rating = ?, feedback_comment = ?, feedback_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(rating, comment, now, now, interactionId).run();

  if (!result?.meta?.changes) {
    return jsonResponse({ error: "Interaction not found." }, 404, origin);
  }
  return jsonResponse({ ok: true }, 200, origin);
}

async function handleAdminRequest(request, env, url, origin) {
  if (!env.DB) {
    return jsonResponse({ error: "Interaction logging is not configured." }, 503, origin);
  }
  if (!env.ADMIN_TOKEN) {
    return jsonResponse({ error: "Admin access is not configured." }, 503, origin);
  }
  if (!await isAdminAuthorized(request, env)) {
    return jsonResponse({ error: "Unauthorized." }, 401, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/summary") {
    const queries = [
      "SELECT COUNT(*) AS count FROM rules_interactions",
      "SELECT COUNT(*) AS count FROM rules_interactions WHERE review_status = 'unreviewed'",
      "SELECT COUNT(*) AS count FROM rules_interactions WHERE feedback_rating IN ('unclear', 'incorrect')",
      "SELECT COUNT(*) AS count FROM rules_interactions WHERE ruling_status = 'unresolved'",
      "SELECT COUNT(*) AS count FROM rules_interactions WHERE confidence = 'low'"
    ];
    const results = await env.DB.batch(queries.map((sql) => env.DB.prepare(sql)));
    return jsonResponse({
      total: countFromResult(results[0]),
      unreviewed: countFromResult(results[1]),
      negativeFeedback: countFromResult(results[2]),
      unresolved: countFromResult(results[3]),
      lowConfidence: countFromResult(results[4])
    }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/interactions") {
    return listAdminInteractions(env, url, origin);
  }

  const detailMatch = /^\/api\/admin\/interactions\/([0-9a-f-]{36})$/i.exec(url.pathname);
  if (detailMatch && request.method === "GET") {
    return getAdminInteraction(env, detailMatch[1], origin);
  }
  if (detailMatch && request.method === "PATCH") {
    return updateAdminInteraction(request, env, detailMatch[1], origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/export") {
    return exportAdminData(env, url, origin);
  }

  return jsonResponse({ error: "Not found." }, 404, origin);
}

async function listAdminInteractions(env, url, origin) {
  const conditions = [];
  const params = [];
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 200);
  const reviewStatus = String(url.searchParams.get("reviewStatus") || "").trim();
  const feedback = String(url.searchParams.get("feedback") || "").trim();
  const rulingStatus = String(url.searchParams.get("rulingStatus") || "").trim();
  const confidence = String(url.searchParams.get("confidence") || "").trim();
  const version = String(url.searchParams.get("version") || "").trim().slice(0, 40);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 50, 200));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  if (q) {
    conditions.push("(question LIKE ? OR answer LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (REVIEW_STATUSES.has(reviewStatus)) {
    conditions.push("review_status = ?");
    params.push(reviewStatus);
  }
  if (FEEDBACK_RATINGS.has(feedback)) {
    conditions.push("feedback_rating = ?");
    params.push(feedback);
  } else if (feedback === "none") {
    conditions.push("feedback_rating IS NULL");
  }
  if (["explicit", "inferred", "unresolved"].includes(rulingStatus)) {
    conditions.push("ruling_status = ?");
    params.push(rulingStatus);
  }
  if (["high", "medium", "low"].includes(confidence)) {
    conditions.push("confidence = ?");
    params.push(confidence);
  }
  if (version) {
    conditions.push("game_version = ?");
    params.push(version);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await env.DB.prepare(`
    SELECT
      id, session_id, sequence_index, created_at, question, answer, game_version,
      ruling_status, confidence, answer_mode, model, source_count, review_status,
      issue_types_json, reviewer_notes, resolution, feedback_rating, feedback_comment,
      feedback_at, updated_at
    FROM rules_interactions
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM rules_interactions ${where}
  `).bind(...params).first();

  return jsonResponse({
    items: (rows.results || []).map(parseInteractionRow),
    total: Number(count?.count || 0),
    limit,
    offset
  }, 200, origin);
}

async function getAdminInteraction(env, id, origin) {
  const row = await env.DB.prepare(`
    SELECT * FROM rules_interactions WHERE id = ?
  `).bind(id).first();
  if (!row) return jsonResponse({ error: "Interaction not found." }, 404, origin);

  const [sources, reviews, session] = await Promise.all([
    env.DB.prepare(`
      SELECT ordinal, source_id, title, source_path, source_url, excerpt
      FROM rules_interaction_sources
      WHERE interaction_id = ?
      ORDER BY ordinal
    `).bind(id).all(),
    env.DB.prepare(`
      SELECT id, created_at, review_status, issue_types_json, reviewer_notes, resolution
      FROM rules_interaction_reviews
      WHERE interaction_id = ?
      ORDER BY created_at DESC, id DESC
    `).bind(id).all(),
    env.DB.prepare(`
      SELECT id, sequence_index, created_at, question, answer, review_status, feedback_rating
      FROM rules_interactions
      WHERE session_id = ?
      ORDER BY sequence_index
    `).bind(row.session_id).all()
  ]);

  return jsonResponse({
    interaction: parseInteractionRow(row),
    sources: sources.results || [],
    reviews: (reviews.results || []).map((review) => ({
      ...review,
      issueTypes: parseJsonArray(review.issue_types_json)
    })),
    session: session.results || []
  }, 200, origin);
}

async function updateAdminInteraction(request, env, id, origin) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400, origin);
  }

  const reviewStatus = String(payload?.reviewStatus || "").trim();
  const issueTypes = Array.isArray(payload?.issueTypes)
    ? [...new Set(payload.issueTypes.map((value) => String(value)).filter((value) => ISSUE_TYPES.has(value)))]
    : [];
  const reviewerNotes = String(payload?.reviewerNotes || "").trim().slice(0, 5000);
  const resolution = String(payload?.resolution || "").trim();
  if (!REVIEW_STATUSES.has(reviewStatus)) {
    return jsonResponse({ error: "Invalid review status." }, 400, origin);
  }
  if (!RESOLUTIONS.has(resolution)) {
    return jsonResponse({ error: "Invalid resolution." }, 400, origin);
  }

  const existing = await env.DB.prepare("SELECT id FROM rules_interactions WHERE id = ?").bind(id).first();
  if (!existing) return jsonResponse({ error: "Interaction not found." }, 404, origin);

  const now = new Date().toISOString();
  const issueTypesJson = JSON.stringify(issueTypes);
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE rules_interactions
      SET review_status = ?, issue_types_json = ?, reviewer_notes = ?, resolution = ?, updated_at = ?
      WHERE id = ?
    `).bind(reviewStatus, issueTypesJson, reviewerNotes, resolution, now, id),
    env.DB.prepare(`
      INSERT INTO rules_interaction_reviews (
        interaction_id, created_at, review_status, issue_types_json, reviewer_notes, resolution
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, now, reviewStatus, issueTypesJson, reviewerNotes, resolution)
  ]);

  return jsonResponse({ ok: true }, 200, origin);
}

async function exportAdminData(env, url, origin) {
  const format = String(url.searchParams.get("format") || "json").toLowerCase();
  const interactions = await env.DB.prepare(`
    SELECT * FROM rules_interactions ORDER BY created_at DESC LIMIT 10000
  `).all();
  const rows = (interactions.results || []).map(parseInteractionRow);

  if (format === "csv") {
    const csv = interactionsToCsv(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gauntlet-rules-interactions-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  const [sources, reviews] = await Promise.all([
    env.DB.prepare(`SELECT * FROM rules_interaction_sources ORDER BY interaction_id, ordinal`).all(),
    env.DB.prepare(`SELECT * FROM rules_interaction_reviews ORDER BY created_at`).all()
  ]);
  return jsonResponse({
    exportedAt: new Date().toISOString(),
    interactions: rows,
    sources: sources.results || [],
    reviews: (reviews.results || []).map((review) => ({
      ...review,
      issueTypes: parseJsonArray(review.issue_types_json)
    }))
  }, 200, origin, {
    "Content-Disposition": `attachment; filename="gauntlet-rules-interactions-${new Date().toISOString().slice(0, 10)}.json"`
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return null;
}

function selectUsedSources(sources, sourceIds) {
  const requested = new Set(Array.isArray(sourceIds) ? sourceIds : []);
  const selected = sources.filter((source) => requested.has(source.id));
  const finalSources = selected.length ? selected : sources.slice(0, 2);
  return finalSources.map(({ id, title, sourcePath, sourceUrl, excerpt }) => ({
    id,
    title,
    sourcePath,
    sourceUrl,
    excerpt
  }));
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-6)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content || "").trim().slice(0, 800)
    }))
    .filter((item) => item.content);
}

export function sanitizeSessionId(value) {
  const candidate = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{8,80}$/.test(candidate)) return candidate;
  return crypto.randomUUID();
}

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return origin;
  const allowed = String(env.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(value, status, origin, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders(origin), ...extraHeaders }
  });
}

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

async function makeSafetyIdentifier(request, env) {
  const salt = env.SAFETY_ID_SALT || "gauntlet-rules-assistant";
  const address = request.headers.get("CF-Connecting-IP") || "anonymous";
  const input = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `gauntlet_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function isAdminAuthorized(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ") || !env.ADMIN_TOKEN) return false;
  return safeEqual(authorization.slice(7), String(env.ADMIN_TOKEN));
}

async function safeEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function countFromResult(result) {
  return Number(result?.results?.[0]?.count || 0);
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseInteractionRow(row) {
  return {
    ...row,
    issueTypes: parseJsonArray(row.issue_types_json)
  };
}

export function interactionsToCsv(rows) {
  const columns = [
    "id", "session_id", "sequence_index", "created_at", "question", "answer",
    "game_version", "ruling_status", "confidence", "answer_mode", "model",
    "source_count", "feedback_rating", "feedback_comment", "feedback_at",
    "review_status", "issue_types_json", "reviewer_notes", "resolution", "updated_at"
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\r\n");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
