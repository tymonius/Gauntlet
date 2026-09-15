import { shouldForceUndefinedTransformationGap } from "./r13-classification.js";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/^(?:card|leader|faction|order|rulebook):\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function authorityNames(source) {
  const names = new Set();
  for (const value of [source?.heading, source?.title]) {
    const raw = String(value || "").replace(/^(?:Card|Leader|Faction|Order|Rulebook):\s*/i, "").trim();
    if (!raw) continue;
    names.add(normalize(raw));
    const dashTail = raw.split(/\s+[—–]\s+/).at(-1);
    const colonTail = raw.split(/:\s+/).at(-1);
    if (dashTail) names.add(normalize(dashTail));
    if (colonTail) names.add(normalize(colonTail));
  }
  return [...names].filter((name) => name.length >= 4);
}

function explicitTopicPivot(question) {
  return /^\s*(?:separate issue|different question|new question|unrelated|switching topics?|on another topic)\b/i.test(String(question || ""));
}

export function hasReferentialFollowupCue(question) {
  const current = String(question || "").trim().toLowerCase();
  if (!current || explicitTopicPivot(current)) return false;
  return /\b(?:it|its|they|them|their|theirs|that|those|this|these|which|same|both|former|latter|there|then|one|ones|again|another|next|else|extra|back)\b/.test(current)
    || /^(?:and|but|so|then|also|okay|ok|no|yes|wait|what about|how about|after|if)\b/.test(current);
}

export function shouldCarryImmediateHistory(question) {
  const current = String(question || "").trim().toLowerCase();
  const words = current.match(/[a-z0-9']+/g) || [];
  if (!words.length || words.length > 24 || !hasReferentialFollowupCue(question)) return false;
  if (words.length <= 10) return true;

  const continuationLead = /^(?:and|but|so|then|also|okay|ok|no|yes|wait|what about|how about|after|if)\b/.test(current);
  const strongDeictic = /\b(?:this|that)\s+(?:one|ones|card|effect|ability|feature|step|move|movement|result|ruling|choice|option|territory|gambit|tactic)\b/.test(current)
    || /\b(?:theirs|former|latter|same one|same card|same effect|same ability|same feature|same step)\b/.test(current);
  return continuationLead || strongDeictic;
}

export function hasTerseSurveillanceLanguage(question) {
  const current = String(question || "").toLowerCase();
  const observation = /\b(?:watch|watched|watching|peek|peeked|peeking|looked at|saw|seen)\b/.test(current);
  const battleCommitment = /\b(?:gambits?|tactics?)\b/.test(current);
  return observation && battleCommitment;
}

export function isOccupationControlQuestion(question) {
  const current = String(question || "").toLowerCase();
  return /\b(?:win|wins|won|winning|victory)\b/.test(current)
    && /\b(?:attack|attacker|battle)\b/.test(current)
    && /\bterritor(?:y|ies)\b/.test(current)
    && /\b(?:control|controls|controlled|occupy|occupies|occupied|occupation|occupier)\b/.test(current);
}

export function recentNamedAuthority(sourceList = [], history = [], question = "") {
  if (!shouldCarryImmediateHistory(question)) return null;
  const recent = normalize(
    (Array.isArray(history) ? history : []).slice(-2).map((item) => String(item?.content || "")).join(" ")
  );
  if (!recent) return null;

  const matches = (Array.isArray(sourceList) ? sourceList : [])
    .filter((source) => /^(?:card|leader|faction|order):/i.test(String(source?.canonicalId || "")))
    .filter((source) => authorityNames(source).some((name) => recent.includes(name)));

  if (matches.length !== 1) return null;
  return matches[0];
}

export function buildGate3CAdjudicationReminder(question, sources = [], history = []) {
  const reminders = [];
  const recentAuthority = recentNamedAuthority(sources, history, question);
  if (recentAuthority) {
    const title = String(recentAuthority.title || recentAuthority.heading || "the named authority").replace(/^(?:Card|Leader|Faction|Order):\s*/i, "");
    reminders.push(
      `The immediately preceding exchange identifies ${title} as the governing named authority for this referential follow-up. Resolve the current question from that authority first unless the player explicitly changes topic. If it supplies a material part of the ruling, include its source ID rather than substituting a generic baseline rule.`
    );
  }

  if (shouldForceUndefinedTransformationGap(question, sources)) {
    reminders.push(
      "The retrieved authority names a transformed state but does not define what that resulting state does. Do not inherit the pre-transformation card text, Overlay effect, duration, removal condition, destination, or other mechanics unless clean authority expressly says they survive the transformation. This is a genuine rules gap: classify the ruling provisional, identify what the written rules do and do not establish, and make only the minimum table ruling needed to continue play."
    );
  }

  return reminders.join("\n");
}