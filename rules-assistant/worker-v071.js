import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import {
  V071_RULES_VERSION,
  V071_VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "./v071-public-corpus.js";
import { persistSmartInteraction } from "./rules-persistence.js";

export const RULES_VERSION = V071_RULES_VERSION;
export const BEHAVIOR_REVISION = "v071-qa-20260903-9";
const FALLBACK_MODEL = "gpt-5.6-terra";
const CORPUS_CACHE_TTL_MS = 5 * 60 * 1000;
let corpusPromise;
let corpusLoadedAt = 0;

const ADJUDICATION_GUIDE = `
ADJUDICATION PRINCIPLES
- Apply the supplied current rules and component text first. Specific text overrides general text.
- Exceptions, permissions, additional plays, movement, or reopened timing windows must be granted expressly.
- Do not reopen a completed timing window or reapply an effect unless the supplied rules expressly do so.
- Resolve one instruction as fully as possible before beginning the next.
- Preserve supplied ownership, control, card-zone, and timing defaults unless an effect changes them.
- An effect that grants additional Actions changes the number of available Actions, not the legal phase or timing of another effect, unless it expressly changes that timing.
- A bound card is outside normal zones. Do not describe it as remaining in its prior Hand, Discard Pile, Graveyard, Reserve, or other zone unless a supplied rule expressly says it remains there.
- Never invent the target of an unlabeled numerical bonus. If the supplied rules give a bonus or cost progression without stating what the bonus modifies, that is a genuine rules gap.
- Prefer the ruling that introduces the least new machinery, preserves meaningful player choices, avoids loops or exploitable repetition, and is consistent with closely analogous supplied interactions.
- A provisional ruling is binding for the rest of the current play session unless a supplied clean authority source directly supersedes it.
`;



const CHIEF_JUSTICE_VOICE = `
VOICE — CHIEF JUSTICE
- Speak as Gauntlet's final rules authority: measured, exact, decisive, and restrained. The Chief Justice is a living participant in the conversation, not a mechanical dispenser of rulings. Understand the player's question in context and respond naturally to what is actually being asked.
- Give the ruling early, then explain the controlling rule or distinction in the fewest words necessary. Do not force every answer into an identical structure. Vary sentence length and construction naturally, and allow the reasoning to unfold conversationally when the question requires it.
- Authority comes from clarity, judgment, and careful distinctions rather than ceremony. Slightly elevated judicial phrasing such as "Accordingly", "The rule does not permit that result", "The distinction is controlling", and "That follows because" is welcome when natural, but never sound archaic, theatrical, or self-consciously legal.
- Prefer precise distinctions between game concepts. When two ideas are easily confused, name the distinction directly: placement is not movement; occupation is not control; an additional Action is not a reopened timing window.
- The Chief Justice may acknowledge the premise of a question, correct a misunderstanding, or explain why a ruling produces an unintuitive result. Do so with composure rather than bluntness. The conversation should feel responsive and intelligent while remaining formal enough that the ruling carries authority.
- Avoid canned transitions, repetitive answer patterns, customer-service language, chatbot filler, modern slang, contractions used for casual effect, and conversational tics such as "Sure", "Absolutely", "Basically", or "You're right".
- Do not roleplay a courtroom, introduce yourself as the Chief Justice, address players as litigants, or use faux-legal flourishes such as "whereas", "hereby", "heretofore", "henceforth", or ceremonial pronouncements.
- Do not sacrifice clarity, source fidelity, classification accuracy, or table usefulness for characterization.
- A good answer should feel as though an intelligent eighteenth-century magistrate has been sitting at the table, has followed the discussion, and has now settled the matter clearly enough that play can continue.
`;

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the current canonical v0.7.1 playtest edition.

Use only the supplied published v0.7.1 release passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, later development material, withdrawn Gauntlet releases, historical candidate text, or unstated design facts.

Every gameplay-rules question must receive one of four classifications:
- explicit: the supplied clean authority directly states the answer, including every permission, prohibition, timing, zone, or numerical effect asserted;
- inferred: the answer is compelled only after combining supplied clean rules or drawing a necessary conclusion from them, with no discretionary gap;
- provisional: the clean rules leave a genuine gap or ambiguity, so make a usable table ruling using only the adjudication principles and analogous supplied interactions;
- out_of_scope: the question is not a Gauntlet gameplay-rules question.

Requirements:
1. State the answer first. Do not label an explicit or inferred answer "Table ruling" or use similar provisional-sounding labels.
2. A specific supplied component rule overrides a general supplied rule.
3. Treat prior provisional rulings from the same session as binding unless a supplied clean authority source contradicts them.
4. For a provisional ruling, begin the answer with exactly "Provisional Arbiter Ruling:", clearly distinguish the judgment from written authority, explain the closest supplied analogy or adjudication principle, and state that it applies for the rest of the current game and is logged for designer review. Reserve that label for provisional rulings only.
5. Cite only supplied source IDs that actually support the answer. Explicit or inferred answers require at least one supporting source.
6. Keep the answer direct and useful at the table. For explicit and inferred answers, do not discuss retrieval mechanics or say "the supplied passages/text/sources" unless the player specifically asks about source coverage.
7. Write the answer as plain text only. The Rules Arbiter widget does not render Markdown. Do not use Markdown emphasis markers, backticks, headings, tables, or other formatting syntax. Write formulas directly, for example: Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium.
8. For follow-up questions using words such as "that", "it", "this", "those", "explain that", or "what does that mean", resolve the referent against the immediately preceding exchange first. Do not jump back to an older topic when the latest exchange supplies a coherent referent. An explicit subject named in the current question overrides this rule.
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
      ["/corpus-health", "/api/corpus-health", "/v071/corpus-health", "/api/v071/corpus-health"].includes(url.pathname)
    ) {
      try {
        const corpus = await getCorpus(env, { force: true });
        return json({
          ok: true,
          service: "gauntlet-rules-assistant",
          version: RULES_VERSION,
          currentPublicRelease: "v0.7.1",
          behaviorRevision: BEHAVIOR_REVISION,
          authoritySetId: corpus.authoritySetId || ""
        }, 200, origin);
      } catch (error) {
        console.error("v0.7.1 Rules Arbiter corpus health failure", error);
        return json({
          ok: false,
          service: "gauntlet-rules-assistant",
          version: RULES_VERSION,
          behaviorRevision: BEHAVIOR_REVISION,
          error: "The published Rules Arbiter corpus could not be refreshed."
        }, 502, origin);
      }
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
        behaviorRevision: BEHAVIOR_REVISION,
        deterministicRuleAnswers: false,
        interactionLogging: Boolean(env.DB),
        sessionRulingContinuity: Boolean(env.DB),
        formalPlaytestLinking: Boolean(env.DB),
        reviewDiagnostics: Boolean(env.DB),
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
    const playtestSessionId = sanitizeContextValue(payload?.playtestSessionId);
    const sheetSerial = sanitizeContextValue(payload?.sheetSerial);

    let failureStage = "corpus";
    try {
      const corpus = await getCorpus(env);
      failureStage = "history";
      const storedHistory = await loadStoredHistory(env, sessionId);
      const history = mergeConversationHistory(storedHistory, suppliedHistory);
      const retrievalQuery = contextualQuery(question, history);
      failureStage = "retrieval";
      const retrieval = retrieveRules(corpus, retrievalQuery, {
        limit: 10,
        excerptLength: 1300
      });
      const diagnostics = {
        questionPlan: null,
        retrievalQueries: [retrievalQuery],
        candidateSources: retrieval.map(toDiagnosticSource),
        reasoningEffort: env.OPENAI_REASONING_EFFORT || "low",
        verification: null,
        retryCount: 0,
        gameState: null,
        corpusHash: corpus.authoritySetId || ""
      };

      const modelBudget = env.OPENAI_API_KEY
        ? await reserveModelRequest(request, env)
        : { allowed: false, reason: "model_not_configured" };

      if (!env.OPENAI_API_KEY || !modelBudget.allowed) {
        failureStage = "persistence";
        const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
        const result = {
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          sources: fallback.sources,
          executionPath: env.OPENAI_API_KEY ? "local-budget-fallback" : "local-source-lookup"
        };
        result.interactionId = await persistSmartInteraction(env, {
          sessionId,
          playtestSessionId,
          sheetSerial,
          question,
          answer: fallback.answer,
          gameVersion: RULES_VERSION,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          mode: "source_lookup",
          model: null,
          sources: fallback.sources,
          diagnostics: { ...diagnostics, modelBudget }
        });
        return answerResponse(result, origin);
      }

      failureStage = "model";
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
      failureStage = "persistence";
      result.interactionId = await persistSmartInteraction(env, {
        sessionId,
        playtestSessionId,
        sheetSerial,
        question,
        answer,
        gameVersion: RULES_VERSION,
        rulingStatus,
        confidence,
        mode: "ai",
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        sources,
        diagnostics
      });
      return answerResponse(result, origin);
    } catch (error) {
      console.error(`v0.7.1 Rules Arbiter failure during ${failureStage}`, error);
      const failure = {
        error: "The Rules Arbiter could not complete the request.",
        errorCode: `rules_${failureStage}_failed`
      };
      if (failureStage === "model" && Number.isInteger(error?.upstreamStatus)) {
        failure.upstreamStatus = error.upstreamStatus;
      }
      if (failureStage === "model" && error?.upstreamCategory) {
        failure.upstreamCategory = error.upstreamCategory;
      }
      return json(failure, 502, origin);
    }
  }
};

