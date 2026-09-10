const CURRENT_STATUSES = new Set([
  "explicit",
  "inferred",
  "provisional",
  "out_of_scope",
  "unresolved",
  "source_lookup"
]);

const CURRENT_ANSWER_MODES = new Set([
  "ai",
  "ai_verified",
  "local_fallback",
  "retrieval_only",
  "source_lookup",
  "clarification"
]);

export function normalizeCurrentRulingStatus(status, fallback = "provisional") {
  const value = String(status || "").trim();
  return CURRENT_STATUSES.has(value) ? value : fallback;
}

export function toLegacyRulingStatus(status) {
  const current = normalizeCurrentRulingStatus(status);
  if (current === "explicit" || current === "inferred" || current === "unresolved") return current;
  return "unresolved";
}

export function normalizeCurrentAnswerMode(mode, fallback = "ai") {
  const value = String(mode || "").trim();
  return CURRENT_ANSWER_MODES.has(value) ? value : fallback;
}

export function toLegacyAnswerMode(mode) {
  const current = normalizeCurrentAnswerMode(mode);
  if (current === "retrieval_only" || current === "local_fallback" || current === "source_lookup") {
    return "retrieval_only";
  }
  return "ai";
}

export function isGameplayQuestionPlan(plan) {
  const type = String(plan?.questionType || plan?.question_type || "").trim().toLowerCase();
  return type !== "out_of_scope";
}

export function buildScopeRecoveryRuling(question) {
  const text = String(question || "");
  const impossibleChoice = /\b(either|choose)\b[\s\S]*\bor\b/i.test(text)
    && /\b(no cards?|nothing)\b[\s\S]*\bhand\b|\bcannot\b[\s\S]*\b(discard|perform|complete)\b/i.test(text);

  if (impossibleChoice) {
    return "The opponent must choose an option they can actually perform. If they have no card in Hand, the discard option is unavailable, so they must choose the option that gives you +1 to your battle total.";
  }

  return "Treat an option that cannot be completed as unavailable and resolve a legal option instead. The written rules do not expressly decide this interaction, so this is a provisional table ruling.";
}

const ASSISTANT_IDENTITY_SCOPE_PATTERNS = [
  /\b(?:what(?:'s| is)|tell me|state)\s+your\s+(?:name|purpose|role)\b/i,
  /\b(?:who|what)\s+are\s+you\b/i,
  /\btell me of your purpose\b/i
];

const ASSISTANT_IMPLEMENTATION_SCOPE_PATTERNS = [
  /\bmachine behind (?:the )?mechanics\b/i,
  /\b(?:underlying|internal)\s+(?:assistant|system|model|implementation|prompt|instructions?)\b/i,
  /\b(?:system|model|prompt|implementation|instructions?)\s+(?:behind|underlying|inside)\s+(?:you|the rules arbiter|this)\b/i,
  /\bhow (?:are you|is the rules arbiter) (?:built|implemented|programmed)\b/i
];

const GENERAL_NON_GAMEPLAY_PATTERNS = [
  /\bdo you know who\s+(?!the\s+(?:attacker|defender|active player)\b|(?:my|your)\b).+?\s+(?:is|was)\b/i,
  /\bwhat would .{1,80}(?:'s|’s)\s+(?:favorite|favourite|preferred)\s+(?:cards?|faction|leader|deck)\s+(?:be|include)\b/i
];

const CLEAR_NON_GAMEPLAY_PATTERNS = [
  /\b(morally|moral(?:ity)?|ethical(?:ly)?|ethics|justified|right or wrong|good or evil)\b/i,
  /\b(lore|backstory|fictional history|historical inspiration|real[- ]world (?:analogue|ideology|inspiration)|ideology inspired)\b/i,
  /\b(costume|visual design|art|illustration|aesthetic|appearance|what does .* look like)\b/i,
  /\b(design intent|why was .* designed|balance suggestion|buffed|nerfed)\b/i,
  /\bwho (?:is|was) .{1,80} (?:designed after|based on|modeled after|modelled after|inspired by)\b/i,
  /\bwhat (?:historical |real[- ]world )?(?:person|figure|individual) (?:inspired|influenced) .{1,80}\b/i,
  /\b(best|strongest|strong|optimal|most powerful)\b[\s\S]*\b(strategy|deck|build|faction|leader)\b/i,
  /\b(?:build|make|give|recommend) me\b[\s\S]{0,100}\bdeck\b/i,
  /\b(strategy|deck|build) recommendation\b/i,
  /\bwho should i play\b/i,
  /\b(?:what(?:'s| is)? changed|what changed|changes? since)\b[\s\S]*\b(?:version|v?\d+\.\d+)\b/i,
  /\b(?:compare|difference between)\b[\s\S]*\bv?\d+\.\d+\b/i,
  /\b(?:will there be|are there plans? for|is there (?:an?|any) plan for|when is|when will)\b[\s\S]{0,120}\b(?:expansions?|roadmap)\b/i,
  /\b(?:next|future|upcoming|planned)\s+(?:expansion|release)\b/i,
  /\b(?:expansions?|development|release) roadmap\b/i
];

function outOfScopeKind(question) {
  const text = String(question || "").trim();
  if (!text) return null;
  if (ASSISTANT_IDENTITY_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) return "assistant_identity";
  if (ASSISTANT_IMPLEMENTATION_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) return "assistant_implementation";
  if (GENERAL_NON_GAMEPLAY_PATTERNS.some((pattern) => pattern.test(text))) return "general_or_speculative";
  if (CLEAR_NON_GAMEPLAY_PATTERNS.some((pattern) => pattern.test(text))) return "non_gameplay";
  return null;
}

export function isClearlyOutOfScopeQuestion(question) {
  return Boolean(outOfScopeKind(question));
}

export function buildOutOfScopeRuling(question = "") {
  const kind = outOfScopeKind(question);
  const answer = kind === "assistant_identity"
    ? "I am the Gauntlet Rules Arbiter. My purpose is to answer questions about the current canonical Gauntlet gameplay rules and provide source-grounded table rulings."
    : kind === "assistant_implementation"
      ? "I am the Gauntlet Rules Arbiter. I can describe my role at a high level: I answer current canonical Gauntlet gameplay-rules questions and provide source-grounded table rulings. The implementation behind the Arbiter is outside that rules-only role."
      : "That is outside the Rules Arbiter's scope. I answer questions about the current canonical Gauntlet gameplay rules and table rulings; I do not answer general-knowledge or speculative questions, determine lore or historical interpretation, make strategy or game-design judgments, or discuss future development plans.";
  return {
    id: "out-of-scope-precheck",
    answer,
    rulingStatus: "out_of_scope",
    sourceIds: [],
    subject: null,
    topic: "scope",
    confidence: "high",
    responseType: "scope"
  };
}
