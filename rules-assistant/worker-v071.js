import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import {
  V071_RULES_VERSION,
  V071_VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "./v071-public-corpus.js";

export const RULES_VERSION = V071_RULES_VERSION;
const FALLBACK_MODEL = "gpt-5.6-terra";
let corpusPromise;

const ADJUDICATION_GUIDE = `
ADJUDICATION PRINCIPLES
- Apply the supplied current rules and component text first. Specific text overrides general text.
- Exceptions, permissions, additional plays, movement, or reopened timing windows must be granted expressly.
- Do not reopen a completed timing window or reapply an effect unless the supplied rules expressly do so.
- Resolve one instruction as fully as possible before beginning the next.
- Preserve supplied ownership, control, card-zone, and timing defaults unless an effect changes them.
- Prefer the ruling that introduces the least new machinery, preserves meaningful player choices, avoids loops or exploitable repetition, and is consistent with closely analogous supplied interactions.
- A provisional ruling is binding for the rest of the current play session unless a supplied clean authority source directly supersedes it.
`;

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the current canonical v0.7.1 playtest edition.

Use only the supplied published v0.7.1 release passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, later development material, withdrawn Gauntlet releases, historical candidate text, or unstated design facts.

Every gameplay-rules question must receive one of four classifications:
- explicit: the supplied clean authority directly states the answer;
- inferred: the answer is compelled by applying one or more supplied clean rules, with no discretionary gap;
- provisional: the clean rules leave a genuine gap or ambiguity, so make a usable table ruling using only the adjudication principles and analogous supplied interactions;
- out_of_scope: the question is not a Gauntlet gameplay-rules question.

Requirements:
1. State the table ruling first.
2. A specific supplied component rule overrides a general supplied rule.
3. Treat prior provisional rulings from the same session as binding unless a supplied clean authority source contradicts them.
4. For a provisional ruling, clearly distinguish the judgment from written authority, explain the closest supplied analogy or adjudication principle, and state that it applies for the rest of the current game and is logged for designer review.
5. Cite only supplied source IDs that actually support the answer. Explicit or inferred answers require at least one supporting source.
6. Keep the answer direct and useful at the table.
${ADJUDICATION_GUIDE}

Return only the required JSON object.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 2400 },
    ruling_status: {
      type: "string",
      enum: ["explicit", "inferred", "provisional", "out_of_scope"]
    },
    source_ids: {
      type: "array",
      items: { type: "string" },
      maxItems: 6
    }
  },
  required: ["answer", "ruling_status", "source_ids"]
};

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!origin) return json({ error: "Origin not allowed." }, 403, null);
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (
      request.method === "GET" &&
      ["/", "/health", "/api/health", "/v071/health", "/api/v071/health"].includes(url.pathname)
    ) {
      return json({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: RULES_VERSION,
        versionLabel: V071_VERSION_LABEL,
        reconstruction: false,
        published: true,
        currentPublicRelease: "v0.7.1",
        deterministicRuleAnswers: false,
        interactionLogging: Boolean(env.DB),
        sessionRulingContinuity: Boolean(env.DB),
        formalPlaytestLinking: false,
        provisionalRulings: true,
        confidenceDerivedFromSupport: true,
        model: env.OPENAI_MODEL || FALLBACK_MODEL
      }, 200, origin);
    }

    if (
      request.method !== "POST" ||
      !["/rules", "/api/rules", "/v071/rules", "/api/v071/rules"].includes(url.pathname)
    ) {
      return json({ error: "Not found." }, 404, origin);
    }
    if (!origin) return json({ error: "Origin not allowed." }, 403, null);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Request body must be JSON." }, 400, origin);
    }

    const question = String(payload?.question || "").trim();
    if (!question) return json({ error: "A question is required." }, 400, origin);
    if (question.length > 600) {
      return json({ error: "Questions are limited to 600 characters." }, 400, origin);
    }

    const requestedVersion = String(payload?.rulesVersion || "").trim();
    if (requestedVersion !== RULES_VERSION) {
      return json({
        error: `This Rules Arbiter answers ${V071_VERSION_LABEL} questions only.`
      }, 409, origin);
    }

    const suppliedHistory = sanitizeHistory(payload?.history);
    const sessionId = sanitizeSessionId(payload?.sessionId);

    try {
      const corpus = await getCorpus(env);
      const storedHistory = await loadStoredHistory(env, sessionId);
      const history = mergeConversationHistory(storedHistory, suppliedHistory);
      const retrieval = retrieveRules(corpus, contextualQuery(question, history), {
        limit: 10,
        excerptLength: 1300
      });

      if (!env.OPENAI_API_KEY) {
        const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
        const result = {
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          sources: fallback.sources,
          executionPath: "local-source-lookup"
        };
        return answerResponse(result, origin);
      }

      const modelResult = await askOpenAI({ env, request, question, history, sources: retrieval });
      let sources = selectUsedSources(retrieval, modelResult.source_ids);
      const rulingStatus = normalizeRulingStatus(modelResult.ruling_status, sources.length);
      if (rulingStatus === "out_of_scope") sources = [];
      const answer = rulingStatus === "provisional"
        ? ensureProvisionalAnswer(modelResult.answer)
        : String(modelResult.answer || "").trim();
      const confidence = deriveConfidence(rulingStatus, sources.length);

      const result = {
        answer,
        rulingStatus,
        confidence,
        responseType: responseTypeFor(rulingStatus),
        sources,
        executionPath: "model"
      };
      result.interactionId = await persistInteraction(env, {
        sessionId,
        question,
        answer,
        gameVersion: RULES_VERSION,
        rulingStatus,
        confidence,
        mode: "ai",
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        sources
      });
      return answerResponse(result, origin);
    } catch (error) {
      console.error("v0.7.1 Rules Arbiter failure", error);
      return json({ error: "The Rules Arbiter could not complete the request." }, 502, origin);
    }
  }
};

