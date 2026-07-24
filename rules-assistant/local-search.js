const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "card", "cards",
  "do", "does", "for", "from", "how", "i", "if", "in", "is", "it", "may",
  "my", "of", "on", "or", "player", "players", "rule", "rules", "the", "their",
  "this", "to", "use", "what", "when", "where", "which", "who", "with", "you"
]);

const QUERY_ALIASES = {
  move: ["movement", "advance", "withdraw"],
  movement: ["move", "advance", "withdraw"],
  retreat: ["forced displacement", "losing player"],
  battle: ["combat", "fight"],
  fight: ["battle"],
  hand: ["normal hand", "battle hand"],
  deck: ["draw pile", "playable deck"],
  discard: ["discard pile"],
  graveyard: ["graveyard"],
  capture: ["occupies", "control", "territory"],
  onward: ["additional movement", "order"],
  rout: ["after you win", "additional battle", "order"],
  action: ["action opportunity", "action effect"],
  asset: ["asset bank", "banked asset"],
  win: ["victory", "last stand", "run the gauntlet"]
};

const CANONICAL_DATA_PATH = "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json";
const RULEBOOK_PATH = "releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md";
const RULEBOOK_PDF_PATH = "releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.pdf";

export function defaultSourceUrls(siteOrigin = "https://gauntlet.run") {
  const origin = siteOrigin.replace(/\/$/, "");
  return {
    siteOrigin: origin,
    canonicalDataUrl: `${origin}/${CANONICAL_DATA_PATH}`,
    rulebookUrl: `${origin}/${RULEBOOK_PATH}`,
    rulebookPdfUrl: `${origin}/${RULEBOOK_PDF_PATH}`
  };
}

export async function loadRulesCorpus(options = {}) {
  const urls = {
    ...defaultSourceUrls(options.siteOrigin),
    ...options
  };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to load the rules corpus.");
  }

  const [canonicalResponse, rulebookResponse] = await Promise.all([
    fetchImpl(urls.canonicalDataUrl, { cache: "no-store" }),
    fetchImpl(urls.rulebookUrl, { cache: "no-store" })
  ]);

  if (!canonicalResponse.ok) {
    throw new Error(`Could not load canonical data (${canonicalResponse.status}).`);
  }
  if (!rulebookResponse.ok) {
    throw new Error(`Could not load the rulebook (${rulebookResponse.status}).`);
  }

  const [canonicalData, rulebookMarkdown] = await Promise.all([
    canonicalResponse.json(),
    rulebookResponse.text()
  ]);

  return buildRulesCorpus({
    canonicalData,
    rulebookMarkdown,
    siteOrigin: urls.siteOrigin,
    canonicalDataUrl: urls.canonicalDataUrl,
    rulebookUrl: urls.rulebookUrl,
    rulebookPdfUrl: urls.rulebookPdfUrl
  });
}

export function buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin = "https://gauntlet.run",
  canonicalDataUrl,
  rulebookUrl,
  rulebookPdfUrl
}) {
  const urls = {
    ...defaultSourceUrls(siteOrigin),
    canonicalDataUrl,
    rulebookUrl,
    rulebookPdfUrl
  };

  const documents = [
    ...parseRulebookSections(rulebookMarkdown, urls.rulebookPdfUrl || urls.rulebookUrl),
    ...buildCanonicalDocuments(canonicalData, urls.siteOrigin, urls.canonicalDataUrl)
  ];

  return {
    version: canonicalData?.version || "v0.6.0",
    generatedAt: new Date().toISOString(),
    documents: deduplicateDocuments(documents)
  };
}

export function parseRulebookSections(markdown, sourceUrl) {
  if (typeof markdown !== "string") return [];

  const sections = [];
  const lines = markdown.split(/\r?\n/);
  const headingStack = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (!body) return;
    const hierarchy = [...headingStack.slice(0, current.level - 1), current.heading]
      .filter(Boolean)
      .join(" › ");
    sections.push({
      id: `rulebook:${slugify(hierarchy || current.heading)}`,
      kind: "rulebook",
      title: hierarchy || current.heading,
      heading: current.heading,
      body: cleanMarkdown(body),
      sourcePath: RULEBOOK_PATH,
      sourceUrl,
      searchText: ""
    });
  };

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      const level = match[1].length;
      const heading = stripMarkdown(match[2]);
      headingStack.length = level - 1;
      headingStack[level - 1] = heading;
      current = { level, heading, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();

  return sections.map(finalizeDocument);
}

