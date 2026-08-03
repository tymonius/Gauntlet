import { retrieveRules } from "./local-search.js";

const MECHANIC_PATTERNS = new Map([
  ["setup", /\b(setup|set up|starting|opening|begin the game|start the game)\b/i],
  ["draw", /\b(draw|draws|drawing|deck|draw pile)\b/i],
  ["hand", /\b(hand|hands|gambit)\b/i],
  ["reserve", /\b(reserve|tactic|battle hand)\b/i],
  ["action", /\b(action|action opportunity|play a card)\b/i],
  ["battle", /\b(battle|fight|combat|advantage|dice|roll)\b/i],
  ["timing", /\b(before|after|during|when|while|until|start of|end of|first time|once per turn|reveal|resolve|resolution)\b/i],
  ["movement", /\b(move|movement|advance|withdraw|withdrawal|retreat|rout|onward|displace)\b/i],
  ["territory", /\b(territory|capture|occupy|occupies|control|gauntlet)\b/i],
  ["zones", /\b(discard pile|graveyard|asset bank|bank|overlay|hand|reserve|draw pile|deck)\b/i],
  ["asset", /\b(asset|banked|overlay)\b/i],
  ["cost", /\b(cost|pay|spend|value|resource|intel|treasury)\b/i],
  ["copy", /\b(copy|copied|repeat|again|reapply|replacement|replace)\b/i],
  ["interrupt", /\b(interrupt|interruption|prevent|cancel|negate|respond)\b/i],
  ["victory", /\b(win|wins|victory|alternate victory|last stand|peace treaty|ritual of ascendance)\b/i],
  ["proposal", /\b(proposal|treaty|peace treaty|article)\b/i],
  ["rite", /\b(rite|ritual|bound|ascendance)\b/i]
]);

const ROLE_PATTERNS = new Map([
  ["attacker", /\b(attacker|attacking player)\b/i],
  ["defender", /\b(defender|defending player)\b/i],
  ["active player", /\b(active player|whose turn|turn player)\b/i],
  ["controller", /\b(controller|control this|you control)\b/i],
  ["owner", /\b(owner|own this|you own)\b/i],
  ["winner", /\b(winner|winning player|after you win)\b/i],
  ["loser", /\b(loser|losing player|after you lose)\b/i],
  ["occupier", /\b(occupier|occupying player|occupies)\b/i]
]);

const ZONE_PATTERNS = new Map([
  ["Hand", /\bhand\b/i],
  ["Reserve", /\breserve\b|\bbattle hand\b/i],
  ["Discard Pile", /\bdiscard(?: pile)?\b/i],
  ["Graveyard", /\bgraveyard\b/i],
  ["Asset Bank", /\basset bank\b|\bbanked asset\b/i],
  ["Draw Pile", /\bdraw pile\b|\bdeck\b/i],
  ["Battlefield", /\bbattlefield\b|\bin battle\b/i]
]);

const TIMING_PATTERNS = [
  /\bbefore\b[^.?!]*/ig,
  /\bafter\b[^.?!]*/ig,
  /\bduring\b[^.?!]*/ig,
  /\bat the start of\b[^.?!]*/ig,
  /\bat the end of\b[^.?!]*/ig,
  /\bwhen\b[^.?!]*/ig,
  /\bwhile\b[^.?!]*/ig,
  /\bonce per turn\b/ig,
  /\bfirst time\b[^.?!]*/ig
];

const FOUNDATIONAL_QUERIES = {
  setup: "complete game setup opening Hand draw three cards first player",
  action: "Action Opportunity play resolve Action card destination Discard Pile Asset Overlay",
  battle: "complete battle procedure attacker defender Gambit Reserve Tactic reveal resolve advantage dice Aftermath",
  timing: "timing priority reveal resolution before after start of turn end of turn",
  movement: "movement advance withdraw retreat Rout Onward additional movement",
  territory: "Territory occupation control Capture timing Gauntlet",
  zones: "card zones Hand Reserve Discard Pile Graveyard Asset Bank ownership control destination",
  asset: "Assets Asset Bank Overlay limits banked cards",
  copy: "copied effects repeat replacement additional resolution no reopening timing",
  interrupt: "interrupt interruption prevent cancel response timing",
  victory: "victory conditions Last Stand alternate victory Peace Treaty Ritual of Ascendance",
  proposal: "Diplomats Proposals Treaty Articles Peace Treaty timing",
  rite: "Mystics Rite Ritual Ritual of Ascendance bound cards interruption"
};

const GENERIC_ENTITY_NAMES = new Set([
  "action", "battle", "setup", "movement", "victory", "territory", "assets",
  "complete rules", "how it works", "release summary", "gauntlet"
]);

