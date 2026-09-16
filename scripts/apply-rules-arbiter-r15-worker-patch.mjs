import { readFileSync, writeFileSync } from "node:fs";

const workerPath = "rules-assistant/worker-v071.js";
let worker = readFileSync(workerPath, "utf8");

const oldRevision = 'export const BEHAVIOR_REVISION = "v071-qa-20260915-14";';
const newRevision = 'export const BEHAVIOR_REVISION = "v071-qa-20260916-15";';
if (worker.split(oldRevision).length - 1 !== 1) {
  throw new Error("Expected exactly one r14 behavior revision marker.");
}
worker = worker.replace(oldRevision, newRevision);

const functionStart = worker.indexOf("export function buildAmbiguousReferentClarification(question, history = [], retrieval = []) {");
const functionEndMarker = "\n}\n\nexport function augmentRetrievalForContext";
const functionEnd = worker.indexOf(functionEndMarker, functionStart);
if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Could not locate the r14 ambiguity clarification function.");
}

const replacement = String.raw`function referentSourceAliasesR15(source) {
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
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    count += (normalized.match(new RegExp("\\b" + escaped + "s?\\b", "g")) || []).length;
  }
  return count;
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

  if (localCompatibleReferentCountR15(current, match, noun, retrieval) === 1) {
    return null;
  }

  const namedAuthoritySubjects = currentNamedAuthoritySubjects(current, retrieval);
  if (namedAuthoritySubjects.length === 1) return null;

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
  if (subjects.length === 1) return null;

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
}`;

worker = worker.slice(0, functionStart) + replacement + worker.slice(functionEnd + 2);
writeFileSync(workerPath, worker, "utf8");

for (const testPath of [
  "rules-assistant/v071-ambiguous-referent-clarification.test.mjs",
  "rules-assistant/v071-gate3-c-worker-integration.test.mjs"
]) {
  let testText = readFileSync(testPath, "utf8");
  const occurrences = testText.split("v071-qa-20260915-14").length - 1;
  if (occurrences !== 1) throw new Error(`Expected one r14 revision assertion in ${testPath}; found ${occurrences}.`);
  testText = testText.replace("v071-qa-20260915-14", "v071-qa-20260916-15");
  writeFileSync(testPath, testText, "utf8");
}
