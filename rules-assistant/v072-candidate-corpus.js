import { buildRulesCorpus } from "./local-search.js";
import {
  frozenV072CandidateCurrentGameSource,
  frozenV072CandidateCompleteRulesSource
} from "../legacy/rules-assistant/v072-candidate/frozen-sources.mjs";

export const V072_CANDIDATE_RULES_VERSION = "v0.7.2-candidate";
export const V072_CANDIDATE_VERSION_LABEL = "Gauntlet v0.7.2 candidate";
// DOC-HISTORICAL: the last frozen prerelease pair, not the older candidate QA snapshot.
export const V072_CANDIDATE_FROZEN_COMMIT = "5f2012690e4574c4f675e3d13db642c6fb1db87f";
export const V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID = "ab0125ae280accfb03d53bdadf5b6ae006f98aeab897e20a4b2269d89ed9eb84";
export const V072_CURRENT_GAME_SOURCE_PATH = "packages/game-data/current-game.json";
export const V072_COMPLETE_RULES_SOURCE_PATH = "packages/rules/comprehensive/comprehensive-rules.md";
// DOC-HISTORICAL: These paths were the pre-release moving public routes.
// Retain exported names for compatibility, but NEVER use them to serve a frozen candidate.
export const V072_CURRENT_GAME_PUBLIC_PATH = "game-data/current-game.json";
export const V072_COMPLETE_RULES_PUBLIC_PATH = "rulebook/sources/complete-rules.md";
export const V072_COMPLETE_RULES_BROWSER_PATH = "rulebook/?rules=candidate&doc=complete-rules";

function originOf(value = "https://gauntlet.run") {
  return String(value || "https://gauntlet.run").replace(/\/$/, "");
}

export function defaultV072CandidateSourceUrls(origin = "https://gauntlet.run") {
  const base = originOf(origin);
  const frozenSourceRoot = `https://github.com/tymonius/Gauntlet/blob/${V072_CANDIDATE_FROZEN_COMMIT}`;
  const completeRulesUrl = `${frozenSourceRoot}/${V072_COMPLETE_RULES_SOURCE_PATH}`;
  return {
    siteOrigin: base,
    currentGameUrl: `${frozenSourceRoot}/${V072_CURRENT_GAME_SOURCE_PATH}`,
    completeRulesUrl,
    rulebookBrowserUrl: completeRulesUrl,
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
  const urls = defaultV072CandidateSourceUrls(
    options.siteOrigin || globalThis.location?.origin || "https://gauntlet.run"
  );
  // DOC-HISTORICAL: The published live /game-data/ route now contains stable
  // authority, not the candidate. Bundle the original release-freeze source
  // bytes and validate their exact pair before constructing any answers.
  // Caller-supplied fetchImpl/source URLs cannot swap in moving public data.
  const encoder = new TextEncoder();
  const currentGameBytes = encoder.encode(frozenV072CandidateCurrentGameSource);
  const completeRulesBytes = encoder.encode(frozenV072CandidateCompleteRulesSource);
  const authoritySetId = await candidateAuthoritySetId(currentGameBytes, completeRulesBytes);
  if (authoritySetId !== V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID) {
    throw new Error("Frozen v0.7.2 candidate source authority-set hash mismatch.");
  }

  const currentGame = JSON.parse(frozenV072CandidateCurrentGameSource);
  const completeRulesMarkdown = frozenV072CandidateCompleteRulesSource;
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
    authoritySetId,
    sourceUrls: urls,
    data: currentGame,
    documents,
    byId: new Map(documents.map(document => [document.id, document])),
  };
}
