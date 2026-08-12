import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import { defaultPublishedV063SourceUrls, loadPublishedV063RulesCorpus, V063_PUBLISHED_VERSION } from "./v063-published-corpus.js";
import {
  materializeV063DeterministicSources,
  resolveV063DeterministicRuling,
  V063_DETERMINISTIC_CASE_COUNT
} from "./rules-deterministic-v063.js";

export const RULES_VERSION = V063_PUBLISHED_VERSION;
const VERSION_ALIASES = new Set([RULES_VERSION]);
const FALLBACK_MODEL = "gpt-5.6-terra";
let corpusPromise;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 2400 },
    ruling_status: { type: "string", enum: ["explicit", "inferred", "provisional", "out_of_scope"] },
    source_ids: { type: "array", items: { type: "string" }, maxItems: 6 }
  },
  required: ["answer", "ruling_status", "source_ids"]
};

const SYSTEM_PROMPT = `You are the Gauntlet Rules Arbiter for the published v0.6.3 playtest edition.

Use only the supplied v0.6.3 published v0.6.3 sources and conversation context. Use the published v0.6.3 rules and card text. Do not invent a release status or import obsolete v0.6.1/v0.6.2 text that the candidate has replaced.

Classify every gameplay answer as exactly one of:
- explicit: published text directly states the answer;
- inferred: the answer is compelled by applying published rules with no discretionary gap;
- provisional: the published rules leave a genuine gap or ambiguity;
- out_of_scope: not a Gauntlet gameplay-rules question.

Practical rules:
1. State the table ruling first.
2. Specific component text overrides general rules.
3. Setup order is faction preparation → Draw 4 / discard 1 / keep 3 → informed Territory arrangement → form/reveal Gauntlet → token placement → initiative.
4. Running the Gauntlet has two equal normal routes: final-Territory capture or Last Stand victory.
5. Last Stand access can use a separate legal movement sequence without prior final-Territory capture or control.
6. Asset is the banked-card heading; Battle, Activate, and Use are retired card headings in v0.6.3.
7. Smuggler's Pass is renamed Smuggler's Run in v0.6.3. The neutral card Reserves is renamed Second Line; the rules term Reserve is unchanged.
8. Margin Loan may remain banked beyond the next turn. After income its owner may Repay or Default; while it remains banked, that player may not draw at the start of their turn.
9. An explicit or inferred answer must cite at least one supplied source ID.
10. A provisional ruling must begin with "Provisional Arbiter Ruling:" and clearly say it is a provisional table ruling rather than written v0.6.3 law.
11. Keep the answer direct and useful at the table.

Return only the required JSON object.`;

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!origin) return json({ error: "Origin not allowed." }, 403, null);
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method === "GET" && ["/health", "/api/health", "/v063/health", "/api/v063/health"].includes(url.pathname)) {
      return json({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: RULES_VERSION,
        versionLabel: "Gauntlet v0.6.3",
        candidate: false,
        publishedVersion: "v0.6.3",
        deterministicRuleAnswers: true,
        deterministicCaseCount: V063_DETERMINISTIC_CASE_COUNT,
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        interactionLogging: false
      }, 200, origin);
    }

    if (request.method !== "POST" || !["/rules", "/api/rules", "/v063/rules", "/api/v063/rules"].includes(url.pathname)) {
      return json({ error: "Not found." }, 404, origin);
    }
    if (!origin) return json({ error: "Origin not allowed." }, 403, null);

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: "Request body must be JSON." }, 400, origin); }

    const question = String(payload?.question || "").trim();
    if (!question) return json({ error: "A question is required." }, 400, origin);
    if (question.length > 600) return json({ error: "Questions are limited to 600 characters." }, 400, origin);

    const requestedVersion = String(payload?.rulesVersion || RULES_VERSION).trim();
    if (!VERSION_ALIASES.has(requestedVersion)) {
      return json({ error: `This Rules Arbiter answers Gauntlet v0.6.3 questions only.` }, 409, origin);
    }

    const history = sanitizeHistory(payload?.history);
    try {
      const corpus = await getCorpus(env);
      const deterministic = resolveV063DeterministicRuling({ question, history });
      if (deterministic) {
        return answerResponse({
          ...deterministic,
          sources: materializeV063DeterministicSources(corpus, deterministic),
          executionPath: "deterministic"
        }, origin);
      }

      const retrieval = retrieveRules(corpus, contextualQuery(question, history), {
        limit: clamp(env.RULES_SOURCE_LIMIT, 8, 4, 12),
        excerptLength: clamp(env.RULES_SOURCE_EXCERPT_LENGTH, 1100, 600, 1800)
      });

      if (!env.OPENAI_API_KEY) {
        const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
        return answerResponse({
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          subject: null,
          topic: null,
          sources: fallback.sources,
          executionPath: "local"
        }, origin);
      }

      let modelResult;
      try {
        modelResult = await askOpenAI({ env, question, history, sources: retrieval });
      } catch (error) {
        console.error("v0.6.3 model call failed; using source lookup", error);
        const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
        return answerResponse({
          answer: fallback.answer,
          rulingStatus: fallback.rulingStatus,
          confidence: fallback.confidence,
          responseType: "source_lookup",
          subject: null,
          topic: null,
          sources: fallback.sources,
          executionPath: "local_fallback"
        }, origin);
      }

      let sources = selectSources(retrieval, modelResult.source_ids);
      let rulingStatus = normalizeStatus(modelResult.ruling_status, sources.length);
      if (rulingStatus === "out_of_scope") sources = [];
      let answer = String(modelResult.answer || "").trim();
      if (rulingStatus === "provisional" && !/^Provisional Arbiter Ruling:/i.test(answer)) {
        answer = `Provisional Arbiter Ruling: ${answer} This is a provisional table ruling and does not alter the published v0.6.3 rules.`;
      }
      return answerResponse({
        answer,
        rulingStatus,
        confidence: confidenceFor(rulingStatus, sources.length),
        responseType: responseTypeFor(rulingStatus),
        subject: null,
        topic: null,
        sources,
        executionPath: "model"
      }, origin);
    } catch (error) {
      console.error("v0.6.3 Rules Arbiter failure", error);
      return json({ error: "The v0.6.3 Rules Arbiter could not complete the request." }, 502, origin);
    }
  }
};

