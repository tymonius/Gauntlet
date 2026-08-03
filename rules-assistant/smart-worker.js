import baseWorker, {
  buildRetrievalQueries,
  deriveConfidence,
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
  buildOutOfScopeRuling,
  buildScopeRecoveryRuling,
  isClearlyOutOfScopeQuestion,
  isGameplayQuestionPlan
} from "./rules-status.js";
import {
  buildRulePacket,
  prioritizeRulePacketSources
} from "./rules-packets.js";
import {
  materializeDeterministicSources,
  resolveDeterministicRuling
} from "./rules-deterministic.js";

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
          deterministicRuleAnswers: true,
          explicitRulePackets: true,
          structuredSubjectContinuity: true,
          relationshipAwareRetrieval: true,
          structuredQuestionPlanning: true,
          semanticPlanningEnabled: isFeatureEnabled(env.RULES_SEMANTIC_PLANNER),
          independentVerificationEnabled: isFeatureEnabled(env.RULES_VERIFIER),
          oneModelCallDefault: !isFeatureEnabled(env.RULES_SEMANTIC_PLANNER) && !isFeatureEnabled(env.RULES_VERIFIER),
          reviewDiagnostics: Boolean(env.DB),
          structuredGameStateSupported: true,
          reviewBundleSchema: "gauntlet.rules-review-bundle.v2",
          experimental: true
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

      if (isClearlyOutOfScopeQuestion(question)) {
        const plan = {
          entities: [],
          mechanics: [],
          roles: [],
          zones: [],
          timing: [],
          questionType: "out_of_scope",
          complexity: "low",
          contextDependent: false,
          assumptions: [],
          retrievalQueries: [],
          activeSubject: null,
          activeTopic: "scope",
          rulePacket: null
        };
        const packet = {
          id: "scope",
          subject: null,
          topic: "scope",
          sourceIds: [],
          scopeNotes: [],
          requiredClaims: [],
          forbiddenClaims: []
        };
        return handleDeterministicAnswer({
          request,
          env,
          allowedOrigin,
          corpus,
          sessionId,
          playtestContext,
          question,
          gameState,
          plan,
          packet,
          deterministic: buildOutOfScopeRuling()
        });
      }

      const storedHistory = await loadStoredHistoryV2(env, {
        sessionId,
        playtestSessionId: playtestContext.playtestSessionId
      });
      const history = mergeSmartHistory(storedHistory, suppliedHistory);
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

      const packet = buildRulePacket(corpus, { question, history, plan });
      plan = {
        ...plan,
        activeSubject: packet.subject || null,
        activeTopic: packet.topic || null,
        rulePacket: {
          id: packet.id,
          sourceIds: packet.sourceIds,
          scopeNotes: packet.scopeNotes,
          requiredClaims: packet.requiredClaims,
          forbiddenClaims: packet.forbiddenClaims
        }
      };

      const deterministic = resolveDeterministicRuling(corpus, {
        question,
        history,
        gameState,
        plan,
        packet
      });
      if (deterministic) {
        return handleDeterministicAnswer({
          request,
          env,
          allowedOrigin,
          corpus,
          sessionId,
          playtestContext,
          question,
          gameState,
          plan,
          packet,
          deterministic
        });
      }

      const baseQueries = buildRetrievalQueries(question, history);
      let retrieval = retrieveIntelligentRules(corpus, question, history, plan, {
        baseQueries,
        limit: 10,
        excerptLength: 1200
      });
      retrieval = prioritizeRulePacketSources(retrieval, corpus, packet, {
        limit: 10,
        excerptLength: 1200
      });

      const reasoningEffort = chooseReasoningEffort(plan, env.OPENAI_REASONING_EFFORT || "low");
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
      let draftSources = selectUsedSources(retrieval.sources, draft.source_ids);
      let draftStatus = normalizeRulingStatus(draft.ruling_status, draftSources.length);

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
        rulingScope: rulingStatus === "provisional" ? "play_session" : null,
        subject: packet.subject || null,
        topic: packet.topic || null,
        executionPath: "model"
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
          candidateSources: retrieval.sources.map(toDiagnosticSource),
          reasoningEffort,
          verification,
          retryCount: 0,
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

async function handleDeterministicAnswer({
  env,
  allowedOrigin,
  corpus,
  sessionId,
  playtestContext,
  question,
  gameState,
  plan,
  packet,
  deterministic
}) {
  const sources = materializeDeterministicSources(corpus, deterministic);
  const corpusSnapshot = await getCorpusSnapshot(corpus);
  const result = {
    answer: deterministic.answer,
    rulingStatus: deterministic.rulingStatus,
    confidence: deterministic.confidence,
    sources,
    version: corpus.version || RULES_VERSION,
    rulingScope: deterministic.rulingStatus === "provisional" ? "play_session" : null,
    subject: deterministic.subject || packet.subject || null,
    topic: deterministic.topic || packet.topic || null,
    responseType: deterministic.responseType,
    executionPath: "deterministic"
  };
  result.interactionId = await persistSmartInteraction(env, {
    sessionId,
    ...playtestContext,
    question,
    answer: result.answer,
    gameVersion: result.version,
    rulingStatus: result.rulingStatus,
    confidence: result.confidence,
    mode: "retrieval_only",
    model: null,
    sources,
    diagnostics: {
      questionPlan: {
        ...plan,
        activeSubject: result.subject,
        activeTopic: result.topic,
        deterministicCaseId: deterministic.id,
        executionPath: "deterministic"
      },
      retrievalQueries: [],
      candidateSources: sources.map(toDiagnosticSource),
      reasoningEffort: "low",
      verification: null,
      retryCount: 0,
      gameState,
      corpusHash: corpusSnapshot.corpusHash
    }
  });
  return jsonResponse(result, 200, allowedOrigin);
}

function toDiagnosticSource(source) {
  return {
    id: source.canonicalId || source.id,
    title: source.title,
    sourcePath: source.sourcePath,
    excerpt: source.excerpt,
    retrievalReason: source.retrievalReason,
    retrievalScore: source.retrievalScore
  };
}

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
    .map(({ id, canonicalId, title, sourcePath, sourceUrl, excerpt }) => ({
      id: canonicalId || id,
      title,
      sourcePath,
      sourceUrl,
      excerpt
    }));
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
    rulingStatus: item?.rulingStatus ? String(item.rulingStatus).trim().slice(0, 40) : null,
    subject: item?.subject ? String(item.subject).trim().slice(0, 160) : null,
    topic: item?.topic ? String(item.topic).trim().slice(0, 160) : null
  })).filter((item) => item.content);
}

function mergeSmartHistory(storedHistory, suppliedHistory) {
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

function isFeatureEnabled(value) {
  return String(value || "off").toLowerCase() === "on";
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
