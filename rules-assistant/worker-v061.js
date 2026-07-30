import legacyWorker from "./worker.js";
import {
  defaultSourceUrls,
  loadRulesCorpus,
  retrieveRules
} from "./local-search.js";

const RULES_VERSION = "v0.6.1";
const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the canonical v0.6.1 pre-release playtest edition.

Use only the source passages supplied with the question. Do not use outside knowledge, prior conversations, old Gauntlet versions, or invented rulings.

Apply these rules:
1. A specific card, Leader, faction, Territory, or supplemental-component rule overrides a general rule.
2. Resolve instructions in the order written unless a supplied rule says otherwise.
3. Distinguish an explicit rule from an inferred ruling. If the sources do not resolve the question, classify it as unresolved.
4. If the supplied sources do not answer the question, say: "The current v0.6.1 rules do not specify this clearly."
5. Never silently fill a gap or invent precedence. State the unresolved point and identify the closest relevant source.
6. Identify attacker, defender, controller, owner, or active player whenever those roles determine the result.
7. Reveal and resolution are different timings. Do not treat a revealed effect as resolved unless the supplied rule says so.
8. Keep the answer direct and useful at the table. Explain the sequence only when timing or interaction matters.
9. Cite only supplied source IDs. Do not cite a source that does not support the answer.

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

let corpusPromise;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method === "GET" && ["/", "/health", "/api/health"].includes(url.pathname)) {
      return jsonResponse({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: RULES_VERSION,
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
        interactionLogging: Boolean(env.DB),
        playtestLinking: Boolean(env.DB)
      }, 200, allowedOrigin);
    }

    if (
      ["/admin", "/admin/"].includes(url.pathname) ||
      url.pathname.startsWith("/api/admin/") ||
      (request.method === "POST" && ["/api/feedback", "/feedback"].includes(url.pathname))
    ) {
      return legacyWorker.fetch(request, env);
    }

    if (request.method !== "POST" || !["/api/rules", "/rules"].includes(url.pathname)) {
      return jsonResponse({ error: "Not found." }, 404, allowedOrigin);
    }
    if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);
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
    if (!question) return jsonResponse({ error: "A question is required." }, 400, allowedOrigin);
    if (question.length > 600) {
      return jsonResponse({ error: "Questions are limited to 600 characters." }, 400, allowedOrigin);
    }

    const requestedVersion = String(payload?.rulesVersion || RULES_VERSION).trim();
    if (requestedVersion !== RULES_VERSION) {
      return jsonResponse({
        error: `This Rules Arbiter answers ${RULES_VERSION} questions only.`
      }, 409, allowedOrigin);
    }

    const history = sanitizeHistory(payload?.history);
    const sessionId = sanitizeSessionId(payload?.sessionId);
    const playtestContext = sanitizePlaytestContext(payload);

    try {
      const corpus = await getCorpus(env);
      if (corpus.version && corpus.version !== RULES_VERSION) {
        throw new Error(`Canonical corpus reports ${corpus.version}, expected ${RULES_VERSION}.`);
      }

      const sources = retrieveRules(corpus, question, { limit: 8, excerptLength: 1300 });
      if (!sources.length) {
        const result = {
          answer: "The current v0.6.1 rules do not specify this clearly, and I could not identify a sufficiently relevant canonical passage.",
          rulingStatus: "unresolved",
          confidence: "low",
          sources: [],
          version: corpus.version || RULES_VERSION
        };
        result.interactionId = await persistInteraction(env, {
          sessionId,
          ...playtestContext,
          question,
          answer: result.answer,
          gameVersion: result.version,
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
        version: corpus.version || RULES_VERSION
      };
      result.interactionId = await persistInteraction(env, {
        sessionId,
        ...playtestContext,
        question,
        answer: result.answer,
        gameVersion: result.version,
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
        error: "The Rules Arbiter could not complete the request."
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

  const responsePayload = await response.json();
  const outputText = extractOutputText(responsePayload);
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
          source_count, playtest_session_id, sheet_serial, review_status,
          issue_types_json, reviewer_notes, resolution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', '[]', '', '')
      `).bind(
        id,
        record.sessionId,
        previous?.id || null,
        sequenceIndex,
        createdAt,
        createdAt,
        record.question,
        record.answer,
        record.gameVersion || RULES_VERSION,
        record.rulingStatus || "unresolved",
        record.confidence || "low",
        record.mode || "ai",
        record.model || null,
        sourceRows.length,
        record.playtestSessionId || null,
        record.sheetSerial || null
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
    await linkFormalPlaytest(env.DB, id, record, sourceRows, createdAt);
    return id;
  } catch (error) {
    console.error("Could not persist rules interaction", error);
    return null;
  }
}

async function linkFormalPlaytest(db, interactionId, record, sources, timestamp) {
  if (!record.playtestSessionId || !record.sheetSerial) return;
  try {
    const session = await db.prepare(`
      SELECT id, sheet_serial
      FROM playtest_sessions
      WHERE id = ? AND sheet_serial = ?
    `).bind(record.playtestSessionId, record.sheetSerial).first();
    if (!session) return;

    const result = await db.prepare(`
      INSERT OR IGNORE INTO playtest_arbiter_links (
        id, session_id, interaction_id, classification, question_excerpt,
        answer_excerpt, source_json, linked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      session.id,
      interactionId,
      record.rulingStatus || null,
      String(record.question || "").slice(0, 300) || null,
      String(record.answer || "").slice(0, 500) || null,
      JSON.stringify(sources.map(({ id, title, sourcePath, sourceUrl }) => ({
        id,
        title,
        sourcePath,
        sourceUrl
      }))),
      timestamp
    ).run();

    if (Number(result?.meta?.changes || 0) > 0) {
      await db.prepare(`
        INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
        VALUES (?, ?, 'arbiter_linked', ?, ?)
      `).bind(
        crypto.randomUUID(),
        session.id,
        JSON.stringify({ interactionId, classification: record.rulingStatus || null }),
        timestamp
      ).run();
    }
  } catch (error) {
    console.error("Could not link Rules Arbiter interaction to formal playtest", error);
  }
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

export function sanitizePlaytestContext(payload) {
  const playtestSessionId = String(payload?.playtestSessionId || "").trim();
  const sheetSerial = String(payload?.sheetSerial || "").trim().toUpperCase();
  return {
    playtestSessionId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playtestSessionId)
      ? playtestSessionId
      : null,
    sheetSerial: /^G061-[A-Z0-9]{6,12}$/.test(sheetSerial) ? sheetSerial : null
  };
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
  const allowed = String(
    env.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000"
  ).split(",").map((value) => value.trim()).filter(Boolean);
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

function jsonResponse(value, status, origin) {
  return new Response(JSON.stringify(value), {
    status,
    headers: corsHeaders(origin)
  });
}

async function makeSafetyIdentifier(request, env) {
  const salt = env.SAFETY_ID_SALT || "gauntlet-rules-assistant";
  const address = request.headers.get("CF-Connecting-IP") || "anonymous";
  const input = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `gauntlet_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}
