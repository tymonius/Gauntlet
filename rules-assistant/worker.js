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

let corpusPromise;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = getAllowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin)
      });
    }

    if (request.method === "GET" && ["/", "/health", "/api/health"].includes(url.pathname)) {
      return jsonResponse({
        ok: true,
        service: "gauntlet-rules-assistant",
        version: "v0.6.0",
        model: env.OPENAI_MODEL || "gpt-5.6-luna"
      }, 200, allowedOrigin);
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

    try {
      const corpus = await getCorpus(env);
      const sources = retrieveRules(corpus, question, { limit: 8, excerptLength: 1300 });
      if (!sources.length) {
        return jsonResponse({
          answer: "The current v0.6.0 rules do not specify this clearly, and I could not identify a sufficiently relevant canonical passage.",
          rulingStatus: "unresolved",
          confidence: "low",
          sources: [],
          version: corpus.version
        }, 200, allowedOrigin);
      }

      const modelResult = await askOpenAI({
        env,
        request,
        question,
        history,
        sources
      });

      const usedSources = selectUsedSources(sources, modelResult.source_ids);
      return jsonResponse({
        answer: modelResult.answer,
        rulingStatus: modelResult.ruling_status,
        confidence: modelResult.confidence,
        sources: usedSources,
        version: corpus.version
      }, 200, allowedOrigin);
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

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("OpenAI returned invalid structured output.");
  }

  return parsed;
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

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = String(env.ALLOWED_ORIGINS || "https://gauntlet.run,http://localhost:8000,http://127.0.0.1:8000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
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
  return `gauntlet_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
