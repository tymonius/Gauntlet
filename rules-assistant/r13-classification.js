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
    const separators = String(value || "").split(/\s+[—–]\s+|\s+›\s+|:\s+/);
    const tail = normalizePhrase(separators.at(-1));
    if (tail) subjects.add(tail);
  }
  return [...subjects].filter((subject) => subject.length >= 4);
}

export function shouldPromoteNamedDirectAuthority(question, sources = []) {
  const rawQuestion = String(question || "").trim();
  const current = ` ${normalizePhrase(rawQuestion)} `;
  if (!current.trim()) return false;
  const conditionalQuestion = rawQuestion.replace(/\bif able\b/gi, "");
  if (/\b(?:if|unless|except|versus|vs\.?|interact|interaction|override|same as|different from)\b/i.test(conditionalQuestion)) {
    return false;
  }

  const generic = new Set([
    "battle", "complete rules", "rules", "timing", "movement", "action", "territory",
    "gambit", "tactic", "aftermath", "opening", "denouement"
  ]);
  const matchingSources = (Array.isArray(sources) ? sources : []).filter((source) =>
    namedAuthoritySubjects(source).some((subject) =>
      !generic.has(subject) && current.includes(` ${subject} `)
    )
  );

  return matchingSources.length === 1;
}

function sourceListText(sources = []) {
  return (Array.isArray(sources) ? sources : []).map(sourceText);
}