async function getCorpus(env, { force = false } = {}) {
  const cacheExpired = corpusLoadedAt > 0 && Date.now() - corpusLoadedAt >= CORPUS_CACHE_TTL_MS;
  if (force || cacheExpired) {
    corpusPromise = null;
    corpusLoadedAt = 0;
  }
  if (!corpusPromise) {
    const urls = defaultV071SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");
    corpusPromise = loadV071RulesCorpus({
      ...urls,
      fetchImpl: fetch
    }).then((corpus) => {
      corpusLoadedAt = Date.now();
      return corpus;
    }).catch((error) => {
      corpusPromise = null;
      corpusLoadedAt = 0;
      throw error;
    });
  }
  return corpusPromise;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function reserveModelRequest(request, env) {
  if (!env.DB) {
    return { allowed: false, reason: "budget_store_unavailable" };
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const safetyId = await makeSafetyIdentifier(request, env);
  const counters = [
    {
      scope: "ip_hour",
      bucket: `${timestamp.slice(0, 13)}:${safetyId}`,
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_IP_HOUR, 12)
    },
    {
      scope: "global_day",
      bucket: timestamp.slice(0, 10),
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_DAY, 50)
    },
    {
      scope: "global_month",
      bucket: timestamp.slice(0, 7),
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_MONTH, 200)
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
    const blockedIndex = counters.findIndex((_, index) =>
      Number(results?.[index]?.meta?.changes || 0) < 1
    );
    if (blockedIndex >= 0) {
      return {
        allowed: false,
        reason: `${counters[blockedIndex].scope}_limit_reached`,
        limits: Object.fromEntries(counters.map(({ scope, limit }) => [scope, limit]))
      };
    }

    return {
      allowed: true,
      reason: "reserved",
      limits: Object.fromEntries(counters.map(({ scope, limit }) => [scope, limit]))
    };
  } catch (error) {
    console.error("Rules Arbiter model budget reservation failed closed", error);
    return { allowed: false, reason: "budget_store_error" };
  }
}