export function buildCanonicalDocuments(canonicalData, siteOrigin = "https://gauntlet.run", canonicalDataUrl) {
  if (!canonicalData || typeof canonicalData !== "object") return [];
  const origin = siteOrigin.replace(/\/$/, "");
  const fallbackUrl = canonicalDataUrl || `${origin}/${CANONICAL_DATA_PATH}`;
  const documents = [];
  const visited = new WeakSet();

  const addNamedObject = (value, path, inheritedSource) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const title = typeof value.name === "string"
      ? value.name
      : typeof value.title === "string"
        ? value.title
        : null;
    if (!title || !hasSubstantiveRuleText(value)) return;

    const sourcePath = typeof value.source === "string" ? value.source : inheritedSource;
    const sourceUrl = sourcePath ? `${origin}/${encodeSourcePath(sourcePath)}` : fallbackUrl;
    const kind = inferKind(path, value);
    const body = objectToRuleText(value);
    if (!body) return;

    documents.push(finalizeDocument({
      id: `${kind}:${value.id || slugify(title)}`,
      kind,
      title: `${kindLabel(kind)}: ${title}`,
      heading: title,
      body,
      sourcePath: sourcePath || CANONICAL_DATA_PATH,
      sourceUrl,
      searchText: ""
    }));
  };

  const walk = (value, path = [], inheritedSource = null) => {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)], inheritedSource));
      return;
    }

    const source = typeof value.source === "string" ? value.source : inheritedSource;
    addNamedObject(value, path, source);

    for (const [key, child] of Object.entries(value)) {
      if (key === "effects") continue;
      if (child && typeof child === "object") {
        walk(child, [...path, key], source);
      }
    }
  };

  walk(canonicalData, []);

  const summaryText = [
    canonicalData.name && `Release: ${canonicalData.name}`,
    canonicalData.status && `Status: ${canonicalData.status}`,
    canonicalData.deck_construction && `Deck construction: ${objectToRuleText(canonicalData.deck_construction)}`,
    canonicalData.battlefield && `Battlefield: ${objectToRuleText(canonicalData.battlefield)}`,
    canonicalData.battle && `Battle: ${objectToRuleText(canonicalData.battle)}`
  ].filter(Boolean).join("\n");

  if (summaryText) {
    documents.unshift(finalizeDocument({
      id: "canonical:release-summary",
      kind: "canonical",
      title: `Canonical ${canonicalData.version || "v0.6.0"} release summary`,
      heading: "Release summary",
      body: summaryText,
      sourcePath: CANONICAL_DATA_PATH,
      sourceUrl: fallbackUrl,
      searchText: ""
    }));
  }

  return documents;
}

