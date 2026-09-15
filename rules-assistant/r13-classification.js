const PHASE_NAMES = [
  "capture",
  "draw",
  "opening",
  "movement",
  "denouement",
  "cleanup",
  "onset",
  "aftermath"
];

function normalizeToken(value) {
  const token = String(value || "").toLowerCase();
  const withdrawalForms = new Set(["withdrawal", "withdrawing", "withdraws", "withdrew", "withdrawn"]);
  if (withdrawalForms.has(token)) return "withdraw";
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokens(value) {
  return (String(value || "").toLowerCase().match(/[a-z0-9]+/g) || []).map(normalizeToken);
}

function sourceText(source) {
  return [source?.title, source?.heading, source?.excerpt, source?.body]
    .map((value) => String(value || ""))
    .join("\n")
    .toLowerCase();
}

function normalizePhrase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^(?:card|leader|faction|order|rulebook):\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function directOverviewSubjectTokens(question) {
  const current = String(question || "").trim().replace(/[?!.]+$/, "");
  const match = current.match(/^how\s+(?:do|does)\s+(.+?)\s+work$/i)
    || current.match(/^what\s+happens\s+(?:when|on|during|if)\s+(.+)$/i);
  if (!match) return [];

  const subject = match[1];
  if (/\b(?:unless|except|versus|vs\.?|interact|interaction|override|same as|different from|like)\b/i.test(subject)) {
    return [];
  }

  const stopWords = new Set([
    "a", "an", "and", "the", "i", "you", "we", "they", "player", "players",
    "my", "your", "our", "their", "from", "in", "on", "at", "during", "of",
    "for", "to", "into", "with", "game", "battle", "has", "have", "had", "order"
  ]);

  return [...new Set(tokens(subject)
    .filter((token) => token.length >= 3 && !stopWords.has(token)))];
}

export function shouldPromoteExpandedDirectOverview(question, sources = []) {
  const subjectTokens = directOverviewSubjectTokens(question);
  if (!subjectTokens.length) return false;
  return (Array.isArray(sources) ? sources : []).some((source) => {
    const titleTokens = new Set(tokens(source?.title));
    return subjectTokens.every((token) => titleTokens.has(token));
  });
}

function namedAuthoritySubjects(source) {
  const subjects = new Set();
  for (const value of [source?.heading, source?.title]) {
    const normalized = normalizePhrase(value);
    if (!normalized) continue;
    subjects.add(normalized);
    const separators = String(value || "").split(/\s+[—–]\s+|:\s+/);
    const tail = normalizePhrase(separators.at(-1));
    if (tail) subjects.add(tail);
  }
  return [...subjects].filter((subject) => subject.length >= 4);
}

export function shouldPromoteNamedDirectAuthority(question, sources = []) {
  const current = ` ${normalizePhrase(question)} `;
  if (!current.trim()) return false;
  const generic = new Set([
    "battle", "complete rules", "rules", "timing", "movement", "action", "territory",
    "gambit", "tactic", "aftermath", "opening", "denouement"
  ]);

  return (Array.isArray(sources) ? sources : []).some((source) =>
    namedAuthoritySubjects(source).some((subject) =>
      !generic.has(subject) && current.includes(` ${subject} `)
    )
  );
}

function phaseLegalityActionTokens(question) {
  const phases = PHASE_NAMES.join("|");
  const current = String(question || "").trim();
  const match = current.match(new RegExp(
    `\\b(?:can|may)\\s+(?:i|you|we|they)\\s+(.+?)\\s+(?:during|in)\\s+(?:the\\s+)?(${phases})\\b`,
    "i"
  ));
  if (!match) return null;

  const stopWords = new Set([
    "a", "an", "and", "the", "my", "your", "our", "their", "one", "two", "another",
    "action", "actions", "card", "cards", "this", "that", "it"
  ]);
  const actionTokens = [...new Set(tokens(match[1])
    .filter((token) => token.length >= 3 && !stopWords.has(token)))];
  return actionTokens.length ? { actionTokens, askedPhase: match[2].toLowerCase() } : null;
}

export function shouldPromoteDirectPhaseLegality(question, sources = []) {
  const parsed = phaseLegalityActionTokens(question);
  if (!parsed) return false;

  const phasePattern = new RegExp(`\\b(?:during|in)\\s+(?:the\\s+)?(?:${PHASE_NAMES.join("|")})\\b`, "i");
  return (Array.isArray(sources) ? sources : []).some((source) => {
    const titleTokens = new Set(tokens(source?.title));
    if (!parsed.actionTokens.every((token) => titleTokens.has(token))) return false;
    return phasePattern.test(sourceText(source));
  });
}

function namedCardSource(sources) {
  return (Array.isArray(sources) ? sources : []).find((source) => /^card:\s*.+/i.test(String(source?.title || ""))) || null;
}

function battleCollateralTimings(value) {
  const timings = new Set();
  const segments = String(value || "")
    .toLowerCase()
    .split(/[.;\n•]+/)
    .map((segment) => segment.trim())
    .filter((segment) => /\bbattle\b/.test(segment) && /\bcollateral\b/.test(segment));

  for (const segment of segments) {
    if (/\b(?:when|after)\s+(?:the\s+)?battle\s+cards?\s+(?:are\s+)?clear(?:ed|ing)?\b/.test(segment)) {
      timings.add("battle-clear");
    }
    if (/\bafter\s+(?:the\s+)?purchase\b/.test(segment)) {
      timings.add("purchase");
    }
  }
  return timings;
}

export function hasNamedCardBattleCollateralTimingConflict(sources = []) {
  const sourceList = Array.isArray(sources) ? sources : [];
  const card = namedCardSource(sourceList);
  if (!card) return false;

  const cardName = String(card.title || "").replace(/^Card:\s*/i, "").trim().toLowerCase();
  if (!cardName) return false;

  const goldenRules = sourceList.some((source) => /^golden rules$/i.test(String(source?.title || "").trim()));
  if (!goldenRules) return false;

  const rulebookReference = sourceList.find((source) => {
    if (source === card) return false;
    if (/^card:/i.test(String(source?.title || ""))) return false;
    if (/^golden rules$/i.test(String(source?.title || "").trim())) return false;
    return sourceText(source).includes(cardName);
  });
  if (!rulebookReference) return false;

  const cardTimings = battleCollateralTimings(sourceText(card));
  const rulebookTimings = battleCollateralTimings(sourceText(rulebookReference));
  return (
    cardTimings.has("battle-clear") && rulebookTimings.has("purchase")
  ) || (
    cardTimings.has("purchase") && rulebookTimings.has("battle-clear")
  );
}

function transformedStateSubject(question) {
  const current = String(question || "").trim();
  const transformation = current.match(/\b(?:turn|turns|turned|become|becomes|became|transform|transforms|transformed)\b[\s\S]{0,80}?\b(?:into\s+)?(?:an?\s+|the\s+)?([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,3})\b/);
  if (!transformation) return "";
  const subject = normalizePhrase(transformation[1]);
  if (!subject || new Set(["overlay", "card", "territory", "asset", "gambit", "tactic"]).has(subject)) return "";
  return subject;
}

function sourceDirectlyDefinesSubject(source, subject) {
  const title = normalizePhrase(source?.title);
  const heading = normalizePhrase(source?.heading);
  if (title === subject || heading === subject || title.endsWith(` ${subject}`) || heading.endsWith(` ${subject}`)) {
    return true;
  }
  const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const text = sourceText(source);
  return new RegExp(`(?:^|[.\\n;:]\\s*)${escaped}\\s+(?:is|are|means|does|has|causes|counts as)\\b`, "i").test(text)
    || new RegExp(`\\b${escaped}\\s*:`, "i").test(text);
}

export function shouldForceUndefinedTransformationGap(question, sources = []) {
  const subject = transformedStateSubject(question);
  if (!subject) return false;
  const current = String(question || "").toLowerCase();
  if (!/\b(?:what|which|how)\b/.test(current) || !/\b(?:do|does|rules?|effect|after|mean|means|work|works)\b/.test(current)) {
    return false;
  }
  const sourceList = Array.isArray(sources) ? sources : [];
  const referenced = sourceList.some((source) => sourceText(source).includes(subject));
  if (!referenced) return false;
  return !sourceList.some((source) => sourceDirectlyDefinesSubject(source, subject));
}

export function normalizeR13RulingStatus(value, question, sources = []) {
  if (value === "out_of_scope") return value;

  if (shouldForceUndefinedTransformationGap(question, sources)) {
    return "provisional";
  }

  if (!["explicit", "inferred"].includes(value)) return value;

  if (hasNamedCardBattleCollateralTimingConflict(sources)) {
    return "inferred";
  }

  if (
    value === "inferred"
    && (
      shouldPromoteExpandedDirectOverview(question, sources)
      || shouldPromoteDirectPhaseLegality(question, sources)
      || shouldPromoteNamedDirectAuthority(question, sources)
    )
  ) {
    return "explicit";
  }

  return value;
}
