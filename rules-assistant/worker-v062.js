import {
  buildLocalFallbackAnswer,
  retrieveRules
} from "./local-search.js";
import {
  defaultPublishedV062SourceUrls,
  loadPublishedV062RulesCorpus
} from "./v062-published-corpus.js";
import {
  materializeV062DeterministicSources,
  resolveV062DeterministicRuling,
  V062_DETERMINISTIC_CASE_COUNT
} from "./rules-deterministic-v062.js";
import {
  deriveConfidence,
  normalizeRulingStatus,
  sanitizePlaytestContext,
  sanitizeSessionId
} from "./worker-v061.js";
import { persistSmartInteraction } from "./rules-persistence.js";

const RULES_VERSION = "v0.6.2";
const ACCEPTED_VERSION_ALIASES = new Set([RULES_VERSION, "v0.6.2-candidate"]);
const FALLBACK_MODEL = "gpt-5.6-terra";
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

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the v0.6.2 playtest rules.

Use only the supplied published v0.6.2 sources, recent conversation, prior session rulings, and the adjudication principles below. Do not import v0.6.1 mechanics except when the question explicitly asks for a comparison.

Every gameplay question must receive a usable table answer classified as exactly one of:
- explicit: supplied written text directly states the answer;
- inferred: the answer is compelled by applying supplied written rules, with no discretionary gap;
- provisional: the supplied rules leave a genuine gap or ambiguity, so make the ruling most consistent with the established design logic;
- out_of_scope: the question is not a gameplay-rules question.

Response requirements:
1. State the practical ruling first.
2. Specific component text overrides general rules.
3. Terms occur during a pending battle before Onset. Accepted Terms prevent the battle.
4. Distinguish Position from contiguous Front Line control.
5. Distinguish Fall Back, retreat, and withdrawal.
6. An additional Action does not itself permit two Actions in one phase.
7. A provisional answer must begin with "Provisional Arbiter Ruling:" and say it applies for the rest of the current game and is logged for designer review.
8. An explicit or inferred answer must cite at least one supplied source ID.
9. A provisional ruling may cite close analogies but must not claim those passages explicitly decide the gap.
10. Keep the answer direct and useful at the table.

