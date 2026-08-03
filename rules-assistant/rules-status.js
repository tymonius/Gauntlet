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