async function getCorpus(env) {
  if (!corpusPromise) {
    corpusPromise = loadPublishedV063RulesCorpus({
      ...defaultPublishedV063SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run"),
      fetchImpl: fetch
    }).catch((error) => { corpusPromise = null; throw error; });
  }
  return corpusPromise;
}

async function askOpenAI({ env, question, history, sources }) {
  const sourceText = sources.map((source, index) =>
    `[${source.id || `S${index + 1}`}] ${source.title || "Candidate source"}\n${source.excerpt || source.text || ""}`
  ).join("\n\n");
  const conversation = history.map((item) => `${item.role}: ${item.content}`).join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || FALLBACK_MODEL,
      reasoning: { effort: env.OPENAI_REASONING_EFFORT || "low" },
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: `Recent conversation:\n${conversation || "(none)"}\n\nQuestion:\n${question}\n\nCandidate sources:\n${sourceText}` }] }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gauntlet_v063_rules_answer",
          strict: true,
          schema: OUTPUT_SCHEMA
        }
      }
    })
  });
  if (!response.ok) throw new Error(`OpenAI Responses API returned ${response.status}.`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI response contained no output text.");
  return JSON.parse(outputText);
}

function answerResponse(result, origin) {
  return json({
    answer: result.answer,
    rulingStatus: result.rulingStatus || "explicit",
    confidence: result.confidence || "high",
    responseType: result.responseType || "written_rule",
    subject: result.subject || null,
    topic: result.topic || null,
    sources: result.sources || [],
    executionPath: result.executionPath || "candidate",
    version: RULES_VERSION,
    versionLabel: "Gauntlet v0.6.3",
    candidate: false,
    publishedVersion: "v0.6.3"
  }, 200, origin);
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").replace(/\s+/g, " ").trim().slice(0, 800)
  })).filter((item) => item.content);
}

function contextualQuery(question, history) {
  const prior = history.slice(-2).map((item) => item.content).join(" ");
  return `${prior} ${question}`.trim();
}

function selectSources(retrieval, ids) {
  const wanted = new Set(Array.isArray(ids) ? ids : []);
  const selected = retrieval.filter((source) => wanted.has(source.id));
  return selected.length ? selected : retrieval.slice(0, 3);
}

function normalizeStatus(value, sourceCount) {
  const status = String(value || "").toLowerCase();
  if (["explicit", "inferred", "provisional", "out_of_scope"].includes(status)) return status;
  return sourceCount ? "inferred" : "provisional";
}
function confidenceFor(status, count) {
  if (status === "explicit") return count ? "high" : "medium";
  if (status === "inferred") return count > 1 ? "high" : "medium";
  if (status === "provisional") return "low";
  return "medium";
}
function responseTypeFor(status) {
  return status === "provisional" ? "provisional_ruling" : status === "out_of_scope" ? "out_of_scope" : "written_rule";
}
function clamp(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = String(env.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000")
    .split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}
function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(body, status = 200, origin = null) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (origin) Object.assign(headers, cors(origin));
  return new Response(JSON.stringify(body), { status, headers });
}
