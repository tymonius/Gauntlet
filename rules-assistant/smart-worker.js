import baseWorker, {
  buildRetrievalQueries,
  deriveConfidence,
  mergeConversationHistory,
  normalizeRulingStatus,
  sanitizePlaytestContext,
  sanitizeSessionId
} from "./worker-v061.js";
import { defaultSourceUrls, loadRulesCorpus } from "./local-search.js";
import {
  analyzeQuestionLocally,
  buildCorpusReviewSnapshot,
  chooseReasoningEffort,
  mergeSemanticPlan,
  retrieveIntelligentRules,
  sanitizeGameState,
  shouldUseSemanticPlanner,
  shouldVerifyAnswer
} from "./rules-intelligence.js";
import { answerQuestion, planQuestion, verifyDraft } from "./rules-openai.js";
import { loadStoredHistoryV2 } from "./rules-history.js";
import { persistSmartInteraction } from "./rules-persistence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import {
  buildScopeRecoveryRuling,
  isGameplayQuestionPlan
} from "./rules-status.js";

const RULES_VERSION = "v0.6.1";
const FALLBACK_MODEL = "gpt-5.6-terra";

let corpusPromise;
let corpusSnapshotPromise;

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (request.method === "GET" && ["/", "/health", "/api/health"].includes(url.pathname)) {
      const response = await baseWorker.fetch(request, env, context);
      try {
        const payload = await response.clone().json();
        return new Response(JSON.stringify({
          ...payload,
          structuredQuestionPlanning: true,
          relationshipAwareRetrieval: true,
          adaptiveReasoning: true,
          independentVerification: true,
          reviewDiagnostics: Boolean(env.DB),
          structuredGameStateSupported: true,
          reviewBundleSchema: "gauntlet.rules-review-bundle.v2"
        }), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch {
        return response;
      }
    }

    if (request.method !== "POST" || !["/api/rules", "/rules"].includes(url.pathname)) {
      return baseWorker.fetch(request, env, context);
    }

    const allowedOrigin = getAllowedOrigin(request, env);
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
      return jsonResponse({ error: `This Rules Arbiter answers ${RULES_VERSION} questions only.` }, 409, allowedOrigin);
    }

    const sessionId = sanitizeSessionId(payload?.sessionId);
    const playtestContext = sanitizePlaytestContext(payload);
    const suppliedHistory = sanitizeHistory(payload?.history);
    const gameState = sanitizeGameState(payload?.gameState);

    try {
      const corpus = await getCorpus(env);
      if (corpus.version && corpus.version !== RULES_VERSION) {
        throw new Error(`Canonical corpus reports ${corpus.version}, expected ${RULES_VERSION}.`);
      }

      const storedHistory = await loadStoredHistoryV2(env, {
        sessionId,
        playtestSessionId: playtestContext.playtestSessionId
      });
      const history = mergeConversationHistory(storedHistory, suppliedHistory);
      const localPlan = analyzeQuestionLocally(corpus, question, history, gameState);
      let plan = enrichPlanFromEntityDocuments(corpus, localPlan);

      if (shouldUseSemanticPlanner(localPlan, env)) {
        try {
          const semanticPlan = await planQuestion({ env, request, question, history, gameState });
          plan = enrichPlanFromEntityDocuments(corpus, mergeSemanticPlan(plan, semanticPlan));
        } catch (error) {
          console.error("Rules semantic planner failed; continuing with local plan", error);
        }
      }

      const baseQueries = buildRetrievalQueries(question, history);
      let retrieval = retrieveIntelligentRules(corpus, question, history, plan, {
        baseQueries,
        limit: 14,
        excerptLength: 1500
      });
      let reasoningEffort = chooseReasoningEffort(plan, env.OPENAI_REASONING_EFFORT || "adaptive");
      let draft = await answerQuestion({
        env,
        request,
        question,
        history,
        gameState,
        plan,
        sources: retrieval.sources,
        reasoningEffort
      });
      let verification = null;
      let retryCount = 0;
      let draftSources = selectUsedSources(retrieval.sources, draft.source_ids);
      let draftStatus = normalizeRulingStatus(draft.ruling_status, draftSources.length);

      if (draftStatus === "out_of_scope" && isGameplayQuestionPlan(plan)) {
        retryCount = 1;
        reasoningEffort = "high";
        draft = await answerQuestion({
          env,
          request,
          question,
          history,
          gameState,
          plan,
          sources: retrieval.sources,
          reasoningEffort,
          verifierIssues: [
            "This question describes an in-game card or rules interaction and is not out of scope.",
            "If the supplied canonical text does not decide it, make a concrete provisional table ruling instead of declining to rule."
          ]
        });
        draftSources = selectUsedSources(retrieval.sources, draft.source_ids);
        draftStatus = normalizeRulingStatus(draft.ruling_status, draftSources.length);
        if (draftStatus === "out_of_scope") {
          draft = {
            answer: buildScopeRecoveryRuling(question),
            ruling_status: "provisional",
            source_ids: retrieval.sources.slice(0, 3).map((source) => source.id)
          };
          draftSources = selectUsedSources(retrieval.sources, draft.source_ids);
          draftStatus = "provisional";
        }
      }

      if (shouldVerifyAnswer(plan, draftStatus, draftSources.length, env)) {
        try {
          verification = await verifyDraft({
            env,
            request,
            question,
            history,
            gameState,
            plan,
            sources: retrieval.sources,
            draft
          });

          if (!verification.valid && verification.missing_queries.length) {
            retryCount = Math.max(retryCount, 1);
            retrieval = retrieveIntelligentRules(corpus, question, history, plan, {
              baseQueries,
              additionalQueries: verification.missing_queries,
              limit: 16,
              excerptLength: 1600
            });
            reasoningEffort = "high";
            draft = await answerQuestion({
              env,
              request,
              question,
              history,
              gameState,
              plan,
              sources: retrieval.sources,
              reasoningEffort,
              verifierIssues: verification.issues
            });
            draftSources = selectUsedSources(retrieval.sources, draft.source_ids);
            draftStatus = normalizeRulingStatus(draft.ruling_status, draftSources.length);
            verification = await verifyDraft({
              env,
              request,
              question,
              history,
              gameState,
              plan,
              sources: retrieval.sources,
              draft
            });
          }

          if (!verification.valid && verification.replacement_status !== "none" && verification.replacement_answer) {
            draft = {
              answer: verification.replacement_answer,
              ruling_status: verification.replacement_status,
              source_ids: verification.source_ids
            };
          }
        } catch (error) {
          console.error("Rules answer verifier failed; returning the independently generated draft", error);
          verification = {
            valid: null,
            issues: ["Verifier unavailable"],
            missing_queries: [],
            replacement_answer: "",
            replacement_status: "none",
            source_ids: []
          };
        }
      }

      let usedSources = selectUsedSources(retrieval.sources, draft.source_ids);
      let rulingStatus = normalizeRulingStatus(draft.ruling_status, usedSources.length);
      if (rulingStatus === "out_of_scope" && isGameplayQuestionPlan(plan)) {
        draft = {
          answer: buildScopeRecoveryRuling(question),
          ruling_status: "provisional",
          source_ids: retrieval.sources.slice(0, 3).map((source) => source.id)
        };
        usedSources = selectUsedSources(retrieval.sources, draft.source_ids);
        rulingStatus = "provisional";
      }
      if (rulingStatus === "out_of_scope") usedSources = [];
      const answer = rulingStatus === "provisional"
        ? ensureProvisionalAnswer(draft.answer)
        : String(draft.answer || "").trim();
      const confidence = deriveVerifiedConfidence(rulingStatus, usedSources.length, verification);
      const corpusSnapshot = await getCorpusSnapshot(corpus);

      const result = {
        answer,
        rulingStatus,
        confidence,
        sources: usedSources,
        version: corpus.version || RULES_VERSION,
        rulingScope: rulingStatus === "provisional" ? "play_session" : null
      };

      result.interactionId = await persistSmartInteraction(env, {
        sessionId,
        ...playtestContext,
        question,
        answer,
        gameVersion: result.version,
        rulingStatus,
        confidence,
        mode: verification ? "ai_verified" : "ai",
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        sources: usedSources,
        diagnostics: {
          questionPlan: plan,
          retrievalQueries: retrieval.queries,
          candidateSources: retrieval.sources.map((source) => ({
            id: source.id,
            title: source.title,
            sourcePath: source.sourcePath,
            excerpt: source.excerpt,
            retrievalReason: source.retrievalReason,
            retrievalScore: source.retrievalScore
          })),
          reasoningEffort,
          verification,
          retryCount,
          gameState,
          corpusHash: corpusSnapshot.corpusHash
        }
      });

      return jsonResponse(result, 200, allowedOrigin);
    } catch (error) {
      console.error("Smart Rules Arbiter failure", error);
      return jsonResponse({ error: "The Rules Arbiter could not complete the request." }, 502, allowedOrigin);
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

function selectUsedSources(sources, sourceIds) {
  const requested = new Set(Array.isArray(sourceIds) ? sourceIds : []);
  return sources
    .filter((source) => requested.has(source.id))
    .slice(0, 8)
    .map(({ id, title, sourcePath, sourceUrl, excerpt }) => ({ id, title, sourcePath, sourceUrl, excerpt }));
}

function ensureProvisionalAnswer(answer) {
  let value = String(answer || "").trim();
  if (!/^Provisional Arbiter Ruling:/i.test(value)) value = `Provisional Arbiter Ruling: ${value}`;
  if (!/rest of (this|the) (game|play session)/i.test(value)) {
    value += " Use this ruling for the rest of this game; it has been logged for designer review.";
  }
  return value;
}

function deriveVerifiedConfidence(rulingStatus, sourceCount, verification) {
  const base = deriveConfidence(rulingStatus, sourceCount);
  if (verification && verification.valid === false) return rulingStatus === "provisional" ? "low" : "medium";
  if (verification?.valid && rulingStatus === "inferred" && sourceCount >= 2) return "high";
  return base;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 1200),
    rulingStatus: item?.rulingStatus ? String(item.rulingStatus).trim().slice(0, 40) : null
  })).filter((item) => item.content);
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
  return new Response(JSON.stringify(value), { status, headers: corsHeaders(origin) });
}
