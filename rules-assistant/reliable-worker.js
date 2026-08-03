import smartWorker from "./smart-worker.js";
import {
  buildLocalFallbackAnswer,
  defaultSourceUrls,
  loadRulesCorpus,
  retrieveRules
} from "./local-search.js";
import {
  analyzeQuestionLocally,
  buildCorpusReviewSnapshot,
  sanitizeGameState
} from "./rules-intelligence.js";
import { persistSmartInteraction } from "./rules-persistence.js";
import {
  sanitizePlaytestContext,
  sanitizeSessionId
} from "./worker-v061.js";

const RULES_VERSION = "v0.6.1";
const FALLBACK_MODEL = "local-source-lookup";

let corpusPromise;
let corpusSnapshotPromise;

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (request.method !== "POST" || !["/api/rules", "/rules"].includes(url.pathname)) {
      return smartWorker.fetch(request, env, context);
    }

    const fallbackRequest = request.clone();
    const response = await smartWorker.fetch(request, env, context);
    if (response.ok || response.status < 500) return response;

    try {
      const payload = await fallbackRequest.json();
      const question = String(payload?.question || "").trim();
      if (!question) return response;

      const corpus = await getCorpus(env);
      const history = sanitizeHistory(payload?.history);
      const gameState = sanitizeGameState(payload?.gameState);
      const plan = analyzeQuestionLocally(corpus, question, history, gameState);
      const results = retrieveRules(corpus, question, { limit: 5, excerptLength: 1200 });
      const fallback = buildLocalFallbackAnswer(question, results, corpus.version || RULES_VERSION);
      const failure = await summarizeFailure(response);
      const snapshot = await getCorpusSnapshot(corpus);
      const sessionId = sanitizeSessionId(payload?.sessionId);
      const playtestContext = sanitizePlaytestContext(payload);

      const result = {
        ...fallback,
        version: corpus.version || RULES_VERSION,
        mode: "local",
        degraded: true,
        serviceStatus: response.status,
        rulingScope: null
      };

      result.interactionId = await persistSmartInteraction(env, {
        sessionId,
        ...playtestContext,
        question,
        answer: result.answer,
        gameVersion: result.version,
        rulingStatus: result.rulingStatus,
        confidence: result.confidence,
        mode: "local_fallback",
        model: FALLBACK_MODEL,
        sources: result.sources,
        diagnostics: {
          questionPlan: plan,
          retrievalQueries: [question],
          candidateSources: results.map((source) => ({
            id: source.id,
            title: source.title,
            sourcePath: source.sourcePath,
            excerpt: source.excerpt,
            retrievalReason: "degraded-direct-query",
            retrievalScore: source.score
          })),
          reasoningEffort: "low",
          verification: {
            valid: null,
            issues: [failure],
            missing_queries: [],
            replacement_answer: "",
            replacement_status: "none",
            source_ids: []
          },
          retryCount: 0,
          gameState,
          corpusHash: snapshot.corpusHash
        }
      });

      return jsonResponse(result, 200, response.headers);
    } catch (error) {
      console.error("Could not produce or persist degraded Rules Arbiter answer", error);
      return response;
    }
  }
};

async function getCorpus(env) {
  if (!corpusPromise) {
    corpusPromise = loadRulesCorpus(defaultSourceUrls(env.SITE_ORIGIN || "https://gauntlet.run")).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

async function getCorpusSnapshot(corpus) {
  if (!corpusSnapshotPromise) {
    corpusSnapshotPromise = buildCorpusReviewSnapshot(corpus).catch((error) => {
      corpusSnapshotPromise = null;
      throw error;
    });
  }
  return corpusSnapshotPromise;
}

async function summarizeFailure(response) {
  let detail = "";
  try {
    const payload = await response.clone().json();
    detail = String(payload?.error || "").trim();
  } catch {
    // The HTTP status remains sufficient for export diagnostics.
  }
  const suffix = detail ? `: ${detail.slice(0, 240)}` : "";
  return `AI pipeline failed with HTTP ${response.status}${suffix}`;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 1200),
    rulingStatus: item?.rulingStatus ? String(item.rulingStatus).trim().slice(0, 40) : null
  })).filter((item) => item.content);
}

function jsonResponse(payload, status, sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}