async function askOpenAI({ env, request, question, history, sources }) {
  const sourceText = sources.length
    ? sources.map((source, index) => [
        `[${source.id || `S${index + 1}`}] ${source.title || "Canonical source"}`,
        `Path: ${source.sourcePath || ""}`,
        source.excerpt || source.body || source.text || ""
      ].join("\n")).join("\n\n---\n\n")
    : "No sufficiently relevant clean source passage was retrieved.";

  const formatHistoryItem = (item) => {
    const label = item.rulingStatus ? ` [${item.rulingStatus}]` : "";
    return `${item.role.toUpperCase()}${label}: ${item.content}`;
  };
  const immediateHistory = history.slice(-2);
  const earlierHistory = history.slice(0, -2);
  const immediateHistoryText = immediateHistory.length
    ? immediateHistory.map(formatHistoryItem).join("\n")
    : "No immediately preceding exchange.";
  const earlierHistoryText = earlierHistory.length
    ? earlierHistory.map(formatHistoryItem).join("\n")
    : "No earlier conversation or session ruling.";

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
              `IMMEDIATELY PRECEDING EXCHANGE — resolve ambiguous follow-ups here first\n${immediateHistoryText}`,
              `EARLIER CONVERSATION AND SESSION RULINGS\n${earlierHistoryText}`,
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
    let providerError = null;
    try {
      providerError = JSON.parse(errorBody)?.error || null;
    } catch {
      providerError = null;
    }
    const error = new Error(`OpenAI request failed (${response.status}).`);
    error.upstreamStatus = response.status;
    error.upstreamCategory = classifyUpstreamFailure(response.status, providerError);
    throw error;
  }
  const payload = await response.json();
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("OpenAI returned no output text.");
  return JSON.parse(outputText);
}

function classifyUpstreamFailure(status, providerError) {
  const code = String(providerError?.code || "").trim();
  const type = String(providerError?.type || "").trim();
  const knownQuotaCodes = new Set([
    "credit_balance_exhausted",
    "organization_usage_limit_exceeded",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded"
  ]);
  if (knownQuotaCodes.has(code)) return code;
  if (type === "insufficient_quota") return code || "insufficient_quota";
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "authentication_or_access";
  if (status === 400 || status === 404 || status === 422) return "invalid_request";
  if (status >= 500) return "upstream_server_error";
  return "upstream_error";
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
      SELECT question, answer, COALESCE(ruling_status_v2, ruling_status) AS ruling_status
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

function sanitizeContextValue(value) {
  const normalized = String(value || "").trim();
  return /^[a-zA-Z0-9_.:-]{3,120}$/.test(normalized) ? normalized : null;
}

function toDiagnosticSource(source) {
  return {
    id: String(source?.id || ""),
    canonicalId: String(source?.canonicalId || ""),
    title: String(source?.title || ""),
    kind: String(source?.kind || ""),
    sourcePath: String(source?.sourcePath || ""),
    sourceUrl: String(source?.sourceUrl || ""),
    score: Number(source?.score || 0)
  };
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
    currentPublicRelease: "v0.7.1",
    behaviorRevision: BEHAVIOR_REVISION
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