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
  "source_lookup"
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

const CLEAR_NON_GAMEPLAY_PATTERNS = [
  /\b(morally|moral(?:ity)?|ethical(?:ly)?|ethics|justified|right or wrong|good or evil)\b/i,
  /\b(lore|backstory|fictional history|historical inspiration|real[- ]world (?:analogue|ideology|inspiration)|ideology inspired)\b/i,
  /\b(costume|visual design|art|illustration|aesthetic|appearance|what does .* look like)\b/i,
  /\b(design intent|why was .* designed|balance suggestion|buffed|nerfed)\b/i,
  /\b(best|strongest|strong|optimal|most powerful)\b[\s\S]*\b(strategy|deck|build|faction|leader)\b/i,
  /\b(?:build|make|give|recommend) me\b[\s\S]{0,100}\bdeck\b/i,
  /\b(strategy|deck|build) recommendation\b/i,
  /\bwho should i play\b/i,
  /\b(?:what(?:'s| is)? changed|what changed|changes? since)\b[\s\S]*\b(?:version|v?\d+\.\d+)\b/i,
  /\b(?:compare|difference between)\b[\s\S]*\bv?\d+\.\d+\b/i
];

export function isClearlyOutOfScopeQuestion(question) {
  const text = String(question || "").trim();
  return Boolean(text) && CLEAR_NON_GAMEPLAY_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildOutOfScopeRuling() {
  return {
    id: "out-of-scope-precheck",
    answer: "The Rules Arbiter handles gameplay rules and table rulings. It does not determine lore, morality, historical interpretation, artwork, strategy, or game-design judgments.",
    rulingStatus: "out_of_scope",
    sourceIds: [],
    subject: null,
    topic: "scope",
    confidence: "high",
    responseType: "scope"
  };
}