Return the required JSON object and no additional text.`;

let corpusPromise;

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method === "GET" && ["/api/health", "/health", "/api/v062/health", "/v062/health"].includes(url.pathname)) {
      return jsonResponse({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: RULES_VERSION,
        candidate: false,
        publishedVersion: "v0.6.2",
        deterministicRuleAnswers: true,
        deterministicCaseCount: V062_DETERMINISTIC_CASE_COUNT,
        responseTypes: ["written_rule", "clarification", "provisional_ruling", "out_of_scope"],
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        interactionLogging: Boolean(env.DB)
      }, 200, allowedOrigin);
    }

    if (request.method !== "POST" || !["/api/rules", "/rules", "/api/v062/rules", "/v062/rules"].includes(url.pathname)) {
      return jsonResponse({ error: "Not found." }, 404, allowedOrigin);
    }
    if (!allowedOrigin) return jsonResponse({ error: "Origin not allowed." }, 403, null);

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
    if (!ACCEPTED_VERSION_ALIASES.has(requestedVersion)) {
      return jsonResponse({
        error: `This Rules Arbiter answers ${RULES_VERSION} questions only.`
      }, 409, allowedOrigin);
    }

    const sessionId = sanitizeSessionId(payload?.sessionId);
    const playtestContext = sanitizePlaytestContext(payload);
    const history = sanitizeHistory(payload?.history);

    try {
      const corpus = await getCorpus(env);
      if (corpus.version !== RULES_VERSION) {
        throw new Error(`Published corpus reports ${String(corpus.version)}, expected ${RULES_VERSION}.`);
      }

      const deterministic = resolveV062DeterministicRuling({ question, history });
      if (deterministic) {
        const sources = materializeV062DeterministicSources(corpus, deterministic);
        return finishAnswer({
          request,
          env,
          allowedOrigin,
          sessionId,
          playtestContext,
          question,
          history,
          answer: deterministic.answer,
          rulingStatus: deterministic.rulingStatus,
          confidence: deterministic.confidence,
          responseType: deterministic.responseType,
          subject: deterministic.subject,
          topic: deterministic.topic,
          sources,
          executionPath: "deterministic"
        });
      }

      const retrieval = retrieveRules(corpus, buildContextualQuery(question, history), {
        limit: clamp(env.RULES_SOURCE_LIMIT, 8, 4, 12),
        excerptLength: clamp(env.RULES_SOURCE_EXCERPT_LENGTH, 1100, 600, 1800)
      });

      if (!env.OPENAI_API_KEY) {
        const fallback = buildLocalFallbackAnswer(question, retrieval, corpus.version);
        return finishAnswer({
          request,
          env,
          allowedOrigin,
          sessionId,
          playtestContext,
          question,
          history,
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          subject: null,
          topic: null,
          sources: fallback.sources,
          executionPath: "local"
        });
      }

      let modelResult;
      try {
        modelResult = await askOpenAI({ env, request, question, history, sources: retrieval });
      } catch (error) {
        console.error("v0.6.2 model call failed; using source lookup", error);
        const fallback = buildLocalFallbackAnswer(question, retrieval, corpus.version);
        return finishAnswer({
          request,
          env,
          allowedOrigin,
          sessionId,
          playtestContext,
          question,
          history,
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          subject: null,
          topic: null,
          sources: fallback.sources,
          executionPath: "local_fallback"
        });
      }

      let sources = selectUsedSources(retrieval, modelResult.source_ids);
      let rulingStatus = normalizeRulingStatus(modelResult.ruling_status, sources.length);
      if (rulingStatus === "out_of_scope") sources = [];
      const answer = rulingStatus === "provisional"
        ? ensureProvisionalAnswer(modelResult.answer)
        : String(modelResult.answer || "").trim();
      const confidence = deriveConfidence(rulingStatus, sources.length);

      return finishAnswer({
        request,
        env,
        allowedOrigin,
        sessionId,
        playtestContext,
        question,
        history,
        answer,
        rulingStatus,
        confidence,
        responseType: responseTypeFor(rulingStatus),
        subject: null,
        topic: null,
        sources,
        executionPath: "model"
      });
    } catch (error) {
      console.error("v0.6.2 Rules Arbiter failure", error);
      return jsonResponse({
        error: "The v0.6.2 Rules Arbiter could not complete the request."
      }, 502, allowedOrigin);
    }
  }
};

async function getCorpus(env) {
  if (!corpusPromise) {
    corpusPromise = loadPublishedV062RulesCorpus(defaultPublishedV062SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run")).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

async function finishAnswer({
  env,
  allowedOrigin,
  sessionId,
  playtestContext,
  question,
  history,
  answer,
  rulingStatus,
  confidence,
  responseType,
  subject,
  topic,
  sources,
  executionPath
}) {
  const result = {
    answer,
    rulingStatus,
    confidence,
    responseType,
    sources,
    version: RULES_VERSION,
    publishedVersion: "v0.6.1",
    candidate: true,
    rulingScope: rulingStatus === "provisional" ? "play_session" : null,
    subject: subject || null,
    topic: topic || null,
    executionPath
  };

  result.interactionId = await persistSmartInteraction(env, {
    sessionId,
    ...playtestContext,
    question,
    answer,
    gameVersion: RULES_VERSION,
    rulingStatus,
    confidence,
    mode: executionPath,
    model: executionPath === "model" ? (env.OPENAI_MODEL || FALLBACK_MODEL) : null,
    sources,
    diagnostics: {
      candidate: true,
      responseType,
      historyLength: history.length,
      executionPath
    }
  });

  return jsonResponse(result, 200, allowedOrigin);
}

async function askOpenAI({ env, request, question, history, sources }) {
  const sourceText = sources.length
    ? sources.map((source) => [
      `[${source.id}] ${source.title}`,
      `Path: ${source.sourcePath}`,
      source.body
    ].join("\n")).join("\n\n---\n\n")
    : "No sufficiently relevant candidate source was retrieved.";
  const historyText = history.length
    ? history.map((item) => `${item.role.toUpperCase()}${item.rulingStatus ? ` [${item.rulingStatus}]` : ""}: ${item.content}`).join("\n")
    : "No prior conversation or session ruling.";

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
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: `QUESTION\n${question}\n\nRECENT CONVERSATION\n${historyText}\n\nV0.6.2 CANDIDATE SOURCES\n${sourceText}`
          }]
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "gauntlet_v062_rules_answer",
          strict: true,
          schema: OUTPUT_SCHEMA
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  const payload = await response.json();
  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI returned no output text.");
  return JSON.parse(text);
}

function selectUsedSources(sources, sourceIds) {
  const requested = new Set(Array.isArray(sourceIds) ? sourceIds : []);
  return sources
    .filter((source) => requested.has(source.id))
    .slice(0, 8)
    .map(({ id, canonicalId, title, sourcePath, sourceUrl, excerpt }) => ({
      id: canonicalId || id,
      title,
      sourcePath,
      sourceUrl,
      excerpt
    }));
}

function buildContextualQuery(question, history) {
  const recent = history.slice(-4).map((item) => item.content).join(" ");
  return recent ? `${recent} ${question}`.slice(-2400) : question;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 1200),
    rulingStatus: item?.rulingStatus ? String(item.rulingStatus).trim().slice(0, 40) : null
  })).filter((item) => item.content);
}

function ensureProvisionalAnswer(answer) {
  let value = String(answer || "").trim();
  if (!/^Provisional Arbiter Ruling:/i.test(value)) value = `Provisional Arbiter Ruling: ${value}`;
  if (!/rest of (this|the) (game|play session)/i.test(value)) {
    value += " Use this ruling for the rest of this game; it has been logged for designer review.";
  }
  return value;
}

function responseTypeFor(rulingStatus) {
  if (rulingStatus === "explicit") return "written_rule";
  if (rulingStatus === "inferred") return "clarification";
  if (rulingStatus === "provisional") return "provisional_ruling";
  if (rulingStatus === "out_of_scope") return "out_of_scope";
  return "source_lookup";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  return "";
}

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";
  const allowed = String(env.ALLOWED_ORIGINS || env.SITE_ORIGIN || "https://gauntlet.run")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}

function clamp(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, numeric));
}

async function makeSafetyIdentifier(request, env) {
  const value = `${request.headers.get("CF-Connecting-IP") || "unknown"}:${env.SAFETY_SALT || "gauntlet-v062"}`;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
