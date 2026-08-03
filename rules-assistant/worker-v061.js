import legacyWorker from "./worker.js";
import {
  defaultSourceUrls,
  loadRulesCorpus,
  retrieveRules
} from "./local-search.js";

const RULES_VERSION = "v0.6.1";
const FALLBACK_MODEL = "gpt-5.6-terra";
const ADJUDICATION_GUIDE = `
ADJUDICATION PRINCIPLES
- First apply the current canonical rules and component text. Specific text overrides general text.
- An exception, permission, timing window, additional play, movement, or victory condition exists only when a rule grants it.
- Do not reopen a completed timing window or reapply an effect unless a rule expressly does so.
- Resolve one instruction as fully as possible before moving to the next instruction.
- Preserve established ownership, control, card-zone, and timing defaults unless an effect changes them.
- Prefer the ruling that uses the least new machinery, keeps the game moving, preserves meaningful player choices, and avoids loops or exploitable repetition.
- Use closely analogous explicit interactions before relying on a broad thematic guess.
- A provisional ruling is binding for the rest of the current play session. A later canonical clarification supersedes it.
`;

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the canonical v0.6.1 pre-release playtest edition.

Use only the canonical source passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, old Gauntlet versions, or unstated lore and design facts.

Every gameplay-rules question must receive a usable table ruling. Classify the answer as exactly one of:
- explicit: the supplied canonical text directly states the answer;
- inferred: the answer is compelled by applying one or more supplied canonical rules, with no discretionary gap;
- provisional: the rules leave a genuine gap or ambiguity, so you must make the ruling most consistent with the adjudication principles and likely designer intent;
- out_of_scope: the question is not a gameplay-rules question.

Never return "unresolved." Absence of an explicit rule is the point at which adjudication begins, not where the answer ends. For a provisional ruling, explain that "The current v0.6.1 rules do not specify this clearly," then make the ruling rather than stopping there.

Apply these requirements:
1. A specific card, Leader, faction, Territory, or supplemental-component rule overrides a general rule.
2. Resolve instructions in the order written unless a supplied rule says otherwise.
3. Identify attacker, defender, controller, owner, occupier, or active player whenever those roles determine the result.
4. Reveal and resolution are different timings. Do not treat a revealed effect as resolved unless the supplied rule says so.
5. Treat a prior provisional ruling from the same play session as binding unless a supplied canonical source directly contradicts it.
6. For a provisional ruling, state the ruling first, briefly explain the closest rules analogy or design principle, and say that it applies for the rest of the current game and is logged for designer review.
7. For an out-of-scope question, say that the Rules Arbiter handles gameplay rulings and do not invent an answer.
8. Cite only supplied source IDs that actually support the answer. An explicit or inferred answer must cite at least one supporting source. A provisional ruling may cite the closest relevant sources, but must not present them as explicitly deciding the gap.
9. Keep the answer direct and useful at the table.

${ADJUDICATION_GUIDE}

Return the required JSON object and no additional text.`;

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

const FOUNDATIONAL_QUERY_EXPANSIONS = [
  {
    match: /\b(start|starting|opening)\b.*\b(hand|cards?|draw)\b|\bhow many cards do i draw to start\b/i,
    text: "game setup draw opening hands each player draws three cards"
  },
  {
    match: /\b(card|action)\b.*\b(discard|played|play)\b|\bwhere does an action go\b/i,
    text: "Action effects after applying put the card in the Discard Pile unless it becomes an Asset Overlay or says otherwise"
  },
  {
    match: /\b(fifth|five|5)\b.*\bproposal|proposal.*\b(fifth|five|5)\b/i,
    text: "Diplomats Treaty Articles Peace Treaty five different Proposals start of turn after Capture before Draw victory"
  },
  {
    match: /\btransmutation\b/i,
    text: "Mystics Transmutation once per turn before dice put one card from Hand in Graveyard add its value to battle total"
  },
  {
    match: /\britual of ascendance\b|\britual\b.*\bbenefit|\bbenefit\b.*\britual\b/i,
    text: "Mystics Ritual of Ascendance alternate victory win the battle while three cards remain bound"
  }
];

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
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        interactionLogging: Boolean(env.DB),
        playtestLinking: Boolean(env.DB),
        provisionalRulings: true,
        sessionRulingContinuity: true,
        confidenceDerivedFromSupport: true
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

    const suppliedHistory = sanitizeHistory(payload?.history);
    const sessionId = sanitizeSessionId(payload?.sessionId);
    const playtestContext = sanitizePlaytestContext(payload);

    try {
      const corpus = await getCorpus(env);
      if (corpus.version && corpus.version !== RULES_VERSION) {
        throw new Error(`Canonical corpus reports ${corpus.version}, expected ${RULES_VERSION}.`);
      }

      const storedHistory = await loadStoredHistory(env, {
        sessionId,
        playtestSessionId: playtestContext.playtestSessionId
      });
      const history = mergeConversationHistory(storedHistory, suppliedHistory);
      const sources = retrieveRulesForQuestion(corpus, question, history, {
        limit: 10,
        excerptLength: 1300
      });

      const modelResult = await askOpenAI({
        env,
        request,
        question,
        history,
        sources
      });
      let usedSources = selectUsedSources(sources, modelResult.source_ids);
      const rulingStatus = normalizeRulingStatus(modelResult.ruling_status, usedSources.length);
      if (rulingStatus === "out_of_scope") usedSources = [];
      const answer = rulingStatus === "provisional"
        ? ensureProvisionalAnswer(modelResult.answer)
        : String(modelResult.answer || "").trim();
      const confidence = deriveConfidence(rulingStatus, usedSources.length);
      const result = {
        answer,
        rulingStatus,
        confidence,
        sources: usedSources,
        version: corpus.version || RULES_VERSION,
        rulingScope: rulingStatus === "provisional" ? "play_session" : null
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
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
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
  const sourceText = sources.length
    ? sources.map((source) => [
      `[${source.id}] ${source.title}`,
      `Path: ${source.sourcePath}`,
      source.body
    ].join("\n")).join("\n\n---\n\n")
    : "No sufficiently relevant canonical passage was retrieved. Adjudicate the gameplay question provisionally unless it is out of scope.";

  const historyText = history.length
    ? history.map((item) => {
      const label = item.rulingStatus ? ` [${item.rulingStatus}]` : "";
      return `${item.role.toUpperCase()}${label}: ${item.content}`;
    }).join("\n")
    : "No prior conversation or session ruling.";

  const userText = [
    `QUESTION\n${question}`,
    `RECENT CONVERSATION AND SESSION RULINGS\n${historyText}`,
    `CANONICAL SOURCES\n${sourceText}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || FALLBACK_MODEL,
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

