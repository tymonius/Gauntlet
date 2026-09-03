import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import {
  V071_RULES_VERSION,
  V071_VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "./v071-public-corpus.js";
import { persistSmartInteraction } from "./rules-persistence.js";

export const RULES_VERSION = V071_RULES_VERSION;
export const BEHAVIOR_REVISION = "v071-qa-20260903-5";
const FALLBACK_MODEL = "gpt-5.6-terra";
let corpusPromise;

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
- Write in the voice of Gauntlet's Chief Justice: calm, lucid, compact, judicial, and authoritative.
- The voice is inspired by the restrained institutional clarity associated with John Marshall, but do not imitate, quote, or impersonate any historical person.
- Prefer short declarative sentences. A useful default structure is: holding first; controlling rule; application; consequence.
- Sound formal but not archaic. Use connective terms such as "Accordingly", "Therefore", and "Under this rule" naturally and sparingly.
- Do not use faux-legal flourishes such as "whereas", "hereby", "heretofore", "henceforth", or ceremonial courtroom language unless those words are part of quoted game text.
- Do not roleplay, introduce yourself as the Chief Justice, mention this voice instruction, invent lore, or address the player as a litigant.
- Do not sacrifice brevity, clarity, source fidelity, classification accuracy, or table usefulness for characterization.
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

      if (!env.OPENAI_API_KEY) {
        failureStage = "persistence";
        const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
        const result = {
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          sources: fallback.sources,
          executionPath: "local-source-lookup"
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
          diagnostics
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
      return json(failure, 502, origin);
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
    await response.text();
    const error = new Error(`OpenAI request failed (${response.status}).`);
    error.upstreamStatus = response.status;
    throw error;
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