export function retrieveRules(corpus, query, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 6, 12));
  const documents = Array.isArray(corpus?.documents) ? corpus.documents : [];
  const normalizedQuery = normalizeText(query);
  const queryTokens = expandQueryTokens(tokenize(query));
  const queryPhrases = buildPhrases(queryTokens);

  return documents
    .map((document) => ({
      document,
      score: scoreDocument(document, normalizedQuery, queryTokens, queryPhrases)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
    .slice(0, limit)
    .map(({ document, score }, index) => ({
      id: `S${index + 1}`,
      score,
      title: document.title,
      heading: document.heading,
      kind: document.kind,
      sourcePath: document.sourcePath,
      sourceUrl: document.sourceUrl,
      excerpt: makeExcerpt(document.body, queryTokens, options.excerptLength || 900),
      body: document.body
    }));
}

export function buildLocalFallbackAnswer(query, results, version = "v0.6.0") {
  if (!results.length) {
    return {
      answer: `I could not find a close match in the ${version} canonical sources. The current rules may not specify this clearly.`,
      rulingStatus: "unresolved",
      confidence: "low",
      sources: []
    };
  }

  const lead = results[0];
  const supporting = results.slice(1, 3);
  const lines = [
    `The AI rules service is unavailable, so this is a direct source lookup rather than an interpreted ruling.`,
    `Closest canonical passage — ${lead.title}:`,
    lead.excerpt
  ];

  if (supporting.length) {
    lines.push("Related passages:");
    for (const item of supporting) {
      lines.push(`${item.title}: ${item.excerpt}`);
    }
  }

  return {
    answer: lines.join("\n\n"),
    rulingStatus: "source_lookup",
    confidence: "source-only",
    sources: results.slice(0, 3)
  };
}

function scoreDocument(document, normalizedQuery, queryTokens, queryPhrases) {
  const title = normalizeText(document.title);
  const heading = normalizeText(document.heading || "");
  const body = normalizeText(document.body);
  const searchText = document.searchText || `${title} ${heading} ${body}`;
  let score = 0;

  if (normalizedQuery && title.includes(normalizedQuery)) score += 120;
  if (normalizedQuery && heading.includes(normalizedQuery)) score += 100;

  const rawTitle = stripKindPrefix(title);
  if (rawTitle.length > 2 && normalizedQuery.includes(rawTitle)) score += 95;

  for (const token of queryTokens) {
    if (title.includes(token)) score += 18;
    if (heading.includes(token)) score += 14;
    const bodyMatches = countOccurrences(body, token);
    score += Math.min(bodyMatches, 8) * 2.5;
  }

  for (const phrase of queryPhrases) {
    if (phrase.length < 4) continue;
    if (title.includes(phrase)) score += 28;
    if (body.includes(phrase)) score += 10;
  }

  const matchedTokens = queryTokens.filter((token) => searchText.includes(token)).length;
  if (queryTokens.length && matchedTokens === queryTokens.length) score += 20;
  if (document.kind === "rulebook") score += 2;
  return score;
}

function finalizeDocument(document) {
  const searchText = normalizeText(`${document.title} ${document.heading || ""} ${document.body}`);
  return { ...document, searchText };
}

function hasSubstantiveRuleText(value) {
  const keys = [
    "text", "action", "battle", "mission", "ability", "effect", "effects",
    "description", "victory", "resource", "requirement", "accepted", "refused",
    "cost", "timing", "rules", "rule"
  ];
  return keys.some((key) => value[key] != null && value[key] !== "");
}

function objectToRuleText(value) {
  const lines = [];
  const preferredOrder = [
    "allegiance", "cost", "complexity", "trait", "card_form", "resource", "victory",
    "ability", "description", "text", "requirement", "accepted", "refused", "timing",
    "action", "battle", "mission", "reminder", "unique_rule"
  ];
  const consumed = new Set(["id", "name", "title", "source", "image", "number"]);

  for (const key of preferredOrder) {
    if (!(key in value)) continue;
    consumed.add(key);
    appendValue(lines, humanizeKey(key), value[key]);
  }

  if (Array.isArray(value.effects)) {
    consumed.add("effects");
    for (const effect of value.effects) {
      if (!effect || typeof effect !== "object") continue;
      appendValue(lines, effect.label || "Effect", effect.text);
    }
  }

  if (Array.isArray(value.leaders)) {
    consumed.add("leaders");
    const names = value.leaders.map((leader) => leader?.name).filter(Boolean);
    if (names.length) lines.push(`Leaders: ${names.join(", ")}`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (consumed.has(key)) continue;
    if (child == null || child === "") continue;
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      appendValue(lines, humanizeKey(key), child);
    }
  }

  return [...new Set(lines)].join("\n");
}

function appendValue(lines, label, value) {
  if (value == null || value === "") return;
  if (Array.isArray(value)) {
    const primitives = value.filter((item) => ["string", "number", "boolean"].includes(typeof item));
    if (primitives.length) lines.push(`${label}: ${primitives.join(", ")}`);
    return;
  }
  if (typeof value === "object") {
    const nested = Object.entries(value)
      .filter(([, nestedValue]) => nestedValue != null && ["string", "number", "boolean"].includes(typeof nestedValue))
      .map(([key, nestedValue]) => `${humanizeKey(key)} ${nestedValue}`)
      .join("; ");
    if (nested) lines.push(`${label}: ${nested}`);
    return;
  }
  lines.push(`${label}: ${value}`);
}

function inferKind(path, value) {
  const joined = path.join("/").toLowerCase();
  if (joined.includes("territor")) return value.arena ? "arena" : "territory";
  if (joined.includes("faction")) return "faction";
  if (joined.includes("leader")) return "leader";
  if (joined.includes("proposal")) return "proposal";
  if (joined.includes("mission")) return "mission";
  if (joined.includes("rite")) return "rite";
  if (joined.includes("deed")) return "deed";
  if (joined.includes("order")) return "order";
  if (joined.includes("card")) return "card";
  if (value.action != null || value.battle != null || value.effects != null) return "card";
  return "component";
}

function kindLabel(kind) {
  return {
    arena: "Arena",
    canonical: "Canonical source",
    card: "Card",
    component: "Component",
    deed: "Deed",
    faction: "Faction",
    leader: "Leader",
    mission: "Mission",
    order: "Order",
    proposal: "Proposal",
    rite: "Rite",
    territory: "Territory"
  }[kind] || "Rule component";
}

function deduplicateDocuments(documents) {
  const seen = new Set();
  return documents.filter((document) => {
    const key = `${document.id}\u0000${document.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function expandQueryTokens(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const aliases = QUERY_ALIASES[token] || [];
    for (const alias of aliases) {
      tokenize(alias).forEach((part) => expanded.add(part));
    }
  }
  return [...expanded];
}

function buildPhrases(tokens) {
  const phrases = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    phrases.push(`${tokens[index]} ${tokens[index + 1]}`);
  }
  return phrases;
}

function tokenize(input) {
  return normalizeText(input)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function makeExcerpt(body, queryTokens, maxLength) {
  const clean = String(body || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const normalized = normalizeText(clean);
  let matchIndex = -1;
  for (const token of queryTokens) {
    const index = normalized.indexOf(token);
    if (index >= 0 && (matchIndex < 0 || index < matchIndex)) matchIndex = index;
  }
  if (matchIndex < 0) return `${clean.slice(0, maxLength - 1).trim()}…`;

  const start = Math.max(0, matchIndex - Math.floor(maxLength * 0.25));
  const end = Math.min(clean.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) >= 0) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMarkdown(value) {
  return String(value || "")
    .replace(/^---$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (match) => match.trimStart())
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/[*_`]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

function stripKindPrefix(value) {
  return value.replace(/^[a-z ]+:\s*/, "").trim();
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

function encodeSourcePath(path) {
  return String(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