export function buildRetrievalQueries(question, history = []) {
  const queries = [String(question || "").trim()];
  for (const expansion of FOUNDATIONAL_QUERY_EXPANSIONS) {
    if (expansion.match.test(question)) queries.push(`${question} ${expansion.text}`);
  }

  if (isContextDependentQuestion(question) && history.length) {
    const context = history
      .slice(-4)
      .map((item) => item.content)
      .filter(Boolean)
      .join(" ")
      .slice(-1800);
    if (context) queries.push(`${context} ${question}`);
  }

  return [...new Set(queries.map((value) => value.trim()).filter(Boolean))];
}

export function retrieveRulesForQuestion(corpus, question, history = [], options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 8, 12));
  const queries = buildRetrievalQueries(question, history);
  const merged = new Map();

  queries.forEach((query, queryIndex) => {
    const results = retrieveRules(corpus, query, {
      limit: Math.max(limit, 8),
      excerptLength: options.excerptLength || 1300
    });
    for (const result of results) {
      const key = `${result.sourcePath}\u0000${result.title}\u0000${result.body}`;
      const adjustedScore = Number(result.score || 0) + (queryIndex === 0 ? 20 : Math.max(0, 10 - queryIndex));
      const existing = merged.get(key);
      if (!existing || adjustedScore > existing.adjustedScore) {
        merged.set(key, { ...result, adjustedScore });
      }
    }
  });

  return [...merged.values()]
    .sort((a, b) => b.adjustedScore - a.adjustedScore || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ adjustedScore, ...result }, index) => ({ ...result, id: `S${index + 1}` }));
}

function isContextDependentQuestion(question) {
  const value = String(question || "").trim();
  return value.length < 44 || /\b(it|its|this|that|these|those|they|them|he|she|benefit|in battle|do so|work)\b/i.test(value);
}

export async function loadStoredHistory(env, { sessionId, playtestSessionId } = {}) {
  if (!env?.DB) return [];

  try {
    const usePlaytest = Boolean(playtestSessionId);
    const statement = usePlaytest
      ? env.DB.prepare(`
          SELECT question, answer, ruling_status
          FROM rules_interactions
          WHERE playtest_session_id = ?
          ORDER BY created_at DESC
          LIMIT 8
        `).bind(playtestSessionId)
      : env.DB.prepare(`
          SELECT question, answer, ruling_status
          FROM rules_interactions
          WHERE session_id = ?
          ORDER BY sequence_index DESC, created_at DESC
          LIMIT 8
        `).bind(sessionId);
    const rows = await statement.all();
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
    console.error("Could not load prior Rules Arbiter session history", error);
    return [];
  }
}

export function mergeConversationHistory(storedHistory, suppliedHistory) {
  const merged = [];
  const seen = new Set();
  for (const item of [...sanitizeHistory(storedHistory), ...sanitizeHistory(suppliedHistory)]) {
    const key = `${item.role}\u0000${item.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(-12);
}

export function normalizeRulingStatus(status, usedSourceCount = 0) {
  const normalized = ["explicit", "inferred", "provisional", "out_of_scope"].includes(status)
    ? status
    : "provisional";
  if (["explicit", "inferred"].includes(normalized) && usedSourceCount < 1) return "provisional";
  return normalized;
}

export function deriveConfidence(rulingStatus, usedSourceCount = 0) {
  if (rulingStatus === "explicit") return "high";
  if (rulingStatus === "inferred") return "medium";
  if (rulingStatus === "out_of_scope") return "high";
  return usedSourceCount > 0 ? "medium" : "low";
}

function ensureProvisionalAnswer(answer) {
  let value = String(answer || "").trim();
  if (!/^Provisional Arbiter Ruling:/i.test(value)) {
    value = `Provisional Arbiter Ruling: ${value}`;
  }
  if (!/rest of (this|the) (game|play session)/i.test(value)) {
    value += " Use this ruling for the rest of this game; it has been logged for designer review.";
  }
  return value;
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
        record.rulingStatus || "provisional",
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
  return sources
    .filter((source) => requested.has(source.id))
    .slice(0, 6)
    .map(({ id, title, sourcePath, sourceUrl, excerpt }) => ({
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
    .slice(-12)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content || "").trim().slice(0, 1200),
      rulingStatus: item?.rulingStatus
        ? String(item.rulingStatus).trim().slice(0, 40)
        : null
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