export function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripKindPrefix(value) {
  return String(value || "").replace(/^[^:]{1,40}:\s*/, "").trim();
}

function uniqueStrings(values, limit = 50) {
  const result = [];
  const seen = new Set();
  for (const value of values || []) {
    const trimmed = String(value || "").trim();
    const key = normalizeForSearch(trimmed);
    if (!trimmed || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

function matchesFromMap(text, map) {
  const results = [];
  for (const [name, pattern] of map) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) results.push(name);
  }
  return results;
}

function timingPhrases(text) {
  return uniqueStrings(TIMING_PATTERNS.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return [...String(text || "").matchAll(pattern)].map((match) => match[0].trim());
  }), 8);
}

export function extractNamedEntities(corpus, question) {
  const normalizedQuestion = ` ${normalizeForSearch(question)} `;
  if (!normalizedQuestion.trim()) return [];
  const candidates = [];

  for (const document of corpus?.documents || []) {
    const rawName = stripKindPrefix(document.heading || document.title || "");
    const normalizedName = normalizeForSearch(rawName);
    if (normalizedName.length < 4 || GENERIC_ENTITY_NAMES.has(normalizedName)) continue;
    const words = normalizedName.split(" ");
    if (words.length === 1 && normalizedName.length < 7) continue;
    if (normalizedQuestion.includes(` ${normalizedName} `)) {
      candidates.push({
        name: rawName,
        normalizedName,
        kind: document.kind || "canonical",
        documentId: document.id || null,
        sourcePath: document.sourcePath || ""
      });
    }
  }

  return candidates
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length || a.name.localeCompare(b.name))
    .filter((candidate, index, all) => !all.some((other, otherIndex) =>
      otherIndex < index && other.normalizedName.includes(candidate.normalizedName)
    ))
    .slice(0, 8);
}

export function analyzeQuestionLocally(corpus, question, history = [], gameState = null) {
  const text = String(question || "").trim();
  const historyText = (history || []).slice(-6).map((item) => item?.content || "").join(" ");
  const entities = extractNamedEntities(corpus, `${historyText} ${text}`);
  const mechanics = matchesFromMap(text, MECHANIC_PATTERNS);
  const roles = matchesFromMap(text, ROLE_PATTERNS);
  const zones = matchesFromMap(text, ZONE_PATTERNS);
  const timing = timingPhrases(text);
  const contextDependent = text.length < 44 || /\b(it|its|this|that|these|those|they|them|he|she|do so|again|work|benefit)\b/i.test(text);
  const interactionSignals = /\b(if|when|while|before|after|instead|also|both|another|again|interrupt|copy|replace|prevent)\b/i.test(text);
  const questionType = entities.length >= 2 || interactionSignals
    ? "interaction"
    : /\bhow many|where does|what is|what does|who is\b/i.test(text)
      ? "lookup"
      : /\bhow do|how does|what happens|sequence|order\b/i.test(text)
        ? "procedure"
        : "ruling";

  let complexity = "low";
  if (
    entities.length >= 2 ||
    questionType === "interaction" && (timing.length || mechanics.includes("copy") || mechanics.includes("interrupt")) ||
    mechanics.includes("victory") ||
    mechanics.filter((name) => ["timing", "zones", "movement", "copy", "interrupt", "victory"].includes(name)).length >= 2
  ) {
    complexity = "high";
  } else if (entities.length || timing.length || mechanics.length >= 2 || contextDependent) {
    complexity = "medium";
  }

  const assumptions = [];
  if (contextDependent && !history.length) {
    assumptions.push("No earlier conversation was supplied; resolve ambiguous pronouns from the wording and state any necessary assumption.");
  }
  if (!roles.length && mechanics.some((name) => ["battle", "movement", "territory"].includes(name))) {
    assumptions.push("Identify the relevant attacker, defender, active player, controller, owner, winner, loser, or occupier from the rules before ruling.");
  }
  if (gameState && typeof gameState === "object") {
    assumptions.push("Use the supplied structured game state only where it directly resolves a role, timing, zone, or active-effect question.");
  }

  const retrievalQueries = [
    text,
    ...entities.map((entity) => entity.name),
    entities.length ? `${entities.map((entity) => entity.name).join(" ")} interaction timing` : "",
    mechanics.length ? `${entities.map((entity) => entity.name).join(" ")} ${mechanics.join(" ")} complete rules` : "",
    ...mechanics.map((mechanic) => FOUNDATIONAL_QUERIES[mechanic]).filter(Boolean)
  ];

  return {
    entities,
    mechanics,
    roles,
    zones,
    timing,
    questionType,
    complexity,
    contextDependent,
    assumptions,
    retrievalQueries: uniqueStrings(retrievalQueries, 18)
  };
}

