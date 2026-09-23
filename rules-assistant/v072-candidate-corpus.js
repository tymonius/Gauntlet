import { buildRulesCorpus } from "./local-search.js";

export const V072_CANDIDATE_RULES_VERSION = "v0.7.2-candidate";
export const V072_CANDIDATE_VERSION_LABEL = "Gauntlet v0.7.2 candidate";
export const V072_CURRENT_GAME_SOURCE_PATH = "packages/game-data/current-game.json";
export const V072_COMPLETE_RULES_SOURCE_PATH = "packages/rules/comprehensive/comprehensive-rules.md";
export const V072_CURRENT_GAME_PUBLIC_PATH = "game-data/current-game.json";
export const V072_COMPLETE_RULES_PUBLIC_PATH = "rulebook/sources/complete-rules.md";
export const V072_COMPLETE_RULES_BROWSER_PATH = "rulebook/?rules=candidate&doc=complete-rules";

function originOf(value = "https://gauntlet.run") {
  return String(value || "https://gauntlet.run").replace(/\/$/, "");
}

export function defaultV072CandidateSourceUrls(origin = "https://gauntlet.run") {
  const base = originOf(origin);
  return {
    siteOrigin: base,
    currentGameUrl: `${base}/${V072_CURRENT_GAME_PUBLIC_PATH}`,
    completeRulesUrl: `${base}/${V072_COMPLETE_RULES_PUBLIC_PATH}`,
    rulebookBrowserUrl: `${base}/${V072_COMPLETE_RULES_BROWSER_PATH}`,
  };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function candidateAuthoritySetId(currentGameBytes, completeRulesBytes) {
  const left = new Uint8Array(currentGameBytes);
  const right = new Uint8Array(completeRulesBytes);
  const combined = new Uint8Array(left.length + 1 + right.length);
  combined.set(left, 0);
  combined[left.length] = 0;
  combined.set(right, left.length + 1);
  return sha256(combined);
}

function stripRulebookAnnotations(value) {
  return String(value || "").replace(/<!--[\s\S]*?-->/g, "");
}

const LEGACY_CARD_FACE_FIELDS = new Set([
  "action",
  "asset",
  "battle",
  "gambit",
  "gambit_tactic",
  "loan",
  "mission",
  "overlay",
  "placement",
  "tactic",
]);

export function sanitizeV072CandidateDataForRules(currentGame) {
  const cards = currentGame?.gameplay?.cards;
  if (!Array.isArray(cards)) return currentGame;

  const normalizedCards = cards.map(card => {
    if (!card || !Array.isArray(card.effects) || !card.effects.length) return card;
    const normalized = { ...card };
    for (const key of LEGACY_CARD_FACE_FIELDS) delete normalized[key];
    return normalized;
  });

  return {
    ...currentGame,
    gameplay: {
      ...currentGame.gameplay,
      cards: normalizedCards,
    },
  };
}

export function validateV072CandidateData({ currentGame, completeRulesMarkdown } = {}) {
  if (
    !currentGame
    || currentGame.authority !== "current-game"
    || currentGame.version !== V072_CANDIDATE_RULES_VERSION
    || currentGame.status !== "active-development"
  ) {
    throw new Error("v0.7.2 candidate current-game authority has the wrong identity or status.");
  }

  if (
    currentGame.gameplay?.cards?.length !== 142
    || currentGame.gameplay?.territories?.length !== 25
    || currentGame.gameplay?.factions?.length !== 6
    || currentGame.leaders?.length !== 12
  ) {
    throw new Error("v0.7.2 candidate current-game authority has incomplete gameplay counts.");
  }

  const rules = String(completeRulesMarkdown || "");
  if (
    !rules.includes("<!-- RULES-SURFACE:comprehensive-rules -->")
    || !rules.includes("<!-- RULES-REVIEW-MODE:reviewed-technical -->")
    || !rules.includes("<!-- AUTHORITY:game-data/current-game.json -->")
    || !rules.includes("# Comprehensive Gauntlet Rules")
  ) {
    throw new Error("v0.7.2 candidate Complete Rules are not the reviewed technical current-game publication.");
  }

  return true;
}

export async function loadV072CandidateRulesCorpus(options = {}) {
  const defaults = defaultV072CandidateSourceUrls(
    options.siteOrigin || globalThis.location?.origin || "https://gauntlet.run"
  );
  const urls = { ...defaults, ...options };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to load v0.7.2 candidate rules.");
  }

  const [currentGameResponse, completeRulesResponse] = await Promise.all([
    fetchImpl(urls.currentGameUrl, { cache: "no-store" }),
    fetchImpl(urls.completeRulesUrl, { cache: "no-store" }),
  ]);

  for (const [label, response] of [
    ["current-game authority", currentGameResponse],
    ["Complete Rules", completeRulesResponse],
  ]) {
    if (!response.ok) {
      throw new Error(`v0.7.2 candidate ${label} returned ${response.status}.`);
    }
  }

  const [currentGameBytes, completeRulesBytes] = await Promise.all([
    currentGameResponse.arrayBuffer(),
    completeRulesResponse.arrayBuffer(),
  ]);
  const decoder = new TextDecoder();
  const currentGameText = decoder.decode(currentGameBytes);
  const completeRulesMarkdown = decoder.decode(completeRulesBytes);
  const currentGame = JSON.parse(currentGameText);

  validateV072CandidateData({ currentGame, completeRulesMarkdown });

  const rulesCanonicalData = sanitizeV072CandidateDataForRules(currentGame);
  const cleanRulesMarkdown = stripRulebookAnnotations(completeRulesMarkdown);
  const corpus = buildRulesCorpus({
    canonicalData: {
      ...rulesCanonicalData,
      name: V072_CANDIDATE_VERSION_LABEL,
      deck_construction: rulesCanonicalData.gameplay?.deck_construction,
      battlefield: rulesCanonicalData.gameplay?.battlefield,
      battle: rulesCanonicalData.gameplay?.battle,
    },
    rulebookMarkdown: cleanRulesMarkdown,
    siteOrigin: urls.siteOrigin,
    canonicalDataUrl: urls.currentGameUrl,
    rulebookUrl: urls.completeRulesUrl,
    rulebookBrowserUrl: urls.rulebookBrowserUrl,
    rulebookPdfUrl: urls.rulebookBrowserUrl,
  });

  const documents = corpus.documents.map(document => document.kind === "rulebook"
    ? {
        ...document,
        sourcePath: V072_COMPLETE_RULES_SOURCE_PATH,
        sourceUrl: document.sourceUrl || urls.rulebookBrowserUrl,
      }
    : {
        ...document,
        sourcePath: V072_CURRENT_GAME_SOURCE_PATH,
        sourceUrl: urls.currentGameUrl,
      });

  return {
    ...corpus,
    version: V072_CANDIDATE_RULES_VERSION,
    versionLabel: V072_CANDIDATE_VERSION_LABEL,
    published: false,
    candidate: true,
    reconstruction: false,
    currentPublicRelease: "v0.7.2",
    sourceVersion: V072_CANDIDATE_RULES_VERSION,
    authoritySetId: await candidateAuthoritySetId(currentGameBytes, completeRulesBytes),
    sourceUrls: urls,
    data: currentGame,
    documents,
    byId: new Map(documents.map(document => [document.id, document])),
  };
}