async function getCorpus(env) {
  if (!corpusPromise) {
    const urls = defaultV071SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");
    corpusPromise = loadV071RulesCorpus({
      ...urls,
      fetchImpl: fetch
    }).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

async function askOpenAI({ env, request, question, history, sources }) {
  const sourceText = sources.length
    ? sources.map((source, index) => [
        `[${source.id || `S${index + 1}`}] ${source.title || "Canonical source"}`,
        `Path: ${source.sourcePath || ""}`,
        source.excerpt || source.body || source.text || ""
      ].join("\n")).join("\n\n---\n\n")
    : "No sufficiently relevant clean source passage was retrieved.";

  const historyText = history.length
    ? history.map((item) => {
        const label = item.rulingStatus ? ` [${item.rulingStatus}]` : "";
        return `${item.role.toUpperCase()}${label}: ${item.content}`;
      }).join("\n")
    : "No prior conversation or session ruling.";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || FALLBACK_MODEL,
      store: false,
      reasoning: { effort: env.OPENAI_REASONING_EFFORT || "low" },
      max_output_tokens: 900,
      safety_identifier: await makeSafetyIdentifier(request, env),
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: [
              `QUESTION\n${question}`,
              `RECENT CONVERSATION AND SESSION RULINGS\n${historyText}`,
              `CANONICAL SOURCES\n${sourceText}`
            ].join("\n\n")
          }]
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "gauntlet_v071_rules_answer",
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
  return JSON.parse(outputText);
}

function contextualQuery(question, history) {
  const prior = history.slice(-4).map((item) => item.content).filter(Boolean).join(" ").slice(-1800);
  return prior ? `${prior} ${question}` : question;
}

function normalizeRulingStatus(value, sourceCount) {
  const normalized = ["explicit", "inferred", "provisional", "out_of_scope"].includes(value)
    ? value
    : "provisional";
  if (["explicit", "inferred"].includes(normalized) && sourceCount < 1) return "provisional";
  return normalized;
}

function deriveConfidence(status, sourceCount) {
  if (status === "explicit") return "high";
  if (status === "inferred") return "medium";
  if (status === "out_of_scope") return "high";
  return sourceCount > 0 ? "medium" : "low";
}

function responseTypeFor(status) {
  if (status === "provisional") return "provisional_ruling";
  if (status === "out_of_scope") return "out_of_scope";
  return "written_rule";
}