export function mergeSemanticPlan(localPlan, semanticPlan) {
  if (!semanticPlan || typeof semanticPlan !== "object") return localPlan;
  const semanticEntities = Array.isArray(semanticPlan.entities)
    ? semanticPlan.entities.map((name) => ({ name: String(name), normalizedName: normalizeForSearch(name), kind: "semantic" }))
    : [];
  const mergedEntities = [];
  const seenEntities = new Set();
  for (const entity of [...(localPlan.entities || []), ...semanticEntities]) {
    const key = normalizeForSearch(entity.name);
    if (!key || seenEntities.has(key)) continue;
    seenEntities.add(key);
    mergedEntities.push(entity);
  }
  const complexityOrder = { low: 0, medium: 1, high: 2 };
  const semanticComplexity = ["low", "medium", "high"].includes(semanticPlan.complexity)
    ? semanticPlan.complexity
    : localPlan.complexity;
  return {
    ...localPlan,
    entities: mergedEntities.slice(0, 10),
    mechanics: uniqueStrings([...(localPlan.mechanics || []), ...(semanticPlan.mechanics || [])], 20),
    roles: uniqueStrings([...(localPlan.roles || []), ...(semanticPlan.roles || [])], 12),
    zones: uniqueStrings([...(localPlan.zones || []), ...(semanticPlan.zones || [])], 12),
    timing: uniqueStrings([...(localPlan.timing || []), ...(semanticPlan.timing || [])], 12),
    assumptions: uniqueStrings([...(localPlan.assumptions || []), ...(semanticPlan.assumptions || [])], 12),
    retrievalQueries: uniqueStrings([...(localPlan.retrievalQueries || []), ...(semanticPlan.retrieval_queries || [])], 24),
    questionType: String(semanticPlan.question_type || localPlan.questionType),
    complexity: complexityOrder[semanticComplexity] > complexityOrder[localPlan.complexity]
      ? semanticComplexity
      : localPlan.complexity
  };
}

function documentKey(document) {
  return `${document.sourcePath || ""}\u0000${document.title || ""}\u0000${document.body || ""}`;
}

function sourceResultFromDocument(document, score, excerptLength = 1400) {
  const body = String(document.body || "");
  return {
    id: "",
    score,
    title: document.title,
    heading: document.heading,
    kind: document.kind,
    sourcePath: document.sourcePath,
    sourceUrl: document.sourceUrl,
    excerpt: body.length <= excerptLength ? body : `${body.slice(0, excerptLength - 1).trimEnd()}…`,
    body
  };
}

function entityCoverageBonus(result, plan) {
  const haystack = normalizeForSearch(`${result.title || ""} ${result.heading || ""} ${result.body || ""}`);
  let bonus = 0;
  for (const entity of plan.entities || []) {
    const name = normalizeForSearch(entity.name);
    if (!name) continue;
    if (normalizeForSearch(result.heading || result.title).includes(name)) bonus += 70;
    else if (haystack.includes(name)) bonus += 24;
  }
  return bonus;
}

function mechanicCoverageBonus(result, plan) {
  const haystack = normalizeForSearch(`${result.title || ""} ${result.body || ""}`);
  let matched = 0;
  for (const mechanic of plan.mechanics || []) {
    if (haystack.includes(normalizeForSearch(mechanic))) matched += 1;
  }
  return Math.min(matched, 6) * 7;
}

function addCandidate(map, result, score, reason) {
  const key = documentKey(result);
  const current = map.get(key);
  if (!current || score > current.rankScore) {
    map.set(key, { ...result, rankScore: score, retrievalReason: reason });
  }
}