export function shouldPromoteDirectEnumeratedProcedure(question, sources = []) {
  const current = String(question || "").toLowerCase();
  const texts = sourceListText(sources);

  const onsetWithdrawalQuestion = /\bwithdraw\w*\b/.test(current)
    && /\bonset\b/.test(current)
    && /\b(?:aftermath|gambits?|battle\s+cards?)\b/.test(current);
  if (
    onsetWithdrawalQuestion
    && texts.some((text) =>
      /withdraw\w*\s+during\s+onset/.test(text)
      && /no\s+aftermath|without\s+an?\s+aftermath/.test(text)
    )
  ) {
    return true;
  }

  const refusedNoWinnerQuestion = /\brefus\w*\b/.test(current)
    && /\b(?:withdraw\w*|no\s+winner)\b/.test(current)
    && /\b(?:stake|proposal|deal)\b/.test(current);
  if (
    refusedNoWinnerQuestion
    && texts.some((text) =>
      /(?:no\s+winner|ends?\s+without\s+a\s+winner)/.test(text)
      && /return(?:s|ed|ing)?\s+the\s+stake/.test(text)
    )
  ) {
    return true;
  }

  const asksBattleCardDestination = /\b(?:gambits?|tactics?|battle\s+cards?|cards?)\b/.test(current)
    && /\b(?:where|destination|go|clear\w*)\b/.test(current);
  const noWinnerContext = /\b(?:no\s+winner|withdraw\w*)\b/.test(current);
  if (asksBattleCardDestination) {
    const hasDirectDestinations = texts.some((text) =>
      /\bgambit\b[\s\S]{0,100}\bgo(?:es)?\s+to\s+its?\s+owner(?:['’]s|s['’]?)?\s+graveyard\b/.test(text)
      && /\btactic\b[\s\S]{0,100}\bgo(?:es)?\s+to\s+its?\s+owner(?:['’]s|s['’]?)?\s+discard\s+pile\b/.test(text)
    );
    const hasApplicableNoWinnerRule = !noWinnerContext || texts.some((text) =>
      /(?:after\s+onset|proceeded\s+to\s+gambits?)/.test(text)
      && /clear\s+(?:the\s+)?(?:committed\s+)?(?:battle\s+)?cards?.*normally/.test(text)
    );
    if (hasDirectDestinations && hasApplicableNoWinnerRule) return true;
  }

  const defensiveEdgeTieQuestion = /\b(?:tie|tied|ties)\b/.test(current)
    && /\bdefend\w*\b/.test(current);
  if (
    defensiveEdgeTieQuestion
    && texts.some((text) =>
      /defensive\s+edge/.test(text)
      && /defender[\s\S]{0,80}\bwins?\s+tied\s+battle\s+totals?/.test(text)
    )
  ) {
    return true;
  }


  const noWinnerWinTriggerQuestion = /\b(?:no\s+winner|without\s+a\s+winner|withdraw\w*)\b/.test(current)
    && /\b(?:win|wins|winning|victory|trigger|effect)\b/.test(current);
  if (
    noWinnerWinTriggerQuestion
    && texts.some((text) =>
      /effect\s+conditioned\s+on\s+a\s+player\s+winning\s+or\s+losing\s+does\s+not\s+apply\s+when\s+the\s+battle\s+sequence\s+ends\s+without\s+a\s+winner/.test(text)
    )
  ) {
    return true;
  }

  const commandAtMaximumQuestion = /\bcommand\b/.test(current)
    && /\bfirst\b/.test(current)
    && /\b(?:later|another|second)\b/.test(current)
    && /\bwin\w*\b/.test(current);
  if (
    commandAtMaximumQuestion
    && texts.some((text) =>
      /winning\s+while\s+already\s+at\s+2\s+command\s+still\s+counts\s+as\s+the\s+first\s+military\s+victory\s+of\s+that\s+turn/.test(text)
    )
  ) {
    return true;
  }

  const withdrawalCommandQuestion = /\bcommand\b/.test(current)
    && /\bwithdraw\w*\b/.test(current);
  if (
    withdrawalCommandQuestion
    && texts.some((text) =>
      /withdrawal\s+has\s+no\s+winner[\s\S]{0,100}generates?\s+no\s+command/.test(text)
    )
  ) {
    return true;
  }

  const acceptedTermsAftermathQuestion = /\b(?:accept(?:ed|s|ing)?|agree(?:d|s|ing)?)\b/.test(current)
    && /\b(?:terms?|deal)\b/.test(current)
    && /\baftermath\b/.test(current);
  if (
    acceptedTermsAftermathQuestion
    && texts.some((text) =>
      (
        /accepted\s+terms[\s\S]{0,500}(?:no\s+aftermath|aftermath\s+does\s+not\s+occur)/.test(text)
        || /accepted\s+terms\s+end\s+the\s+(?:battle\s+)?sequence\s+during\s+onset/.test(text)
        || /no\s+battle\s+is\s+fought[\s\S]{0,160}no\s+aftermath/.test(text)
      )
    )
  ) {
    return true;
  }


  const commandOpponentTurnQuestion = /\bcommand\b/.test(current)
    && /\bfirst\b/.test(current)
    && /\b(?:win|won|winning|victory|battle|fight)\b/.test(current)
    && /\b(?:opponent(?:['’]s)? turn|their turn|defend(?:ing|ed)?)\b/.test(current);
  if (
    commandOpponentTurnQuestion
    && texts.some((text) =>
      /first\s+time\s+each\s+turn[\s\S]{0,100}wins?\s+a\s+battle[\s\S]{0,100}gain\s+1\s+command/.test(text)
      && /(?:either\s+player(?:['’]s)?\s+turn|during\s+either\s+player(?:['’]s)?\s+turn)/.test(text)
    )
  ) {
    return true;
  }

  if (
    refusedNoWinnerQuestion
    && texts.some((text) =>
      /return(?:s|ed|ing)?\s+the\s+stake/.test(text)
      && /do\s+not\s+(?:impose|ratify)/.test(text)
    )
  ) {
    return true;
  }

  const militaryLateTacticQuestion = /\bmilitary\b/.test(current)
    && /\b(?:add|adds|added|additional)\b[\s\S]{0,40}\btactic\b/.test(current)
    && /\b(?:reopen|surveillance|interference|reveal)\b/.test(current);
  if (
    militaryLateTacticQuestion
    && texts.some((text) =>
      /does\s+not\s+reopen\s+normal\s+tactic\s+choice,?\s+surveillance,?\s+interference,?\s+or\s+reveal\s+windows/.test(text)
    )
  ) {
    return true;
  }

  const relentlessPursuitQuestion = /\b(?:relentless\s+pursuit|witch\s+hunter)\b/.test(current)
    && /\b(?:initiat(?:e|ed|es|ing)|attacker|attacking)\b/.test(current);
  if (
    relentlessPursuitQuestion
    && texts.some((text) =>
      /relentless\s+pursuit/.test(text)
      && /after\s+defeating\s+an\s+attacking\s+opponent/.test(text)
    )
  ) {
    return true;
  }

  const rallyDefenderQuestion = /\bdefender\b/.test(current)
    && /\b(?:next\s+battle|battle)\b/.test(current);
  if (
    rallyDefenderQuestion
    && texts.some((text) =>
      /\brally\b/.test(text)
      && /attacking/.test(text)
      && /battle\s+you\s+initiated/.test(text)
    )
  ) {
    return true;
  }

  return false;
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
  const explicitTarget = current.match(/\b(?:turn|turns|turned|become|becomes|became|transform|transforms|transformed)\b[\s\S]{0,80}?\binto\s+(?:an?\s+|the\s+)?([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,3})\b/);
  const directTarget = current.match(/\b(?:become|becomes|became)\s+(?:an?\s+|the\s+)?([A-Z][A-Za-z0-9'’-]*(?:\s+[A-Z][A-Za-z0-9'’-]*){0,3})\b/);
  const transformation = explicitTarget || directTarget;
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


function questionMatchedAuthoritySources(question, sources = []) {
  const current = ` ${normalizePhrase(question)} `;
  const generic = new Set([
    "battle", "complete rules", "rules", "timing", "movement", "action", "territory",
    "gambit", "tactic", "aftermath", "opening", "denouement", "card", "effect"
  ]);

  return (Array.isArray(sources) ? sources : []).filter((source) =>
    namedAuthoritySubjects(source).some((subject) =>
      subject.length >= 4
      && !generic.has(subject)
      && current.includes(` ${subject} `)
    )
  );
}

export function shouldDemoteCombinedAuthorityInteraction(question, sources = []) {
  const matched = questionMatchedAuthoritySources(question, sources);
  if (matched.length < 2) return false;

  const current = ` ${normalizePhrase(question)} `;
  const subjects = matched
    .map((source) => namedAuthoritySubjects(source)
      .filter((subject) => current.includes(` ${subject} `))
      .sort((a, b) => b.length - a.length)[0])
    .filter(Boolean);

  const uniqueSubjects = [...new Set(subjects)];
  if (uniqueSubjects.length < 2) return false;

  return !matched.some((source) => {
    const text = sourceText(source);
    return uniqueSubjects.every((subject) => text.includes(subject));
  });
}

export function shouldDemoteNamedMovementInteraction(question, sources = []) {
  if (
    !/\b(?:battle|onset|last stand)\b/i.test(question)
    || !/\b(?:move|moves|movement|enter|enters|entering|advance)\b/i.test(question)
  ) {
    return false;
  }

  const current = ` ${normalizePhrase(question)} `;
  const sourceList = Array.isArray(sources) ? sources : [];
  const card = sourceList.find((source) => {
    if (!/^card:\s*/i.test(String(source?.title || ""))) return false;
    return namedAuthoritySubjects(source).some((subject) => current.includes(` ${subject} `));
  });
  if (!card) return false;

  const cardText = sourceText(card);
  if (/\b(?:start|starts|initiate|initiates|initiated)\s+(?:a\s+)?battle\b/.test(cardText)) return false;
  if (!/\b(?:move|moves|movement|advance)\b/.test(cardText)) return false;

  return sourceList.some((source) => {
    if (source === card) return false;
    const text = sourceText(source);
    return (
      /effect[- ]granted\s+movement|when\s+an\s+effect\s+grants\s+movement/.test(text)
      && /may\s+initiate\s+a\s+battle|entering\s+the\s+opponent(?:['’]s)?\s+position[\s\S]{0,100}initiates\s+a\s+battle/.test(text)
    );
  });
}

export function shouldForceAbsentProcedureGap(question, sources = []) {
  const current = String(question || "").toLowerCase();
  if (!/\b(?:concede|concedes|conceded|concession|surrender|surrenders|surrendered|forfeit|forfeits|forfeited)\b/.test(current)) {
    return false;
  }
  if (!/\b(?:rule|rules|ruleset|procedure|define|defines|formal|award|awarding|win|winner)\b/.test(current)) {
    return false;
  }

  return !(Array.isArray(sources) ? sources : []).some((source) =>
    /\b(?:concede|concedes|conceded|concession|surrender|surrenders|surrendered|forfeit|forfeits|forfeited)\b/.test(sourceText(source))
  );
}

export function shouldPromoteDirectDeedOwnershipChange(question, sources = []) {
  const current = String(question || "").toLowerCase();
  if (
    !/\bdeeds?\b/.test(current)
    || !/\b(?:capture|captured|control|controls|controlled|transfer|ownership)\b/.test(current)
  ) {
    return false;
  }

  return (Array.isArray(sources) ? sources : []).some((source) => {
    const text = sourceText(source);
    return (
      /deed\s+ownership\s+is\s+independent\s+of\s+token\s+position\s+and\s+territory\s+control/.test(text)
      && /changing\s+territory\s+control\s+does\s+not\s+transfer\s+its\s+deed/.test(text)
    );
  });
}

export function normalizeR13RulingStatus(value, question, sources = []) {
  if (value === "out_of_scope") return value;

  if (
    shouldForceUndefinedTransformationGap(question, sources)
    || shouldForceAbsentProcedureGap(question, sources)
  ) {
    return "provisional";
  }

  if (value === "provisional" && shouldPromoteDirectDeedOwnershipChange(question, sources)) {
    return "explicit";
  }

  if (!["explicit", "inferred"].includes(value)) return value;

  if (
    hasNamedCardBattleCollateralTimingConflict(sources)
    || (value === "explicit" && shouldDemoteCombinedAuthorityInteraction(question, sources))
    || (value === "explicit" && shouldDemoteNamedMovementInteraction(question, sources))
  ) {
    return "inferred";
  }

  if (
    value === "inferred"
    && (
      shouldPromoteExpandedDirectOverview(question, sources)
      || shouldPromoteDirectPhaseLegality(question, sources)
      || shouldPromoteNamedDirectAuthority(question, sources)
      || shouldPromoteDirectEnumeratedProcedure(question, sources)
      || shouldPromoteDirectDeedOwnershipChange(question, sources)
    )
  ) {
    return "explicit";
  }

  return value;
}