function ensureProvisionalAnswer(value) {
  let answer = String(value || "").trim();
  if (!/^Provisional Arbiter Ruling:/i.test(answer)) {
    answer = `Provisional Arbiter Ruling: ${answer}`;
  }
  if (!/rest of (this|the) (game|play session)/i.test(answer)) {
    answer += " Use this ruling for the rest of this game; it has been logged for designer review.";
  }
  return answer;
}

function selectUsedSources(sources, sourceIds) {
  const requested = new Set(Array.isArray(sourceIds) ? sourceIds : []);
  return sources
    .filter((source) => requested.has(source.id))
    .slice(0, 6)
    .map(({ id, title, sourcePath, sourceUrl, excerpt, body }) => ({
      id,
      title,
      sourcePath,
      sourceUrl,
      excerpt: excerpt || body || ""
    }));
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 1200),
    rulingStatus: item?.rulingStatus ? String(item.rulingStatus).trim().slice(0, 40) : null
  })).filter((item) => item.content);
}

function sanitizeSessionId(value) {
  const candidate = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{8,80}$/.test(candidate)) return candidate;
  return crypto.randomUUID();
}

function mergeConversationHistory(stored, supplied) {
  const merged = [];
  const seen = new Set();
  for (const item of [...sanitizeHistory(stored), ...sanitizeHistory(supplied)]) {
    const key = `${item.role}\u0000${item.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(-12);
}

async function loadStoredHistory(env, sessionId) {
  if (!env?.DB || !sessionId) return [];
  try {
    const rows = await env.DB.prepare(`
      SELECT question, answer, ruling_status
      FROM rules_interactions
      WHERE session_id = ? AND game_version = ?
      ORDER BY sequence_index DESC, created_at DESC
      LIMIT 8
    `).bind(sessionId, RULES_VERSION).all();
    const results = Array.isArray(rows?.results) ? rows.results : [];
    return results.reverse().flatMap((row) => [
      { role: "user", content: String(row.question || "").trim() },
      {
        role: "assistant",
        content: String(row.answer || "").trim(),
        rulingStatus: String(row.ruling_status || "").trim() || null
      }
    ]).filter((item) => item.content);
  } catch (error) {
    console.error("Could not load Rules Arbiter session history", error);
    return [];
  }
}

async function persistInteraction(env, record) {
  if (!env?.DB) return null;
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
    const now = new Date().toISOString();
    const sourceRows = Array.isArray(record.sources) ? record.sources.slice(0, 6) : [];
    const statements = [
      env.DB.prepare(`
        INSERT INTO rules_interactions (
          id, session_id, previous_interaction_id, sequence_index, created_at, updated_at,
          question, answer, game_version, ruling_status, confidence, answer_mode, model,
          source_count, playtest_session_id, sheet_serial, review_status,
          issue_types_json, reviewer_notes, resolution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'unreviewed', '[]', '', '')
      `).bind(
        id,
        record.sessionId,
        previous?.id || null,
        sequenceIndex,
        now,
        now,
        record.question,
        record.answer,
        record.gameVersion,
        record.rulingStatus,
        record.confidence,
        record.mode,
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
    console.error("Could not persist Rules Arbiter interaction", error);
    return null;
  }
}

function answerResponse(result, origin) {
  return json({
    answer: result.answer,
    rulingStatus: result.rulingStatus || "provisional",
    confidence: result.confidence || "low",
    responseType: result.responseType || "written_rule",
    sources: result.sources || [],
    executionPath: result.executionPath || "canonical",
    interactionId: result.interactionId || null,
    version: RULES_VERSION,
    versionLabel: V071_VERSION_LABEL,
    reconstruction: false,
    published: true,
    currentPublicRelease: "v0.7.1"
  }, 200, origin);
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

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return origin;
  const allowed = String(
    env.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000"
  ).split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function cors(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body, status = 200, origin = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors(origin)
  });
}

async function makeSafetyIdentifier(request, env) {
  const salt = env.SAFETY_ID_SALT || "gauntlet-v071-rules-arbiter";
  const address = request.headers.get("CF-Connecting-IP") || "anonymous";
  const input = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `gauntlet_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}
