import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import {
  V071_RULES_VERSION,
  V071_VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "./v071-public-corpus.js";
import { persistSmartInteraction } from "./rules-persistence.js";
import { authorizeGitHubActionsQa } from "./github-actions-qa-auth.js";
import { normalizeR13RulingStatus, shouldForceAbsentProcedureGap, shouldResolveR27CombinedInteraction } from "./r13-classification.js";
import {
  buildGate3CAdjudicationReminder,
  hasTerseSurveillanceLanguage,
  isOccupationControlQuestion,
  shouldCarryImmediateHistory
} from "./v071-gate3-c-remediation.js";
import {
  applyHighRiskVerification,
  highRiskVerificationReasons,
  verifyHighRiskDraft
} from "./v071-answer-verifier.js";

export const RULES_VERSION = V071_RULES_VERSION;
export const BEHAVIOR_REVISION = "v071-qa-20260920-32";
const FALLBACK_MODEL = "gpt-5.6-terra";
const CORPUS_CACHE_TTL_MS = 5 * 60 * 1000;
const BATTLE_CARD_DESTINATION_AUTHORITY_IDS = [
  "rulebook:gambit-area",
  "rulebook:tactic-area",
  "rulebook:clearing-battle-cards"
];
const BATTLE_CARD_QUANTITY_AUTHORITY_IDS = [
  "rulebook:game-at-a-glance"
];
const BATTLE_CARD_REPLACEMENT_AUTHORITY_IDS = [
  "rulebook:replacing-a-gambit-or-tactic"
];
const ACCEPTED_TERMS_AUTHORITY_IDS = [
  "rulebook:accepted-terms"
];
const INTELLIGENCE_INTERFERENCE_AUTHORITY_IDS = [
  "rulebook:gambit-surveillance",
  "rulebook:tactic-surveillance",
  "rulebook:interference-after-surveillance",
  "rulebook:direct-interference",
  "rulebook:intelligence-mirrors",
  "rulebook:multiple-gambits-or-tactics",
  "rulebook:replacing-a-gambit-or-tactic",
  "rulebook:revising-a-choice"
];
const SHOCK_AND_AWE_AUTHORITY_IDS = [
  "card:military-shock-and-awe",
  "rulebook:conflicting-victory-benefits"
];
const PEACE_TREATY_AUTHORITY_IDS = [
  "rulebook:treaty-articles-and-peace-treaty"
];
const MYSTICS_TRANSMUTATION_AUTHORITY_IDS = [
  "rulebook:transmutation"
];
const INQUISITION_CONDEMNATION_AUTHORITY_IDS = [
  "rulebook:condemnation"
];
const GENERIC_REROLL_AUTHORITY_IDS = [
  "rulebook:rerolls"
];
const SPECIAL_OPERATION_COMPLETION_AUTHORITY_IDS = [
  "rulebook:readiness-and-completion"
];
const RITUAL_ASCENSION_AUTHORITY_IDS = [
  "rulebook:completion",
  "rulebook:interruption"
];
const EFFECT_MOVEMENT_AUTHORITY_IDS = [
  "rulebook:movement-granted-by-effects"
];
const MILITARY_COMMAND_AUTHORITY_IDS = [
  // "Command and Orders" is a structural parent heading with no body of its own.
  // The governing v0.7.1 text is the nested Complete rules document.
  "rulebook:complete-rules-17"
];
const SPECIFIC_RULE_PRECEDENCE_AUTHORITY_IDS = [
  "rulebook:golden-rules"
];
const FIELDCRAFT_TERRITORY_STATE_AUTHORITY_IDS = [
  "rulebook:ranger",
  "faction:fieldcraft",
  "leader:fieldcraft"
];
const DEED_CONTIGUITY_AUTHORITY_IDS = [
  "rulebook:deeds",
  "rulebook:front-line"
];
const OCCUPATION_CONTROL_AUTHORITY_IDS = [
  "rulebook:occupation",
  "rulebook:front-line",
  "rulebook:normal-capture"
];
const STARTING_TERRITORY_AUTHORITY_IDS = [
  "rulebook:starting-territory"
];
const MISSION_ABORT_AUTHORITY_IDS = [
  "rulebook:aborting-and-failing"
];
const FOLLOWUP_BATTLE_AUTHORITY_IDS = [
  "rulebook:initiating-battles"
];
const SHORTHAND_ACTION_AUTHORITY_IDS = [
  "rulebook:actions"
];
const REVEAL_ZONE_AUTHORITY_IDS = [
  "rulebook:revealing-cards-and-zones"
];
const GAMBIT_TACTIC_ROLE_AUTHORITY_IDS = [
  "rulebook:gambit-and-tactic-effect-roles"
];
const NO_WINNER_AUTHORITY_IDS = [
  "rulebook:battles-ending-without-a-winner"
];
const CAPITAL_LIMIT_AUTHORITY_IDS = [
  "rulebook:capital-and-capital-ledger"
];
const GUARDIANS_AUTHORITY_IDS = [
  "rulebook:spirit-walker",
  "faction:guardians-of-the-circle",
  "leader:guardians-of-the-circle"
];
const DIPLOMATIC_LATITUDE_AUTHORITY_IDS = [
  "card:diplomats-diplomatic-latitude",
  "rulebook:multiple-proposals"
];
const DETENTE_AUTHORITY_IDS = [
  "card:diplomats-detente"
];
const ASSIMILATION_SIEGE_AUTHORITY_IDS = [
  "card:neutral-assimilation",
  "card:neutral-protracted-siege",
  "rulebook:front-line",
  "rulebook:normal-capture",
  "rulebook:immediate-capture-effects"
];
const EXFILTRATION_LOSS_AUTHORITY_IDS = [
  "card:intelligence-exfiltration",
  "rulebook:battles-ending-without-a-winner"
];
const REARGUARD_ROUT_AUTHORITY_IDS = [
  "card:military-rearguard",
  "leader:rout",
  "rulebook:complete-rules-17"
];
const DIRECT_PERMISSION_AUTHORITY_IDS = [
  "rulebook:directly-permitted-card-procedures"
];
const NEGATED_BATTLE_CARD_AUTHORITY_IDS = [
  "rulebook:negation",
  "rulebook:clearing-battle-cards"
];
const CONDITION_PREFIX_AUTHORITY_IDS = [
  "rulebook:condition-prefixes"
];
const ADDITIONAL_TACTIC_AUTHORITY_IDS = [
  "rulebook:additional-tactics",
  "rulebook:reserve-and-tactics"
];
const NO_MARTYRS_AUTHORITY_IDS = [
  "rulebook:no-martyrs"
];
const COUNTERINTELLIGENCE_AUTHORITY_IDS = [
  "rulebook:counterintelligence",
  "card:neutral-counterintelligence"
];
const POISONOUS_GAS_AUTHORITY_IDS = [
  "territory:territory-poisonous-gas"
];
const CONTINGENCY_REMOVAL_AUTHORITY_IDS = [
  "card:neutral-contingency-plan",
  "rulebook:removed-assets"
];
const MONASTERY_INVOCATION_AUTHORITY_IDS = [
  "territory:territory-monastery",
  "rulebook:invocation"
];
const RITE_BOUND_DESTINATION_AUTHORITY_IDS = [
  "rulebook:bound-cards-3"
];
const DIPLOMAT_MIRROR_AUTHORITY_IDS = [
  "rulebook:diplomat-mirrors"
];
const DIPLOMATIC_RECOGNITION_AUTHORITY_IDS = [
  "proposal:diplomats-proposal-diplomatic-recognition",
  "rulebook:diplomatic-recognition"
];
const SMUGGLERS_RUN_AUTHORITY_IDS = [
  "territory:territory-smuggler-s-pass"
];
const ASSET_REPLACEMENT_AUTHORITY_IDS = [
  "rulebook:replacing-an-asset"
];
let corpusPromise;
let corpusLoadedAt = 0;

const ADJUDICATION_GUIDE = `
ADJUDICATION PRINCIPLES
- Apply the supplied current rules and component text first. Specific text overrides general text.
- Exceptions, permissions, additional plays, movement, or reopened timing windows must be granted expressly.
- Do not reopen a completed timing window or reapply an effect unless the supplied rules expressly do so.
- Resolve one instruction as fully as possible before beginning the next.
- Resolve references such as "that card", "it", "them", and "those cards" according to the instruction sequence. Bind each reference to the most recent compatible game object already introduced, unless grammar or explicit text establishes another referent; account for card movements and other state changes already resolved.
- Treat concrete game-state facts stated by the player as premises unless the player is asking whether that premise is legally possible. Apply retrieved authority to the consequences of those facts; do not silently replace a stated win with a withdrawal, loss, or other alternative event merely because that event appears in retrieved authority.
- Resolve possessives such as "their Territory" or "their land" from their grammatical antecedent and the immediate conversation. Do not silently switch the referent to the current player merely because a retrieved rule is written from that player’s perspective.
- When the player explicitly names a card, Leader ability, Faction feature, or other supplied authority, treat that named authority as the governing subject for generic phrases such as "that effect" or "that card effect" unless the question clearly introduces a different subject.
- Preserve supplied ownership, control, card-zone, and timing defaults unless an effect changes them.
- Keep ownership and control attached to the game object the supplied authority names. Do not transfer the owner or controller of a card, Overlay, Deed, Territory, or other object onto another object it affects unless supplied authority expressly equates those roles.
- Preserve printed effect labels and named game terminology exactly. Do not relabel an Asset, Use, Battle, Gambit/Tactic, Overlay, or other printed effect as an Action unless the supplied authority labels it Action; distinguish an Action that banks a card from a later ability of the banked Asset.
- An effect that grants additional Actions changes the number of available Actions, not the legal phase or timing of another effect, unless it expressly changes that timing.
- Treat literal card shorthand such as "+1 Action" or "+2 Actions" as the defined +N Action notation, not as generic prose saying "one additional Action this turn." The shorthand grants those Actions in the current phase unless it names another phase.
- Do not assume an optional card, Asset, Leader ability, Faction feature, or other modifier is active merely because it appears in retrieval. Apply optional game state only when the player or recent conversation states it is present, active, controlled, banked, used, or otherwise relevant. An unmentioned exception may be noted as a conditional caveat only when useful; it must not reverse the direct baseline answer.
- Never treat an extra-Action grant as permission to use a phase-limited Feature in a different phase. When explaining a grant that supplies Actions in more than one phase, distinguish Action quantity from the Feature's legal timing.
- When several granted Actions span different phases and at least one must be a phase-limited Feature, that requirement constrains which granted Action must satisfy the Feature requirement; it does not move the Feature into another phase. If only one granted phase is legal for that Feature, use the Feature in that phase and use another legal Action in the other granted phase.
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

Classification boundary:
- Use explicit only when clean authority directly states each material premise required by the answer. A negative answer may be explicit when the rules expressly confine an action, effect, timing, zone, or permission to the stated condition.
- A faithful paraphrase of a fact directly stated by clean authority remains explicit. Do not downgrade to inferred merely because the player names the resulting game state differently; for example, a setup instruction that directly places a Player Token at that player’s end directly answers where that player starts.
- Substituting values supplied by the question into a directly stated numerical formula, threshold, or progression remains explicit when no independent rule premise is required. Arithmetic evaluation of a direct rule is not by itself a deductive bridge.
- Do not downgrade a directly stated result to inferred merely because other retrieved sources are present. If one clean authority directly answers every material part of the question, classify the ruling explicit unless the answer actually depends on combining that authority with another independent premise.
- Directly enumerated consequences of one rule or effect remain explicit, including its stated timing, conditional branches, exceptions, destinations, and numerical results. Surrounding baseline or context sources do not by themselves turn that direct answer into an inference.
- When a card or other specific component text directly states the queried exception, permission, prohibition, timing, or same-turn allowance, answering that direct instruction remains explicit even when it differs from the normal baseline. Do not classify the direct exception inferred merely because a general rule states the baseline it overrides.
- When one clean authority establishes that an event does not count as a win, loss, battle, trigger event, or other required condition, and a separate authority makes another effect depend on that condition, the downstream consequence is inferred unless one clean source directly states that consequence. That conclusion combines authorities even though both premises are explicit.
- When clean authority expressly confines an Action, Faction Feature, effect, or permission to a named phase or timing, a question asking whether it is legal outside that timing is an explicit negative unless supplied authority expressly changes that timing. A generic additional-Action permission does not make that direct timing restriction inferred.
- A summary may remain explicit when it compiles several independently stated facts from multiple clean sources, provided every material statement is directly stated and the summary adds no new relationship, permission, prohibition, equivalence, or conclusion between them. Multiple citations alone do not make an answer inferred.
- A procedure remains explicit when a clean source directly enumerates its steps or when the answer only restates directly stated procedural facts. Procedural compilation is not inference unless the answer derives a new rule, permission, prohibition, or relationship.
- Use inferred when direct premises must be combined to reach a new conclusion that no clean source itself states. This includes conclusions about the absence of adjacency, contiguity, restrictions, permissions, or requirements even when each supporting premise is explicit.
- A negative conclusion based on the rules not stating a condition is inferred unless clean authority expressly says that condition is not required. For example, if the Deed rules state purchase and ownership rules but never directly say Deeds need not be contiguous, a no-contiguity ruling is inferred, not explicit.
- A conflict that an explicit precedence rule resolves is not a genuine rules gap. Apply the precedence rule and classify the result inferred when resolving the conflict requires combining the precedence rule with the conflicting authorities. Reserve provisional for conflicts or ambiguities that remain after the supplied precedence rules are applied.
- For a named card, its printed effect is the specific component instruction for that card. If a rulebook summary of that same card differs from the printed mode-specific timing or destination, follow the printed effect unless the rulebook expressly states that it overrides or corrects the card.
- When a supplied named-card rule conflicts with a supplied rulebook passage about that same card and the Golden Rules resolve the conflict, classify the resolution inferred and cite the printed card, the conflicting rulebook authority, and the Golden Rules. Do not present the winning component text as conflict-free explicit authority.
- Use inferred when the answer depends on combining rules into a conclusion that no clean source itself states, or on the absence of a restriction, exception, adjacency, contiguity, or other requirement. Silence is not explicit authority.
- Before returning explicit, test every material claim: could the cited text itself be quoted or paraphrased to state that claim without adding a deductive bridge? If not, return inferred unless a genuine gap makes provisional necessary.

Requirements:
1. State the answer first. Do not label an explicit or inferred answer "Table ruling" or use similar provisional-sounding labels.
2. A specific supplied component rule overrides a general supplied rule.
3. Treat prior provisional rulings from the same session as binding unless a supplied clean authority source contradicts them.
4. For a provisional ruling, begin the answer with exactly "Provisional Arbiter Ruling:", clearly distinguish the judgment from written authority, explain the closest supplied analogy or adjudication principle, and state that it applies for the rest of the current game and is logged for designer review. Reserve that label for provisional rulings only.
5. Put supporting source IDs only in the source_ids array. Never include internal source IDs such as [S1] or [S1, S2] in the player-facing answer. Cite only supplied source IDs that actually support the answer. Explicit or inferred answers require at least one supporting source.
6. Keep the answer direct and useful at the table. For explicit and inferred answers, do not discuss retrieval mechanics or say "the supplied passages/text/sources" unless the player specifically asks about source coverage.
7. Write the answer as plain text only. The Rules Arbiter widget does not render Markdown. Do not use Markdown emphasis markers, backticks, headings, tables, or other formatting syntax. Write formulas directly, for example: Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium.
8. Resolve follow-up referents against the immediately preceding exchange first. This includes pronouns and elliptical corrections or fragments such as "which is what", "which are", "where do they go", "no, their destinations", and similar terse follow-ups. Preserve the most recently contrasted property or noun phrase as the active referent; do not reset from that property to the broader objects being compared unless the player does so explicitly.
9. When the requested distinction is a concrete source, timing, destination, cost, number, zone, or other named value, state that concrete value. Do not answer circularly with placeholders such as "the Gambit destination" or "the Tactic destination" when the actual destinations are supplied.
10. Before returning provisional, check the retrieved clean authority for a direct answer to the requested property. If a clean source directly states it, use explicit; if the answer is compelled by combining clean sources, use inferred. Provisional is only for a genuine remaining gap or ambiguity.
11. For a multi-step procedure, reconstruct the whole applicable sequence from the supplied authority before answering. Preserve prerequisites, separate costs, timing windows, destinations, replacement-or-pass choices, revision permissions, and every rule that says a replacement or revision does not reopen an earlier window. Do not collapse distinct Faction Features into one procedure merely because one enables the other.
12. Track referents through each instruction in written order. For phrases such as "that card", "it", "them", or "those cards", bind the reference to the most recent compatible game object introduced by the text after accounting for movements or state changes already resolved. Do not switch the referent back to the source card merely because it is the card being read; do so only when the grammar or explicit text identifies the source card.
13. Do not guess an unidentified referent. If a terse follow-up says "this ability", "that effect", "that card", or another generic object description and the immediately preceding exchange does not unambiguously identify one matching game object, ask a concise clarification instead of speculating about plausible cards, factions, abilities, or timings.
14. When explaining an exception that expands an Action, phase, or timing permission, state the baseline restriction that the exception changes as well as the exception itself. An additional Action does not erase the normal legal timing of the Feature or effect using it.
15. Do not infer that a requirement for at least one of several Actions to be a phase-limited Feature moves that Feature into an otherwise illegal phase. Satisfy the requirement in a phase where the Feature is already legal unless the text expressly changes its timing.
16. When a direct phase restriction itself answers a legality question, keep the ruling explicit even if another supplied rule explains why the player has an additional Action at that time. Cite the timing restriction and the additional-Action rule when both are material to the explanation.
17. For overview questions, summarize the directly supported mechanics without exposing retrieval coverage. Do not say that an "available passage", "available source", or retrieved excerpt omits the rest of a procedure; omit unsupported detail instead unless the player specifically asks about source coverage.
18. When an effect grants Actions in multiple phases and requires at least one of those Actions to be a phase-limited Feature, treat that requirement as constraining which granted Action must be used for the Feature, not as permission to change the Feature's timing. If only one granted phase is legal for that Feature, the Feature must be used in that phase; another legal Action must fill any other granted phase.
19. Do not classify a terse gameplay-rules question out_of_scope merely because it uses an inflected or colloquial form of a supplied named mechanic. When retrieved authority directly matches the gameplay term or procedure being asked about, treat the question as in scope and adjudicate it from that authority.
20. For a yes/no question, make the first yes/no word agree with the literal proposition being asked and with the explanation that follows. Pay special attention to negative forms such as "does that stop/prevent/block...?" If the action remains legal, answer "No" to that negative proposition before explaining why.
21. When the player asks for the normal, default, or baseline rule, do not apply an optional named card or effect that the player did not state is active. Answer the baseline first; any unmentioned exception is conditional only.
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

export function normalizeOutOfScopeAnswerR19() {
  return "That request is outside the Rules Arbiter's gameplay-rules scope.";
}

export function stripInlineSourceMarkers(value) {
  return String(value || "")
    .replace(/\s*\[(?:S\d+\s*(?:,\s*S\d+\s*)*)\]/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

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
      let retrieval = retrieveRules(corpus, retrievalQuery, {
        limit: 10,
        excerptLength: 1300
      });
      retrieval = augmentRetrievalForContext(corpus, question, history, retrieval);
      const clarification = buildAmbiguousReferentClarification(question, history, retrieval);
      const diagnostics = {
        questionPlan: clarification
          ? { contextDependent: true, clarificationReason: clarification.reason }
          : null,
        retrievalQueries: [retrievalQuery],
        candidateSources: retrieval.map(toDiagnosticSource),
        reasoningEffort: env.OPENAI_REASONING_EFFORT || "low",
        verification: null,
        retryCount: 0,
        gameState: null,
        corpusHash: corpus.authoritySetId || ""
      };

      if (clarification) {
        failureStage = "persistence";
        const result = {
          answer: clarification.answer,
          rulingStatus: clarification.rulingStatus,
          confidence: clarification.confidence,
          responseType: clarification.responseType,
          sources: [],
          executionPath: clarification.executionPath
        };
        result.interactionId = await persistSmartInteraction(env, {
          sessionId,
          playtestSessionId,
          sheetSerial,
          question,
          answer: clarification.answer,
          gameVersion: RULES_VERSION,
          rulingStatus: clarification.rulingStatus,
          confidence: clarification.confidence,
          mode: "clarification",
          model: null,
          sources: [],
          diagnostics
        });
        return answerResponse(result, origin);
      }

      const verificationReasons = highRiskVerificationReasons(question, retrieval);
      const verificationPlanned = verificationReasons.length > 0;
      const modelBudget = env.OPENAI_API_KEY
        ? await reserveModelRequest(request, env)
        : { allowed: false, reason: "model_not_configured" };
      const verifierBudget = verificationPlanned && env.OPENAI_API_KEY && modelBudget.allowed
        ? await reserveModelRequest(request, env)
        : { allowed: !verificationPlanned, reason: verificationPlanned ? "primary_model_unavailable" : "not_required" };

      if (
        !env.OPENAI_API_KEY
        || !modelBudget.allowed
        || (verificationPlanned && !verifierBudget.allowed)
      ) {
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
          diagnostics: {
            ...diagnostics,
            modelBudget,
            verifierBudget,
            verification: {
              planned: verificationPlanned,
              reasons: verificationReasons,
              completed: false
            }
          }
        });
        return answerResponse(result, origin);
      }

      failureStage = "model";
      let modelResult = await askOpenAI({ env, request, question, history, sources: retrieval });
      let verification = null;
      let verificationApplied = false;

      if (verificationPlanned) {
        failureStage = "verification";
        verification = await verifyHighRiskDraft({
          env,
          request,
          question,
          sources: retrieval,
          draft: modelResult,
          reasons: verificationReasons
        });
        const application = applyHighRiskVerification(modelResult, verification, retrieval, question);
        modelResult = application.draft;
        verificationApplied = application.applied;
        diagnostics.verification = {
          planned: true,
          reasons: verificationReasons,
          completed: true,
          valid: verification.valid,
          issues: verification.issues,
          replacementApplied: application.applied,
          applicationReason: application.reason
        };
      } else {
        diagnostics.verification = {
          planned: false,
          reasons: [],
          completed: false
        };
      }

      failureStage = "model";
      let sources = selectUsedSources(retrieval, modelResult.source_ids);
      const rulingStatus = normalizeR13RulingStatus(
        normalizeModelRulingStatus(modelResult.ruling_status, question, sources),
        question,
        sources
      );
      if (rulingStatus === "out_of_scope") sources = [];
      const cleanModelAnswer = stripInlineSourceMarkers(modelResult.answer);
      const answer = rulingStatus === "out_of_scope"
        ? normalizeOutOfScopeAnswerR19()
        : rulingStatus === "provisional"
          ? ensureProvisionalAnswer(cleanModelAnswer)
          : cleanModelAnswer;
      const confidence = deriveConfidence(rulingStatus, sources.length);

      const result = {
        answer,
        rulingStatus,
        confidence,
        responseType: responseTypeFor(rulingStatus),
        sources,
        executionPath: verificationPlanned
          ? (verificationApplied ? "model-verified-repaired" : "model-verified")
          : "model"
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
        mode: verificationPlanned ? "ai_verified" : "ai",
        model: env.OPENAI_MODEL || FALLBACK_MODEL,
        sources,
        diagnostics: {
          ...diagnostics,
          modelBudget,
          verifierBudget
        }
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

async function reserveBudgetCounters(env, counters, timestamp, failureLabel) {
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
      reason: failureLabel === "qa" ? "qa_reserved" : "reserved",
      limits: Object.fromEntries(counters.map(({ scope, limit }) => [scope, limit]))
    };
  } catch (error) {
    console.error(`Rules Arbiter ${failureLabel} model budget reservation failed closed`, error);
    return { allowed: false, reason: `${failureLabel}_budget_store_error` };
  }
}

async function reserveQaModelRequest(env, authorization) {
  const now = new Date();
  const timestamp = now.toISOString();
  const counters = [
    {
      scope: "qa_run",
      bucket: `${authorization.runId}:${authorization.runAttempt}`,
      limit: positiveInteger(env.RULES_QA_MODEL_REQUESTS_PER_RUN, 150)
    },
    {
      scope: "qa_global_day",
      bucket: timestamp.slice(0, 10),
      limit: positiveInteger(env.RULES_QA_MODEL_REQUESTS_PER_DAY, 150)
    },
    {
      scope: "qa_global_month",
      bucket: timestamp.slice(0, 7),
      limit: positiveInteger(env.RULES_QA_MODEL_REQUESTS_PER_MONTH, 500)
    }
  ];
  return reserveBudgetCounters(env, counters, timestamp, "qa");
}

async function reserveModelRequest(request, env) {
  if (!env.DB) {
    return { allowed: false, reason: "budget_store_unavailable" };
  }

  const qaAuthorization = await authorizeGitHubActionsQa(request);
  if (qaAuthorization.authorized) {
    return reserveQaModelRequest(env, qaAuthorization);
  }
  if (qaAuthorization.reason !== "qa_oidc_not_present") {
    return { allowed: false, reason: qaAuthorization.reason };
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const safetyId = await makeSafetyIdentifier(request, env);
  const counters = [
    {
      scope: "ip_hour",
      bucket: `${timestamp.slice(0, 13)}:${safetyId}`,
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_IP_HOUR, 24)
    },
    {
      scope: "global_day",
      bucket: timestamp.slice(0, 10),
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_DAY, 100)
    },
    {
      scope: "global_month",
      bucket: timestamp.slice(0, 7),
      limit: positiveInteger(env.RULES_MODEL_REQUESTS_PER_MONTH, 500)
    }
  ];
  return reserveBudgetCounters(env, counters, timestamp, "public");
}

export function buildQuestionSpecificAdjudicationReminder(question, sources = [], history = []) {
  const current = String(question || "").trim().toLowerCase();
  const sourceList = Array.isArray(sources) ? sources : [];
  const canonicalIds = new Set(sourceList.map((source) => String(source?.canonicalId || "")));
  const reminders = [];
  const gate3CReminder = buildGate3CAdjudicationReminder(question, sourceList, history);
  if (gate3CReminder) reminders.push(gate3CReminder);

  const namedAuthoritySubjects = currentNamedAuthoritySubjects(question, sourceList);
  if (namedAuthoritySubjects.length === 1) {
    reminders.push(
      "The question explicitly names a supplied governing authority. Resolve the requested property from that named authority before considering generic alternatives. If that authority directly states every material part needed for the answer, classify the ruling explicit even when other context sources are present. Do not invent additional procedure, timing windows, replacements, destinations, or game objects that the named authority does not state."
    );
  }

  if (
    /\b(?:contigu(?:ous|ity)|adjacen(?:t|cy))\b/.test(current)
    && canonicalIds.has("rulebook:deeds")
    && canonicalIds.has("rulebook:front-line")
  ) {
    reminders.push(
      "This question compares one game's ownership rules with a separate contiguity or adjacency rule. A negative conclusion drawn because the queried object's rules do not state that restriction is a combined-authority inference unless clean authority expressly says the restriction does not apply. If the answer is negative for that reason, classify it inferred and cite both authorities that establish the distinction."
    );
  }

  const sourceAuthorityText = sourceList.map((source) => [
    source?.title,
    source?.heading,
    source?.excerpt,
    source?.body
  ].map((value) => String(value || "").toLowerCase()).join(" "));

  if (shouldForceAbsentProcedureGap(question, sourceList)) {
    reminders.push(
      "The player is asking for an official rollback, rewind, repair, or remedy that the supplied clean authority does not define. Treat this as a genuine rules gap, not an inference from the normal procedure. Classify the ruling provisional. Give a minimal usable table ruling that preserves the current game state as much as practical, clearly distinguish it from written authority, and keep the normal provisional duration/designer-review language."
    );
  }

  if (shouldResolveR27CombinedInteraction(question, sourceList)) {
    reminders.push(
      "This answer depends on combining a named card's +N Action instruction with the Rulebook definition of +N Action as current-phase shorthand. No single supplied authority states the resulting card-specific phase conclusion by itself. Classify the ruling inferred and cite both the named card and the Actions shorthand authority."
    );
  }

  const replacementInsteadAuthority = sourceAuthorityText.some((text) =>
    /\bwhen\b[^.]{0,180}\bwould\b[^.]{0,180}\binstead\b/.test(text)
  );
  if (
    replacementInsteadAuthority
    && /\b(?:would|capture|captured|instead|what happens?|happen)\b/.test(current)
  ) {
    reminders.push(
      "A direct instruction of the form 'when X would happen, do Y instead' makes Y replace X. Do not also apply X unless a separate supplied authority expressly says that the replaced event still occurs. State the replacement result first and do not invert the meaning of 'instead'."
    );
  }

  const optionalCostThenBenefitAuthority = sourceAuthorityText.some((text) =>
    /\byou may\b[\s\S]{0,260}\bif you do\b/.test(text)
  );
  if (
    optionalCostThenBenefitAuthority
    && /\b(?:can|may|does|do|gain|gains|measure|measures|how much|what happens?)\b/.test(current)
  ) {
    reminders.push(
      "When a direct effect is written as an optional activation or cost followed by 'If you do' and a benefit, preserve that activation condition when stating the benefit. Do not make the benefit sound automatic or omit the required card movement, discard, spend, or other stated cost that unlocks it."
    );
  }

  const noQualifyingEventSource = sourceAuthorityText.some((text) =>
    /\b(?:not a battle fought, won, or lost|no battle is fought|no winner|without a battle result)\b/.test(text)
  );
  const dependentTriggerSource = sourceAuthorityText.some((text) =>
    /\b(?:wins? a battle|after .*win|if .*win|victory)\b/.test(text)
  );
  if (noQualifyingEventSource && dependentTriggerSource) {
    reminders.push(
      "This question links one authority that says the encounter does not produce the required battle/win/result with another authority whose effect triggers only from that required condition. The downstream trigger conclusion is a combined-authority inference unless one clean source directly states the final consequence. Classify that derived consequence inferred and cite the authorities establishing both premises."
    );
  }

  const recentConversation = Array.isArray(history)
    ? history.slice(-4).map((item) => String(item?.content || "")).join(" ").toLowerCase()
    : "";
  const statedGameState = `${recentConversation} ${current}`;
  const asksBaselineRule = /\b(?:normal|normally|default|baseline|generally|usually)\b/.test(current);
  const unmentionedOptionalCards = sourceList.filter((source) => {
    if (!String(source?.canonicalId || "").startsWith("card:")) return false;
    const title = String(source?.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase();
    return title.length >= 3 && !statedGameState.includes(title);
  });
  if (asksBaselineRule && unmentionedOptionalCards.length) {
    reminders.push(
      "The player is asking for the normal/default rule. Do not apply a retrieved optional card or Asset that the player did not state is present or active. Answer the baseline rule first. You may mention an unmentioned modifier only as a clearly conditional caveat, and it must not reverse the direct yes/no answer."
    );
  }

  const negativeYesNoQuestion = /^\s*(?:and\s+)?(?:does|do|did|can|could|will|would|is|are)\b/.test(current)
    && /\b(?:stop|prevent|block|prohibit|bar|keep)\b/.test(current);
  if (negativeYesNoQuestion) {
    reminders.push(
      "This is a negative-form yes/no question. Make the first yes/no word match the literal proposition and the explanation: if the stated effect does not stop/prevent/block the action, answer No before explaining that the action remains legal."
    );
  }

  const statedWin = /\b(?:win|wins|won|winning|victory)\b/.test(current);
  const withdrawalAuthorityPresent = sourceAuthorityText.some((text) =>
    /\bwithdraw(?:al|s|n|ing)?\b/.test(text)
  );
  if (statedWin && withdrawalAuthorityPresent) {
    reminders.push(
      "The player explicitly states that the battle was won. Preserve that stated result as a premise. Do not substitute withdrawal or another no-winner branch merely because a retrieved authority mentions it. Apply only the authority branches consistent with the stated win unless the player is asking whether that win was legally possible."
    );
  }

  if (
    canonicalIds.has("rulebook:battles-ending-without-a-winner")
    && /\b(?:no winner|without a winner|ends? without a winner)\b/.test(current)
    && /\b(?:clear|committed|reserve|gambit|tactic|battle cards?)\b/.test(current)
  ) {
    reminders.push(
      "For a battle that ends without a winner after Onset, preserve the complete clearing rule: both committed battle cards and cards remaining in Reserve clear normally unless the ending effect gives another destination. Do not omit the Reserve cards when the player asks whether already-committed cards clear."
    );
  }

  if (
    /\brearguard\b/.test(current)
    && /\brout\b/.test(current)
    && /\b(?:uses?|used)\s+rout\b/.test(current)
  ) {
    reminders.push(
      "The question states as a game-state premise that the opposing General uses Rout later that turn. Unless the player asks whether that Rout use was legal, do not re-litigate Rout's earlier win prerequisite. Resolve the stated Rout movement against Rearguard. If Rearguard prevents that movement, apply Rearguard's printed consequence that no Command is spent."
    );
  }

  if (
    /\bassimilation\b/.test(current)
    && /\bprotracted siege\b/.test(current)
    && canonicalIds.has("rulebook:front-line")
  ) {
    reminders.push(
      "Resolve the interaction through the Front Line control rules, not by treating 'advance Front Line' as a non-capture movement. A Front Line is the player's contiguous controlled Territories, and adding the next opposing Territory to it is the capture/control change. If Assimilation advances the Front Line to include the Territory Protracted Siege protects, evaluate Protracted Siege's capture-prevention trigger against that capture."
    );
  }

  if (
    canonicalIds.has("rulebook:directly-permitted-card-procedures")
    && /\b(?:bank|play|place|reveal|use)\b/.test(current)
    && /\b(?:action|another action|second action|extra action|consume|spend|cost)\b/.test(current)
  ) {
    reminders.push(
      "A rule or effect that directly instructs or permits a card procedure at a stated timing resolves that procedure as part of the instruction. It does not spend or require another Action unless the instruction expressly says 'as an Action', 'take an Action', or otherwise identifies an Action. Distinguish that direct permission from the ordinary inherent Bank Action or ordinary play-for-Action procedure."
    );
  }

  if (
    canonicalIds.has("rulebook:condition-prefixes")
    && /\b(?:attacker|defender|counterattack|win|lose)\b/.test(current)
    && /\b(?:clause|prefix|advantage|battle total|apply|applies|later|next)\b/.test(current)
  ) {
    reminders.push(
      "A condition prefix applies only to the clause that immediately follows it. Do not carry the condition across a sentence boundary or into a later independent clause unless that later clause is separately conditioned."
    );
  }

  if (
    canonicalIds.has("rulebook:counterintelligence")
    && /\bcounterintel(?:ligence)?\b/.test(current)
  ) {
    reminders.push(
      "Counterintelligence prevents the entire opposing revealing effect, not merely the information portion. Do not describe this as negating the revealed card unless a separate authority actually says the card is negated."
    );
  }

  if (
    canonicalIds.has("territory:territory-poisonous-gas")
    && /\bpoison(?:ous)?\s+gas\b/.test(current)
  ) {
    reminders.push(
      "Poisonous Gas expressly allows each player to employ Gambits or Tactics, but not both. If the player states that they set or use a Gambit, they cannot also use Tactics in that battle."
    );
  }

  if (
    canonicalIds.has("rulebook:bound-cards-3")
    && /\brite\b/.test(current)
    && /\bbound cards?\b/.test(current)
    && /\b(?:grave|graveyard)\b/.test(current)
  ) {
    reminders.push(
      "The Mystics bound-card rule directly affirms that when a Rite or Ritual binding ends without another instruction, its bound cards go to their owners' Graveyards. If the player asks whether they go to the Graveyard, answer Yes, not No."
    );
  }

  if (
    canonicalIds.has("rulebook:replacing-an-asset")
    && /\basset\b/.test(current)
    && /\b(?:cap|limit)\b/.test(current)
    && /\b(?:bank|banking|banked)\b/.test(current)
  ) {
    reminders.push(
      "When banking a new Asset at the Asset limit, discarding one controlled Asset to make room is part of the replacement procedure and is not a separate Action. Do not substitute the ordinary 'Discarding an Asset as an Action' procedure for this replacement discard."
    );
  }

  if (
    canonicalIds.has("card:inquisition-retribution")
    && /\bretribution\b/.test(current)
    && /\b(?:no assets?|\+?2 conviction|conviction|fires?|trigger)\b/.test(current)
  ) {
    reminders.push(
      "Retribution is controlled by the player who owns the card. After the opponent loses a battle they initiated, that controller may discard Retribution. If they do and the opponent has no Assets, the controller gains +2 Conviction. Do not say the opponent gains Conviction merely because the immediately preceding pronoun 'they' refers to the opponent's Assets."
    );
  }

  if (
    canonicalIds.has("card:neutral-counterworks")
    && /\bcounterworks\b/.test(current)
    && /\boverlays?\b/.test(current)
  ) {
    reminders.push(
      "Counterworks' Asset prevention is optional and requires discarding Counterworks. When answering whether it stops an opposing Overlay, preserve that condition explicitly: the player may discard Counterworks to prevent the Overlay, and the card that would become that Overlay is discarded. Do not describe the prevention as automatic or passive."
    );
  }

  const declarativeConfirmationQuestion = /\?\s*$/.test(String(question || ""))
    && current.split(/\s+/).filter(Boolean).length <= 20
    && !/^\s*(?:who|what|where|when|why|how|is|are|am|was|were|do|does|did|can|could|will|would|should|may|must|has|have|had)\b/.test(current)
    && !/\b(?:who|what|where|when|why|how)\b/.test(current);
  if (declarativeConfirmationQuestion) {
    reminders.push(
      "Treat this declarative player-language question as a yes/no confirmation of the proposition it states. If the governing text affirms that proposition, begin with Yes; if it contradicts it, begin with No. The first yes/no word must agree with the explanation. Do not begin with No and then restate the proposition as true, and do not begin with Yes and then explain that it is false."
    );
  }

  const namedCardSource = sourceList.find((source) => {
    if (!String(source?.canonicalId || "").startsWith("card:")) return false;
    const title = String(source?.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase();
    return title.length >= 3 && current.includes(title);
  }) || null;
  const namedCardTitle = namedCardSource
    ? String(namedCardSource.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase()
    : "";
  const goldenRules = sourceList.find((source) => String(source?.canonicalId || "") === "rulebook:golden-rules") || null;
  const rulebookReference = namedCardTitle
    ? sourceList.find((source) => {
        const canonicalId = String(source?.canonicalId || "");
        if (!canonicalId || canonicalId.startsWith("card:") || canonicalId === "rulebook:golden-rules") return false;
        const authorityText = [source?.title, source?.heading, source?.excerpt, source?.body]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return authorityText.includes(namedCardTitle);
      })
    : null;

  if (namedCardSource && rulebookReference && goldenRules) {
    reminders.push(
      "This retrieval contains printed named-card authority, a Rulebook authority that discusses the same named card, and the Golden Rules. First determine whether the card and Rulebook genuinely conflict on the same material instruction. Do not infer a conflict merely because one source is more detailed, summarizes the card, adds compatible restrictions, or states additional nonconflicting rules. If the authorities are compatible, do not invoke specificity; classify the answer normally, and it may remain explicit when every material claim is directly stated. Only when the sources are mutually incompatible on a material instruction should you apply the more-specific-rule precedence, classify the conflict-resolved result inferred, and cite the printed card, the conflicting Rulebook authority, and the Golden Rules. Do not call a genuinely conflict-resolved result explicit merely because the printed card supplies the winning instruction."
    );
  }

  return reminders.join("\n");
}

async function askOpenAI({ env, request, question, history, sources }) {
  const adjudicationReminder = buildQuestionSpecificAdjudicationReminder(question, sources, history);
  const questionText = adjudicationReminder
    ? `${question}\n\nQUESTION-SPECIFIC ADJUDICATION CHECK — apply before final classification\n${adjudicationReminder}`
    : question;
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
              `QUESTION\n${questionText}`,
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

function isContextDependentQuestion(question) {
  const current = String(question || "").trim().toLowerCase();
  const words = current.match(/[a-z0-9']+/g) || [];
  if (!words.length) return false;

  const shortCounterfactualCue = words.length <= 6 && /^(?:what if|and what if|but what if)\b/.test(current);
  const bareQuestionCue = words.length <= 2 && /^(?:where|which|why|when|how|what)\b/.test(current);
  return shouldCarryImmediateHistory(question) || shortCounterfactualCue || bareQuestionCue;
}

export function contextualQuery(question, history = []) {
  const current = String(question || "").trim();
  if (!current || !Array.isArray(history) || !history.length || !isContextDependentQuestion(current)) {
    return current;
  }
  const prior = history.slice(-2).map((item) => String(item?.content || "").trim()).filter(Boolean).join(" ").slice(-1200);
  return prior ? `${prior} ${current}` : current;
}

function normalizeReferentSubject(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/^(?:card|leader|faction|rulebook):\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalAuthoritySubject(source) {
  const canonicalId = String(source?.canonicalId || "");
  const match = canonicalId.match(/^(?:card|leader|faction|proposal|rite|order|mission|deed|territory|component):(.+)$/i);
  if (!match) return "";
  return normalizeReferentSubject(
    match[1]
      .replace(/^(?:military|diplomats|financiers|mystics|inquisition|intelligence|neutral)-/i, "")
      .replace(/-/g, " ")
  );
}

function authorityNameAliases(source) {
  const aliases = [];
  for (const value of [source?.heading, source?.title]) {
    const raw = String(value || "").replace(/^(?:Card|Leader|Faction):\s*/i, "").trim();
    if (!raw) continue;
    aliases.push(raw);
    const dashSubject = raw.split(/\s+[—–]\s+/).at(-1);
    if (dashSubject && dashSubject !== raw) aliases.push(dashSubject);
    const colonSubject = raw.split(/:\s+/).at(-1);
    if (colonSubject && colonSubject !== raw) aliases.push(colonSubject);
  }
  return [...new Set(aliases.map(normalizeReferentSubject).filter(Boolean))];
}

function currentNamedAuthoritySubjects(question, retrieval = []) {
  const current = ` ${normalizeReferentSubject(question)} `;
  if (!current.trim()) return [];

  const generic = new Set([
    "battle", "battle sequence", "complete rules", "rules", "timing", "action",
    "movement", "territory", "advantage", "after phase", "aftermath"
  ]);
  const subjects = new Set();

  for (const source of retrieval.slice(0, 10)) {
    const canonicalId = String(source?.canonicalId || "");
    if (!/^(?:card|leader|faction|proposal|rite|order|mission|deed|territory|component):/i.test(canonicalId)) continue;

    const canonicalSubject = canonicalAuthoritySubject(source);
    if (
      canonicalSubject.length >= 4
      && !generic.has(canonicalSubject)
      && current.includes(` ${canonicalSubject} `)
    ) {
      subjects.add(canonicalSubject);
      continue;
    }

    const matchingAliases = authorityNameAliases(source)
      .filter((alias) => alias.length >= 4 && !generic.has(alias) && current.includes(` ${alias} `))
      .sort((a, b) => a.length - b.length);
    if (matchingAliases.length) subjects.add(matchingAliases[0]);
  }

  return [...subjects];
}

function recentSpecificSubjects(history = [], retrieval = []) {
  const recent = normalizeReferentSubject(
    history.slice(-2).map((item) => String(item?.content || "")).join(" ")
  );
  if (!recent) return [];

  const generic = new Set([
    "battle", "battle sequence", "complete rules", "rules", "timing", "action",
    "movement", "territory", "advantage", "after phase", "aftermath"
  ]);
  const subjects = [];
  const seen = new Set();
  for (const source of retrieval.slice(0, 8)) {
    const subject = normalizeReferentSubject(source?.heading || source?.title || "");
    if (!subject || subject.length < 4 || generic.has(subject) || seen.has(subject)) continue;
    if (!recent.includes(subject)) continue;
    seen.add(subject);
    subjects.push(subject);
  }
  return subjects;
}

function referentSourceAliasesR15(source) {
  const aliases = [];
  for (const value of [source?.heading, source?.title]) {
    const raw = String(value || "")
      .replace(/^(?:Card|Leader|Faction|Proposal|Rite|Order|Mission|Deed|Territory|Asset|Component|Rulebook):\s*/i, "")
      .trim();
    if (!raw) continue;
    aliases.push(raw);
    const dashSubject = raw.split(/\s+[—–]\s+/).at(-1);
    if (dashSubject && dashSubject !== raw) aliases.push(dashSubject);
    const colonSubject = raw.split(/:\s+/).at(-1);
    if (colonSubject && colonSubject !== raw) aliases.push(colonSubject);
  }
  const canonicalTail = String(source?.canonicalId || "")
    .replace(/^[^:]+:/, "")
    .replace(/^(?:military|diplomats|financiers|mystics|inquisition|intelligence|neutral)-/i, "")
    .replace(/-/g, " ");
  if (canonicalTail) aliases.push(canonicalTail);
  return [...new Set(aliases.map(normalizeReferentSubject).filter((alias) => alias.length >= 4))];
}

function recentReferentSubjectsR15(history = [], retrieval = []) {
  const recent = " " + normalizeReferentSubject(
    history.slice(-2).map((item) => String(item?.content || "")).join(" ")
  ) + " ";
  if (!recent.trim()) return [];

  const generic = new Set([
    "battle", "battle sequence", "complete rules", "rules", "timing", "action",
    "movement", "territory", "advantage", "after phase", "aftermath"
  ]);
  const subjects = new Set();
  for (const source of retrieval.slice(0, 10)) {
    const matching = referentSourceAliasesR15(source)
      .filter((alias) => !generic.has(alias) && recent.includes(" " + alias + " "))
      .sort((a, b) => b.length - a.length);
    if (matching.length) subjects.add(matching[0]);
  }
  return [...subjects];
}

function localCompatibleReferentCountR15(current, match, noun, retrieval = []) {
  const prefix = String(current || "").slice(0, Math.max(0, Number(match?.index || 0)));
  const normalized = normalizeReferentSubject(prefix);
  if (!normalized) return 0;

  if (noun === "one") {
    return currentNamedAuthoritySubjects(prefix, retrieval).length;
  }

  const patterns = noun === "card"
    ? ["card", "gambit", "tactic", "asset", "proposal", "order", "mission", "rite", "deed", "overlay"]
    : [noun];
  let count = 0;
  for (const pattern of patterns) {
    const escaped = pattern;
    count += (normalized.match(new RegExp("\\b" + escaped + "s?\\b", "g")) || []).length;
  }
  return count;
}

function hasRecentExplicitComparisonR32(history = []) {
  const recentUser = [...history]
    .reverse()
    .find((item) => item?.role !== "assistant" && String(item?.content || "").trim());
  const text = String(recentUser?.content || "").trim();
  if (!text) return false;

  if (
    /\b(?:compar(?:e|ing)|looking at|choosing between|deciding between)\b[\s\S]{1,180}\b(?:and|with|versus|vs\.?)\b[\s\S]{1,180}/i.test(text)
  ) {
    return true;
  }

  return /\b[A-Z][A-Za-z0-9'’\-]*(?:\s+[A-Z][A-Za-z0-9'’\-]*){0,3}\s+and\s+[A-Z][A-Za-z0-9'’\-]*(?:\s+[A-Z][A-Za-z0-9'’\-]*){0,3}\b[\s\S]{0,80}\bboth\b/.test(text);
}

function hasClearLocalSingularAntecedentR18(current, match, noun) {
  if (!match || !noun || noun === "one") return false;
  const prefix = String(current || "").slice(0, Math.max(0, Number(match.index || 0)));
  const patterns = noun === "card"
    ? ["card"]
    : [noun];
  for (const pattern of patterns) {
    const re = new RegExp("\\b" + pattern + "\\b", "gi");
    const occurrences = [...prefix.matchAll(re)];
    if (!occurrences.length) continue;
    const last = occurrences.at(-1);
    const start = Math.max(0, Number(last.index || 0) - 60);
    const phrase = prefix.slice(start, Number(last.index || 0) + String(last[0] || "").length);
    const objectPhrase = new RegExp(
      "\\b(?:one|another|a|an|the)\\s+(?:[a-z0-9'’-]+\\s+){0,4}" + pattern + "$",
      "i"
    );
    if (objectPhrase.test(phrase.trim())) return true;
  }
  return false;
}

function isIdentityIndependentStakeLeverageQuestionR19(current, noun) {
  if (noun !== "proposal") return false;
  const text = String(current || "");
  const namesProposal = /\bproposal\b/i.test(text);
  const namesStakedInfluence = (
    /\bstak(?:e|ed|ing)\b/i.test(text) && /\binfluence\b/i.test(text)
  ) || /\b(?:this|that|the)\s+proposal[’']s\s+stake\b/i.test(text);
  return namesProposal
    && namesStakedInfluence
    && /\bleverage\b/i.test(text)
    && /\b(?:spend|use)\b/i.test(text);
}

function isIdentityIndependentBattleRoleQuestionR21(current, noun) {
  if (!["gambit", "tactic"].includes(noun)) return false;
  const text = String(current || "");
  return /\b(?:gambit|tactic|gambit\/tactic)\b/i.test(text)
    && /\b(?:heading|role|effect|text)\b/i.test(text)
    && /\b(?:choose|commit|committed|eligible|eligibility|use)\b/i.test(text);
}

export function buildAmbiguousReferentClarification(question, history = [], retrieval = []) {
  const current = String(question || "").trim();
  const genericRuleMatch = current.match(/\b(?:this|that)\s+(ability|effect|feature)\b/i);
  const genericCardMatch = current.match(/\b(?:this|that)\s+card(?:[’']s)?\b/i);
  const describedCardMatch = current.match(/\b(?:the|this|that|a)\s+(?:stored|saved|held|set[ -]?aside)\s+card\b/i);
  const typedObjectMatch = current.match(/\b(?:this|that)\s+(rite|asset|proposal|order|mission|deed|gambit|tactic|overlay|territory|leader|faction)\b/i);
  const genericOneMatch = current.match(/\b(?:this|that)\s+(one)\b/i);
  const match = genericRuleMatch || genericCardMatch || describedCardMatch || typedObjectMatch || genericOneMatch;
  if (!match) return null;

  const noun = genericCardMatch || describedCardMatch
    ? "card"
    : String(match[1] || "ability").toLowerCase();

  const normalizedCurrent = " " + normalizeReferentSubject(current) + " ";
  const explicitlyNamedCards = retrieval.filter((source) => {
    if (!String(source?.canonicalId || "").startsWith("card:")) return false;
    return referentSourceAliasesR15(source).some((alias) =>
      normalizedCurrent.includes(" " + alias + " ")
    );
  });
  if (explicitlyNamedCards.length === 1) return null;

  if (
    isIdentityIndependentStakeLeverageQuestionR19(current, noun)
    || isIdentityIndependentBattleRoleQuestionR21(current, noun)
  ) {
    return null;
  }

  if (hasClearLocalSingularAntecedentR18(current, match, noun)) {
    return null;
  }

  const recentExplicitComparison = Boolean(
    genericOneMatch && hasRecentExplicitComparisonR32(history)
  );

  if (
    !recentExplicitComparison
    && localCompatibleReferentCountR15(current, match, noun, retrieval) === 1
  ) {
    return null;
  }

  const namedAuthoritySubjects = currentNamedAuthoritySubjects(current, retrieval);
  if (!recentExplicitComparison && !genericOneMatch && namedAuthoritySubjects.length === 1) return null;

  const recentText = history.slice(-2).map((item) => String(item?.content || "")).join(" ");
  const familyCue = noun === "effect"
    ? /\beffects?\b/i
    : noun === "feature"
      ? /\bfeatures?\b/i
      : /\babilit(?:y|ies)\b/i;
  const isExpandedReferent = Boolean(typedObjectMatch || genericOneMatch);
  const subjects = isExpandedReferent
    ? recentReferentSubjectsR15(history, retrieval)
    : noun === "card"
      ? recentSpecificSubjects(history, retrieval)
      : familyCue.test(recentText)
        ? recentSpecificSubjects(history, retrieval)
        : [];
  if (!recentExplicitComparison && subjects.length === 1) return null;

  const answer = noun === "card"
    ? "Which card do you mean? Give me its name or exact text, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation."
    : noun === "one"
      ? "Which one do you mean? Give me the name of the card, Rite, Proposal, Order, Mission, Leader ability, Faction feature, or other game object you mean, plus any relevant game state that is not already clear from the conversation."
      : "Which " + noun + " do you mean? Give me its name or exact text, plus the current phase or step, whose turn it is, and any relevant game state that is not already clear from the conversation.";

  return {
    answer,
    rulingStatus: "unresolved",
    confidence: "low",
    responseType: "clarification",
    executionPath: "deterministic-clarification",
    reason: "unidentified_followup_referent"
  };
}

export function augmentRetrievalForContext(corpus, question, history = [], retrieval = []) {
  const current = String(question || "").trim().toLowerCase();
  const recent = history.slice(-6).map((item) => String(item?.content || "")).join(" ").toLowerCase();
  const immediateRecent = history.slice(-2).map((item) => String(item?.content || "")).join(" ");
  const combined = `${recent} ${current}`;
  const currentWordCount = current.split(/\s+/).filter(Boolean).length;
  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const immediateRecentNormalized = normalizeReferentSubject(immediateRecent);
  const recentCardFollowupCue = shouldCarryImmediateHistory(question);
  const recentCardAuthorityIds = recentCardFollowupCue
    ? documents
        .filter((document) => String(document?.id || "").startsWith("card:"))
        .filter((document) => {
          const title = normalizeReferentSubject(document?.title || document?.heading || "");
          return title.length >= 4 && immediateRecentNormalized.includes(title);
        })
        .map((document) => document.id)
        .slice(0, 4)
    : [];
  const explicitlyNamedCardAuthorityIds = documents
    .filter((document) => String(document?.id || "").startsWith("card:"))
    .filter((document) => {
      const title = normalizeReferentSubject(document?.title || document?.heading || "");
      return title.length >= 4 && (` ${normalizeReferentSubject(current)} `).includes(` ${title} `);
    })
    .map((document) => document.id)
    .slice(0, 2);
  const deedTopic = /\bdeeds?\b/;
  const contiguityCue = /\b(?:contigu(?:ous|ity)|adjacen(?:t|cy)|front line)\b/;
  const deedContiguityFocus = (
    deedTopic.test(current) && contiguityCue.test(current)
  ) || (
    currentWordCount <= 9
    && deedTopic.test(recent)
    && contiguityCue.test(current)
  );
  const destinationFocus = /\b(?:destinations?|discard(?: pile)?|graveyard)\b/.test(current)
    || /\bwhere\b[^?]{0,40}\b(?:go|goes|end up|land)\b/.test(current)
    || (currentWordCount <= 6 && /\bdestinations?\b/.test(recent));
  const battleCardFocus = /\b(?:gambits?|tactics?|battle cards?)\b/.test(combined);
  const battleCardQuantityFocus = /\b(?:how many|number|count)\b/.test(current)
    && /\b(?:battle cards?|gambits?|tactics?)\b/.test(current);
  const acceptedResponseCue = /\b(?:accept(?:s|ed|ing)?|say(?:s|ing)? yes|said yes|agree(?:s|d|ing)?)\b/.test(current);
  const termsOrDealCue = /\b(?:terms?|deal|offer)\b/.test(current);
  const acceptedTermsFocus = acceptedResponseCue && termsOrDealCue;
  const battleCardReplacementFocus = /\b(?:replace|replaces|replaced|replacing|replacement|replacements)\b/.test(current)
    && /\b(?:gambits?|tactics?|battle cards?)\b/.test(combined);
  const battleCardReplacementDestinationFocus = battleCardReplacementFocus
    && /\b(?:where|go|goes|destination|destinations|clear|cleared|clearing|both cards|what happens)\b/.test(current);
  const namedReplacementCardSource = battleCardReplacementFocus
    ? retrieval.find((source) => {
        if (!String(source?.canonicalId || "").startsWith("card:")) return false;
        const title = String(source?.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase();
        return title.length >= 3 && current.includes(title);
      })
    : null;
  const battleCardReplacementAuthorityIds = battleCardReplacementFocus
    ? [
        ...(namedReplacementCardSource ? [namedReplacementCardSource.canonicalId] : []),
        ...BATTLE_CARD_REPLACEMENT_AUTHORITY_IDS,
        ...(battleCardReplacementDestinationFocus ? ["rulebook:clearing-battle-cards"] : [])
      ]
    : [];
  const namedCardSource = retrieval.find((source) => {
    if (!String(source?.canonicalId || "").startsWith("card:")) return false;
    const title = String(source?.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase();
    return title.length >= 3 && current.includes(title);
  }) || null;
  const namedCardTitle = namedCardSource
    ? String(namedCardSource?.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase()
    : "";
  const namedCardMovementFocus = Boolean(namedCardSource)
    && /\b(?:move|moves|movement|advance|enter|enters|entering)\b/.test(current)
    && /\b(?:battle|onset|last stand|opponent(?:['’]s)? position)\b/.test(current);
  const namedCardMovementAuthorityIds = namedCardMovementFocus
    ? [namedCardSource.canonicalId, ...EFFECT_MOVEMENT_AUTHORITY_IDS]
    : [];
  const namedCardRuleReference = namedCardTitle
    ? retrieval.find((source) => {
        if (source === namedCardSource || String(source?.canonicalId || "").startsWith("card:")) return false;
        const authorityText = [source?.title, source?.heading, source?.excerpt, source?.body]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return authorityText.includes(namedCardTitle);
      })
    : null;
  const namedCardSpecificityFocus = Boolean(namedCardSource && namedCardRuleReference);
  const namedCardSpecificityAuthorityIds = namedCardSpecificityFocus
    ? [namedCardSource.canonicalId, namedCardRuleReference.canonicalId, ...SPECIFIC_RULE_PRECEDENCE_AUTHORITY_IDS]
    : [];
  const genericBattleCardDestinationFocus = destinationFocus && battleCardFocus && !namedCardSource;
  const occupationControlFocus = isOccupationControlQuestion(question);
  const intelligenceTopic = /\b(?:surveillance|interference|interfer(?:e|es|ed|ing)|intel)\b/;
  const intelligenceFollowupCue = /\b(?:gambits?|tactics?|cards?|face[ -]?up|reveals?|replac(?:e|es|ed|ing|ement|ements)|revis(?:e|es|ed|ing|ion|ions)|again|another|reopen|that|it|they|them|those)\b/.test(current);
  const intelligenceProcedureSubject = /\b(?:gambits?|tactics?|cards?|face[ -]?up|reveals?|replac(?:e|es|ed|ing|ement|ements)|revis(?:e|es|ed|ing|ion|ions)|cost|spend|intel)\b/.test(combined);
  const intelligenceInterferenceFocus = (
    intelligenceTopic.test(current)
    || hasTerseSurveillanceLanguage(question)
    || (currentWordCount <= 8 && intelligenceTopic.test(recent) && intelligenceFollowupCue)
  ) && intelligenceProcedureSubject;
  const shockAndAweTopic = /\bshock\s+and\s+awe\b/;
  const shockAndAweFollowupCue = /\b(?:orders?|move|movement|advance|capture|front line|command|breakthrough|consolidate|retreat|afterward)\b/.test(current);
  const shockAndAweFocus = shockAndAweTopic.test(current)
    || (currentWordCount <= 8 && shockAndAweTopic.test(recent) && shockAndAweFollowupCue);
  const shockAndAweAuthorityIds = shockAndAweFocus && /\bwar crimes\b/.test(combined)
    ? [...SHOCK_AND_AWE_AUTHORITY_IDS, "card:military-war-crimes"]
    : SHOCK_AND_AWE_AUTHORITY_IDS;
  const peaceTreatyTopic = /\b(?:peace treaty|treaty articles?|treat(?:y|ies)|ratif(?:y|ies|ied|ying|ication|ications))\b/;
  const peaceTreatyTimingCue = /\b(?:win|wins|winning|victory|now|immediately|start|next turn|capture|draw|sixth|6th|six|6|again)\b/.test(current);
  const proposalVictoryCue = /\bproposals?\b/.test(current) && peaceTreatyTimingCue;
  const recentPeaceTreatyTopic = peaceTreatyTopic.test(recent) || /\bproposals?\b/.test(recent);
  const peaceTreatyFocus = peaceTreatyTopic.test(current)
    || proposalVictoryCue
    || (currentWordCount <= 8 && recentPeaceTreatyTopic && peaceTreatyTimingCue);
  const peaceTreatyAuthorityIds = peaceTreatyFocus
    ? [
        ...PEACE_TREATY_AUTHORITY_IDS,
        ...(/\baccept(?:ed|s|ing|ance)?\b/.test(combined) ? ["rulebook:accepted-terms"] : []),
        ...(/\b(?:refus(?:e|es|ed|ing|al)|impos(?:e|es|ed|ing))\b/.test(combined) ? ["rulebook:refused-terms"] : [])
      ]
    : PEACE_TREATY_AUTHORITY_IDS;
  const mysticsTransmutationTopic = /\btransmut(?:ation|e|es|ed|ing)\b/;
  const inquisitionCondemnationFocus = /\bcondemn(?:ation|s|ed|ing)?\b/.test(current)
    || (currentWordCount <= 8 && /\bcondemn(?:ation|s|ed|ing)?\b/.test(recent));
  const mysticsSecondRiteCue = /\b(?:second|2nd|two|2)\b[^.!?]{0,50}\brites?\b|\brites?\b[^.!?]{0,50}\b(?:second|2nd|two|2)\b/;
  const mysticsProcedureCue = /\b(?:ability|feature|unlock(?:s|ed|ing)?|before dice|dice|hand|graveyard|value|spirit walker|alchemist)\b/.test(combined);
  const mysticsFollowupCue = /\b(?:it|that|same|ability|feature|unlock(?:s|ed|ing)?|before|dice|hand|graveyard|value)\b/.test(current);
  const recentMysticsTransmutationTopic = mysticsTransmutationTopic.test(recent) || mysticsSecondRiteCue.test(recent);
  const mysticsProgressionFocus = mysticsSecondRiteCue.test(current)
    || (currentWordCount <= 9 && mysticsSecondRiteCue.test(recent) && mysticsFollowupCue);
  const mysticsTransmutationFocus = mysticsTransmutationTopic.test(current)
    || (mysticsProgressionFocus && mysticsProcedureCue)
    || (currentWordCount <= 9 && recentMysticsTransmutationTopic && mysticsFollowupCue);
  const mysticsTransmutationAuthorityIds = mysticsTransmutationFocus
    ? [
        ...(mysticsProgressionFocus ? ["rulebook:progression"] : []),
        ...MYSTICS_TRANSMUTATION_AUTHORITY_IDS,
        ...(/\bspirit walker\b/.test(combined) && mysticsProgressionFocus ? ["rulebook:spirit-walker"] : [])
      ]
    : MYSTICS_TRANSMUTATION_AUTHORITY_IDS;
  const genericRerollFocus = /\b(?:reroll|re-roll|rerolled|re-rolled|rerolling|re-rolling)\b/.test(current)
    && !/\btiebreak\b/.test(current)
    && !/\b(?:first player|first turn|setup)\b/.test(current)
    && !namedCardSource;
  const rallyFollowupFocus = /\brally\b/.test(current)
    || (
      currentWordCount <= 20
      && /\brally\b/.test(recent)
      && /\b(?:attack|attacker|attacking|defend|defender|defending|before dice|battle|initiated)\b/.test(current)
    );
  const rallyAuthorityIds = rallyFollowupFocus
    ? documents
        .filter((document) => /\bmilitary\b[\s\S]*\bgeneral\b[\s\S]*\borders\b/.test(
          normalizeReferentSubject(document?.title || document?.heading || "")
        ) && /\brally\b/.test(normalizeReferentSubject(document?.body || "")))
        .map((document) => document.id)
        .slice(0, 1)
    : [];
  const militaryCommandFocus = /\bcommand\b/.test(current)
    && !/\brepel\b/.test(current)
    && (
      (
        /\b(?:already|begins?|starts?|maximum|max|at)\b[\s\S]{0,40}\b(?:2|two|maximum|max)\b/.test(current)
        && /\b(?:first|later|another|second)\b[\s\S]{0,50}\b(?:win|won|winning|victory)\b/.test(current)
      )
      || /\bwithdraw(?:al|s|n|ing)?\b/.test(current)
      || (
        /\bfirst\b[\s\S]{0,50}\b(?:battle|fight|win|won|victory)\b/.test(current)
        && /\b(?:opponent(?:['’]s)? turn|their turn|defend(?:ing|ed)?)\b/.test(current)
      )
    );
  const specialOperationTopic = /\bspecial\s+(?:operations?|ops?)\b/;
  const specialOperationProcedureCue = /\b(?:ready|readiness|complete|completion|cost|pay|payment|intel|value|territor(?:y|ies)|minimum|capture|captured|captures|progress|denouement|fail|fails|failed)\b/.test(current);
  const recentSpecialOperationTopic = specialOperationTopic.test(recent);
  const specialOperationFollowupCue = /\b(?:they|opponent|capture|captured|captures|territor(?:y|ies)|progress|ready|readiness|denouement|what happens|now|fail|fails|failed)\b/.test(current);
  const specialOperationFocus = (
    specialOperationTopic.test(current) && specialOperationProcedureCue
  ) || (
    currentWordCount <= 16
    && recentSpecialOperationTopic
    && specialOperationFollowupCue
  );
  const ritualTopic = /\britual(?: of ascension)?\b/;
  const ritualProcedureCue = /\b(?:initiate|initiated|attacker|defender|win|won|lose|lost|complete|completion|interrupt|battle)\b/.test(current);
  const ritualFocus = ritualTopic.test(current)
    || (currentWordCount <= 20 && ritualTopic.test(recent) && ritualProcedureCue);
  const specificRulePrecedenceFocus =
    /\b(?:conflict(?:s|ing)?|override(?:s|d|ing)?|different|which rule wins|more specific)\b/.test(current)
    && /\b(?:specific|card|rule|instruction|effect)\b/.test(combined)
    && /\b(?:normal|general|sequence|order|rule|effect)\b/.test(combined);
  const specificRulePrecedenceAuthorityIds = specificRulePrecedenceFocus
    ? [
        ...SPECIFIC_RULE_PRECEDENCE_AUTHORITY_IDS,
        ...(/\b(?:battle|gambit|tactic|sequence)\b/.test(combined) ? ["rulebook:battle-sequence"] : [])
      ]
    : SPECIFIC_RULE_PRECEDENCE_AUTHORITY_IDS;
  const fieldcraftTopic = /\bfieldcraft\b/;
  const fieldcraftTerritoryStateCue = /\b(?:control(?:s|led|ling)?|occupation|occupier|capture(?:s|d|ing)?|defensive edge|last stand|battle bonus(?:es)?|territor(?:y|ies)[ -]?(?:limit|limits)|limits? calculated from territor(?:y|ies))\b/;
  const fieldcraftCostCue = /\b(?:cost|costs|spend|spends|pay|pays|intel|how much)\b/.test(current);
  const fieldcraftFollowupCue = /\b(?:it|that|this|control|occupation|occupier|capture|defensive edge|last stand|bonus|limit|territory|territories|cost|spend|pay|intel)\b/.test(current);
  const fieldcraftFocus = (
    fieldcraftTopic.test(current)
    || (currentWordCount <= 9 && fieldcraftTopic.test(recent) && fieldcraftFollowupCue)
  ) && (fieldcraftTerritoryStateCue.test(combined) || fieldcraftCostCue);
  const militaryLateTacticFocus = /\bmilitary\b/.test(current)
    && /\b(?:add|adds|added|additional)\b[\s\S]{0,40}\btactic\b/.test(current)
    && /\b(?:after|late|face[ -]?up|reveal)\b/.test(current);
  const militaryLateTacticAuthorityIds = militaryLateTacticFocus
    ? documents
        .filter((document) => /\bmilitary\b[\s\S]*\badditional tactics\b/.test(
          normalizeReferentSubject(document?.title || document?.heading || "")
        ))
        .map((document) => document.id)
        .slice(0, 1)
    : [];
  const deedOwnershipChangeFocus = deedTopic.test(current)
    && /\b(?:capture|captured|control|controls|controlled|transfer|transfers|ownership)\b/.test(current)
    && /\b(?:deed|own|owner|ownership|transfer|keep|keeps|still)\b/.test(current);
  const startingTerritoryFocus = /\bsetup\b/.test(current)
    && /\b(?:token|placement|place|placed)\b/.test(current)
    && /\b(?:enter|enters|entered|entering|trigger|triggers|triggered)\b/.test(current);
  const missionAbortFocus = /\b(?:abort|aborts|aborted|aborting)\b/.test(current)
    && /\bmission\b/.test(current);
  const routFollowupBattleFocus = /\brout\b/.test(current)
    && /\b(?:battle|follow-up|followup|continuation|new|gambit|reserve|tactic|once-per-battle)\b/.test(current);
  const literalActionShorthand = /\+\s*\d+\s+actions?\b/;
  const shorthandActionFocus = literalActionShorthand.test(current)
    || (
      currentWordCount <= 20
      && literalActionShorthand.test(recent)
      && /\b(?:action|opening|denouement|phase|wait|extra|another|current)\b/.test(current)
    );
  const revealZoneInCurrent = (
    /\breveal(?:s|ed|ing)?\s+(?:(?:my|your|their|the|an?|opponent(?:['’]s)?|player(?:['’]s)?|its)\s+)?(?:entire\s+)?(?:hand|reserve)\b/.test(current)
    || /\b(?:hand|reserve)\b[\s\S]{0,24}\b(?:is|was|gets?|be|being)?\s*reveal(?:ed|ing|s)?\b/.test(current)
  );
  const revealZoneFocus = revealZoneInCurrent
    || (
      currentWordCount <= 20
      && /\breveal(?:s|ed|ing)?\b[\s\S]{0,40}\b(?:hand|reserve)\b/.test(recent)
      && /\b(?:hand|reserve|zone|face[ -]?up|still|remain|stays?)\b/.test(current)
    );
  const battleRoleFocus = /\b(?:gambit|tactic|gambit\/tactic)\b/.test(current)
    && /\b(?:heading|role|effect|text)\b/.test(current)
    && /\b(?:choose|commit|committed|eligible|eligibility|use)\b/.test(current);
  const noWinnerClearingFocus = /\b(?:no winner|without a winner|ends? without a winner)\b/.test(current)
    && /\b(?:clear|committed|reserve|gambit|tactic|battle cards?)\b/.test(current);
  const capitalLimitFocus = /\bcapital\b/.test(current)
    && /\blimit\b/.test(current);
  const guardiansFocus = /\bguardians of the circle\b/.test(current);
  const diplomaticLatitudeFocus = /\b(?:diplomatic\s+latitude|latitude)\b/.test(current)
    && /\b(?:terms?|proposal|proposals|refus|refused|accepted?|effect|effects)\b/.test(current);
  const detenteFocus = /\b(?:detente|détente)\b/.test(current);
  const assimilationSiegeFocus = /\bassimilation\b/.test(current)
    && /\bprotracted siege\b/.test(current);
  const exfiltrationLossFocus = /\bexfiltration\b/.test(current)
    && /\b(?:withdraw|los(?:e|es|t|ing)|loss|winner|trigger|effect)\b/.test(current);
  const rearguardRoutFocus = /\brearguard\b/.test(current)
    && /\brout\b/.test(current);
  const directPermissionFocus = (
    /\b(?:direct(?:ly)?|immediate(?:ly)?|effect|instruction|instructs?|permits?|lets?)\b/.test(current)
    && /\b(?:bank|play|place|reveal|use)\b/.test(current)
    && /\b(?:action|another action|second action|extra action|consume|spend|cost)\b/.test(current)
  ) || (
    /\b(?:conscription|trade concessions)\b/.test(current)
    && /\b(?:bank|play)\b/.test(current)
    && /\b(?:action|another|second|extra|cost|consume|spend)\b/.test(current)
  ) || (
    currentWordCount <= 14
    && /\b(?:conscription|trade concessions)\b/.test(recent)
    && /\b(?:action|another|second|extra|cost|consume|spend)\b/.test(current)
  );
  const negatedTacticDestinationFocus = /\bnegat(?:e|ed|ion)\b/.test(current)
    && /\btactic\b/.test(current)
    && /\b(?:discard|aftermath|destination|go|goes|still|clear)\b/.test(current);
  const conditionPrefixFocus = (
    /\b(?:condition|prefix|clause)\b/.test(current)
    || /\b(?:attacker|defender|counterattack|win|lose)\s*[—-]/.test(current)
  ) && /\b(?:advantage|battle total|apply|applies|later|next|clause|condition)\b/.test(current);
  const additionalTacticFocus = /(?:\+\s*\d+\s+tactics?\b|\b(?:additional|extra)\s+tactics?\b)/.test(current)
    && /\b(?:after|reveal|revealed|face ?up|faceup|late)\b/.test(current);
  const noMartyrsFocus = /\bno martyrs\b/.test(current)
    && /\b(?:retreat|loss|lose|loses|lost|trigger|benefit|prevent|stop)\b/.test(current);
  const counterintelligenceFocus = /\bcounterintel(?:ligence)?\b/.test(current)
    && /\b(?:reveal|revealing|cards?|hand|reserve|whole|entire|effect|block|prevent|stop)\b/.test(current);
  const poisonousGasFocus = /\bpoison(?:ous)?\s+gas\b/.test(current)
    && /\b(?:gambit|gambits|tactic|tactics|battle|both|either)\b/.test(current);
  const contingencyRemovalFocus = /\bcontingency plan\b/.test(current)
    && /\b(?:forced|force|asset cap|asset limit|lower|drops?|removed|trigger|discard|pitch)\b/.test(current);
  const monasteryInvocationFocus = /\bmonastery\b/.test(current)
    && /\binvocation\b/.test(current)
    && /\b(?:grave|graveyard|discard|move|moves|leave|leaving|out)\b/.test(current);
  const riteBoundDestinationFocus = /\brite\b/.test(current)
    && /\bbound cards?\b/.test(current)
    && /\b(?:grave|graveyard|destination|go|goes|binding ends?)\b/.test(current);
  const diplomatMirrorFocus = /\bdiplomat\b/.test(current)
    && /\bterms?\b/.test(current)
    && /\b(?:attacker|defender)\b/.test(current)
    && /\b(?:offer|offers|offered|offering|pass|passes|passed)\b/.test(current)
    && /\b(?:same battle|battle sequence|refus(?:e|ed|al)|other)\b/.test(current);
  const diplomaticRecognitionFocus = /\bdiplomatic recognition\b/.test(current)
    && /\b(?:refus(?:e|ed|al)|influence|impos(?:e|ed|ing)|win|wins|won|proposal)\b/.test(current);
  const smugglersRunFocus = /\bsmuggler[’']?s run\b/.test(current)
    && /\b(?:stash|stashed|stashing|control|lose|loses|lost|hand|discard|card)\b/.test(current);
  const assetReplacementFocus = /\basset\b/.test(current)
    && /\b(?:cap|limit)\b/.test(current)
    && /\b(?:bank|banking|banked)\b/.test(current)
    && /\b(?:ditch|discard|replace|replacing|replacement|room|new)\b/.test(current);
  const topicAuthorityIds = diplomatMirrorFocus
    ? DIPLOMAT_MIRROR_AUTHORITY_IDS
    : diplomaticRecognitionFocus
      ? DIPLOMATIC_RECOGNITION_AUTHORITY_IDS
    : smugglersRunFocus
      ? SMUGGLERS_RUN_AUTHORITY_IDS
    : assetReplacementFocus
      ? ASSET_REPLACEMENT_AUTHORITY_IDS
    : counterintelligenceFocus
    ? COUNTERINTELLIGENCE_AUTHORITY_IDS
    : poisonousGasFocus
      ? POISONOUS_GAS_AUTHORITY_IDS
    : contingencyRemovalFocus
      ? CONTINGENCY_REMOVAL_AUTHORITY_IDS
    : monasteryInvocationFocus
      ? MONASTERY_INVOCATION_AUTHORITY_IDS
    : riteBoundDestinationFocus
      ? RITE_BOUND_DESTINATION_AUTHORITY_IDS
    : conditionPrefixFocus
    ? CONDITION_PREFIX_AUTHORITY_IDS
    : negatedTacticDestinationFocus
      ? NEGATED_BATTLE_CARD_AUTHORITY_IDS
    : directPermissionFocus
      ? DIRECT_PERMISSION_AUTHORITY_IDS
    : additionalTacticFocus
      ? ADDITIONAL_TACTIC_AUTHORITY_IDS
    : noMartyrsFocus
      ? NO_MARTYRS_AUTHORITY_IDS
    : battleRoleFocus
    ? GAMBIT_TACTIC_ROLE_AUTHORITY_IDS
    : noWinnerClearingFocus
      ? NO_WINNER_AUTHORITY_IDS
    : capitalLimitFocus
      ? CAPITAL_LIMIT_AUTHORITY_IDS
    : guardiansFocus
      ? GUARDIANS_AUTHORITY_IDS
    : diplomaticLatitudeFocus
      ? DIPLOMATIC_LATITUDE_AUTHORITY_IDS
    : detenteFocus
      ? DETENTE_AUTHORITY_IDS
    : assimilationSiegeFocus
      ? ASSIMILATION_SIEGE_AUTHORITY_IDS
    : exfiltrationLossFocus
      ? EXFILTRATION_LOSS_AUTHORITY_IDS
    : rearguardRoutFocus
      ? REARGUARD_ROUT_AUTHORITY_IDS
    : shorthandActionFocus
      ? SHORTHAND_ACTION_AUTHORITY_IDS
    : revealZoneFocus
      ? REVEAL_ZONE_AUTHORITY_IDS
    : startingTerritoryFocus
      ? STARTING_TERRITORY_AUTHORITY_IDS
    : missionAbortFocus
      ? MISSION_ABORT_AUTHORITY_IDS
    : routFollowupBattleFocus
      ? FOLLOWUP_BATTLE_AUTHORITY_IDS
    : militaryLateTacticFocus
    ? militaryLateTacticAuthorityIds
    : rallyFollowupFocus
      ? rallyAuthorityIds
    : genericRerollFocus
      ? GENERIC_REROLL_AUTHORITY_IDS
    : militaryCommandFocus
      ? MILITARY_COMMAND_AUTHORITY_IDS
    : deedOwnershipChangeFocus
      ? ["rulebook:deeds"]
    : specialOperationFocus
      ? SPECIAL_OPERATION_COMPLETION_AUTHORITY_IDS
    : ritualFocus
      ? RITUAL_ASCENSION_AUTHORITY_IDS
    : namedCardMovementFocus
      ? namedCardMovementAuthorityIds
    : occupationControlFocus
      ? OCCUPATION_CONTROL_AUTHORITY_IDS
    : deedContiguityFocus
      ? DEED_CONTIGUITY_AUTHORITY_IDS
    : fieldcraftFocus
      ? FIELDCRAFT_TERRITORY_STATE_AUTHORITY_IDS
    : namedCardSpecificityFocus && !specificRulePrecedenceFocus && !inquisitionCondemnationFocus && !mysticsTransmutationFocus && !peaceTreatyFocus && !shockAndAweFocus && !intelligenceInterferenceFocus && !battleCardReplacementFocus && !genericBattleCardDestinationFocus && !battleCardQuantityFocus && !acceptedTermsFocus
      ? namedCardSpecificityAuthorityIds
    : specificRulePrecedenceFocus
      ? specificRulePrecedenceAuthorityIds
    : inquisitionCondemnationFocus
      ? INQUISITION_CONDEMNATION_AUTHORITY_IDS
    : mysticsTransmutationFocus
      ? mysticsTransmutationAuthorityIds
    : peaceTreatyFocus
      ? peaceTreatyAuthorityIds
    : acceptedTermsFocus
      ? ACCEPTED_TERMS_AUTHORITY_IDS
      : shockAndAweFocus
        ? shockAndAweAuthorityIds
        : intelligenceInterferenceFocus
          ? INTELLIGENCE_INTERFERENCE_AUTHORITY_IDS
          : battleCardReplacementFocus
            ? battleCardReplacementAuthorityIds
            : battleCardQuantityFocus
              ? BATTLE_CARD_QUANTITY_AUTHORITY_IDS
              : genericBattleCardDestinationFocus
                ? BATTLE_CARD_DESTINATION_AUTHORITY_IDS
                : [];
  const preferredAuthorityIds = [...new Set([
    ...topicAuthorityIds,
    ...recentCardAuthorityIds,
    ...explicitlyNamedCardAuthorityIds
  ])];
  if (!preferredAuthorityIds.length) return retrieval;

  const preferred = preferredAuthorityIds
    .map((canonicalId, index) => {
      const document = documents.find((candidate) => candidate.id === canonicalId);
      if (!document) return null;
      return {
        id: "",
        canonicalId,
        score: Number.MAX_SAFE_INTEGER - index,
        title: document.title,
        heading: document.heading,
        kind: document.kind,
        sourcePath: document.sourcePath,
        sourceUrl: document.sourceUrl,
        excerpt: document.body,
        body: document.body
      };
    })
    .filter(Boolean);
  if (!preferred.length) return retrieval;

  const preferredIds = new Set(preferred.map((source) => source.canonicalId));
  const suppressedIds = shorthandActionFocus
    ? new Set(["rulebook:additional-actions"])
    : militaryLateTacticFocus
      ? new Set(INTELLIGENCE_INTERFERENCE_AUTHORITY_IDS)
      : new Set();
  return [
    ...preferred,
    ...retrieval.filter((source) =>
      !preferredIds.has(source.canonicalId)
      && !suppressedIds.has(source.canonicalId)
    )
  ]
    .slice(0, 10)
    .map((source, index) => ({ ...source, id: `S${index + 1}` }));
}

function normalizeOverviewToken(value) {
  const token = String(value || "").toLowerCase();
  const withdrawalForms = new Set(["withdrawal", "withdrawing", "withdraws", "withdrew", "withdrawn"]);
  if (withdrawalForms.has(token)) return "withdraw";
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function overviewSubjectTokens(question) {
  const current = String(question || "").trim().replace(/[?!.]+$/, "");
  const match = current.match(/^how\s+(?:do|does)\s+(.+?)\s+work$/i)
    || current.match(/^what\s+happens\s+when\s+(.+)$/i);
  if (!match) return [];

  const subject = match[1];
  if (/\b(?:can|could|would|if|unless|except|versus|vs\.?|interact|interaction|conflict|override|same as|different from|like)\b/i.test(subject)) {
    return [];
  }

  const stopWords = new Set([
    "a", "an", "and", "the", "i", "you", "we", "they", "player", "players",
    "my", "your", "our", "their", "from", "in", "on", "at", "during", "of",
    "for", "to", "into", "with", "game", "battle"
  ]);

  return [...new Set((subject.toLowerCase().match(/[a-z0-9]+/g) || [])
    .map(normalizeOverviewToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token)))];
}

function sourceTopicTokens(source) {
  const title = String(source?.title || "").toLowerCase();
  return new Set((title.match(/[a-z0-9]+/g) || []).map(normalizeOverviewToken));
}

export function shouldPromoteDirectOverviewToExplicit(question, sources = []) {
  const subjectTokens = overviewSubjectTokens(question);
  if (!subjectTokens.length) return false;
  return (Array.isArray(sources) ? sources : []).some((source) => {
    const tokens = sourceTopicTokens(source);
    return subjectTokens.every((token) => tokens.has(token));
  });
}

export function normalizeModelRulingStatus(value, question, sources = []) {
  const normalized = ["explicit", "inferred", "provisional", "out_of_scope"].includes(value)
    ? value
    : "provisional";
  const sourceCount = Array.isArray(sources) ? sources.length : 0;
  if (["explicit", "inferred"].includes(normalized) && sourceCount < 1) return "provisional";
  if (normalized === "inferred" && shouldPromoteDirectOverviewToExplicit(question, sources)) {
    return "explicit";
  }
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

export function ensureProvisionalAnswer(value) {
  let answer = String(value || "").trim();
  if (!/^Provisional Arbiter Ruling:/i.test(answer)) {
    answer = `Provisional Arbiter Ruling: ${answer}`;
  }
  const hasDuration = /rest of (?:this|the(?: current)?|current) (?:game|play session)/i.test(answer);
  const hasDesignerLog = /logged for designer review/i.test(answer);
  if (!hasDuration) {
    answer += " Use this ruling for the rest of this game.";
  }
  if (!hasDesignerLog) {
    answer += " It has been logged for designer review.";
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
    env.ALLOWED_ORIGINS || "https://gauntlet.run,https://www.gauntlet.run,http://localhost:8000,http://127.0.0.1:8000"
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