export function retrieveIntelligentRules(corpus, question, history = [], plan, options = {}) {
  const limit = Math.max(6, Math.min(Number(options.limit) || 12, 18));
  const excerptLength = Math.max(500, Math.min(Number(options.excerptLength) || 1400, 2400));
  const candidates = new Map();
  const queries = uniqueStrings([
    ...(options.baseQueries || []),
    ...(plan?.retrievalQueries || []),
    ...(options.additionalQueries || [])
  ], 18);

  queries.forEach((query, queryIndex) => {
    const results = retrieveRules(corpus, query, { limit: 8, excerptLength });
    for (const result of results) {
      const score = Number(result.score || 0)
        + Math.max(0, 22 - queryIndex)
        + entityCoverageBonus(result, plan || {})
        + mechanicCoverageBonus(result, plan || {});
      addCandidate(candidates, result, score, queryIndex === 0 ? "direct" : "expanded-query");
    }
  });

  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  for (const entity of plan?.entities || []) {
    const normalizedEntity = normalizeForSearch(entity.name);
    if (!normalizedEntity) continue;
    for (const document of documents) {
      const heading = normalizeForSearch(stripKindPrefix(document.heading || document.title));
      if (heading !== normalizedEntity && !heading.includes(normalizedEntity)) continue;
      addCandidate(
        candidates,
        sourceResultFromDocument(document, 240 + normalizedEntity.length, excerptLength),
        240 + normalizedEntity.length,
        "named-entity"
      );
    }
  }

  const preliminary = [...candidates.values()].sort((a, b) => b.rankScore - a.rankScore);
  const topRulebookIndexes = [];
  for (const candidate of preliminary.slice(0, 8)) {
    const index = documents.findIndex((document) => documentKey(document) === documentKey(candidate));
    if (index >= 0 && documents[index]?.kind === "rulebook") topRulebookIndexes.push(index);
  }
  for (const index of topRulebookIndexes) {
    for (const neighborIndex of [index - 1, index + 1]) {
      const document = documents[neighborIndex];
      if (!document || document.kind !== "rulebook" || document.sourcePath !== documents[index].sourcePath) continue;
      addCandidate(candidates, sourceResultFromDocument(document, 48, excerptLength), 48, "adjacent-rulebook-section");
    }
  }

  const ranked = [...candidates.values()]
    .map((candidate) => {
      let rankScore = candidate.rankScore;
      if (plan?.questionType === "interaction" && candidate.kind === "rulebook") rankScore += 12;
      if (candidate.retrievalReason === "named-entity") rankScore += 30;
      if ((plan?.mechanics || []).includes("timing") && /timing|turn|battle|reveal|resolution/i.test(candidate.title || "")) rankScore += 16;
      return { ...candidate, rankScore };
    })
    .sort((a, b) => b.rankScore - a.rankScore || String(a.title).localeCompare(String(b.title)))
    .slice(0, limit)
    .map(({ rankScore, retrievalReason, ...result }, index) => ({
      ...result,
      id: `S${index + 1}`,
      retrievalReason,
      retrievalScore: Math.round(rankScore * 10) / 10
    }));

  return { sources: ranked, queries };
}

export function chooseReasoningEffort(plan, configured = "adaptive") {
  const normalized = String(configured || "adaptive").toLowerCase();
  if (["low", "medium", "high"].includes(normalized)) return normalized;
  if (plan?.complexity === "high") return "high";
  if (plan?.complexity === "medium") return "medium";
  return "low";
}

export function shouldUseSemanticPlanner(plan, env = {}) {
  if (String(env.RULES_SEMANTIC_PLANNER || "on").toLowerCase() === "off") return false;
  return plan?.complexity !== "low" || plan?.contextDependent || (plan?.entities || []).length > 0;
}

export function shouldVerifyAnswer(plan, rulingStatus, sourceCount, env = {}) {
  if (String(env.RULES_VERIFIER || "on").toLowerCase() === "off") return false;
  if (plan?.complexity === "high") return true;
  if (["inferred", "provisional"].includes(rulingStatus)) return true;
  return sourceCount < 1;
}

export function sanitizeGameState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = {};
  const textFields = [
    "phase", "turnStage", "activePlayer", "attacker", "defender", "territory",
    "currentBattle", "notes", "rulesVersion"
  ];
  for (const field of textFields) {
    const text = String(value[field] || "").trim().slice(0, 500);
    if (text) result[field] = text;
  }
  const arrayFields = ["players", "activeCards", "assets", "overlays", "rites", "proposals", "missions", "priorRulings"];
  for (const field of arrayFields) {
    if (!Array.isArray(value[field])) continue;
    const items = value[field].slice(0, 20).map((item) => {
      if (item && typeof item === "object") {
        return Object.fromEntries(Object.entries(item).slice(0, 12).map(([key, entry]) => [
          String(key).slice(0, 80),
          String(entry == null ? "" : entry).slice(0, 300)
        ]));
      }
      return String(item || "").slice(0, 300);
    });
    if (items.length) result[field] = items;
  }
  return Object.keys(result).length ? result : null;
}

export async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildCorpusReviewSnapshot(corpus) {
  const sourceDocuments = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const documents = sourceDocuments.map((document) => ({
    id: String(document.id || ""),
    kind: String(document.kind || ""),
    title: String(document.title || ""),
    heading: String(document.heading || ""),
    sourcePath: String(document.sourcePath || ""),
    sourceUrl: String(document.sourceUrl || ""),
    bodyLength: String(document.body || "").length
  }));
  const corpusHash = await sha256Text(sourceDocuments.map((document) =>
    `${document.id || ""}\n${document.body || ""}`
  ).join("\n---\n"));
  return {
    version: String(corpus?.version || ""),
    generatedAt: new Date().toISOString(),
    corpusHash,
    documents
  };
}
