import { buildRulesCorpus } from "./local-search.js";

export const V072_RULES_VERSION = "v0.7.2";
export const V072_VERSION_LABEL = "Gauntlet v0.7.2";
export const V072_SOURCE_VERSION = "v0.7.2";
export const V072_COMPLETE_RULES_SOURCE_PATH = "releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md";
export const V072_CANONICAL_SOURCE_PATH = "releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json";
export const V072_MANIFEST_SOURCE_PATH = "releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json";
export const V072_PROVENANCE_SOURCE_PATH = "releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json";
export const V072_STARTERS_SOURCE_PATH = "releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json";

function originOf(value = "https://gauntlet.run") {
  return String(value || "https://gauntlet.run").replace(/\/$/, "");
}

export function defaultV072SourceUrls(origin = "https://gauntlet.run") {
  const base = originOf(origin);
  return {
    siteOrigin: base,
    completeRulesUrl: `${base}/${V072_COMPLETE_RULES_SOURCE_PATH}`,
    canonicalDataUrl: `${base}/${V072_CANONICAL_SOURCE_PATH}`,
    manifestUrl: `${base}/${V072_MANIFEST_SOURCE_PATH}`,
    provenanceUrl: `${base}/${V072_PROVENANCE_SOURCE_PATH}`,
    startersUrl: `${base}/${V072_STARTERS_SOURCE_PATH}`,
    rulebookBrowserUrl: `${base}/rulebook/?rules=candidate&doc=complete-rules`,
  };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

function requireBinding(manifest, key, digest) {
  const binding = manifest?.binding_sources?.[key];
  if (!binding?.sha256) throw new Error(`v0.7.2 manifest is missing ${key} binding.`);
  if (binding.sha256 !== digest) {
    throw new Error(`v0.7.2 ${key} hash mismatch: expected ${binding.sha256}, received ${digest}.`);
  }
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

export function sanitizeV072CanonicalDataForRules(canonicalData) {
  const cards = canonicalData?.gameplay?.cards;
  if (!Array.isArray(cards)) return canonicalData;
  return {
    ...canonicalData,
    gameplay: {
      ...canonicalData.gameplay,
      cards: cards.map(card => {
        if (!card || !Array.isArray(card.effects) || !card.effects.length) return card;
        const normalized = { ...card };
        for (const key of LEGACY_CARD_FACE_FIELDS) delete normalized[key];
        return normalized;
      }),
    },
  };
}

export function validateV072ReleaseData({ canonicalData, manifest, provenance, completeRulesMarkdown } = {}) {
  if (
    canonicalData?.release_version !== V072_RULES_VERSION
    || canonicalData?.source_version !== V072_SOURCE_VERSION
    || canonicalData?.status !== "release-candidate"
  ) {
    throw new Error("Staged v0.7.2 canonical data has the wrong release identity.");
  }
  if (
    canonicalData.gameplay?.cards?.length !== 142
    || canonicalData.gameplay?.territories?.length !== 25
    || canonicalData.gameplay?.factions?.length !== 6
    || canonicalData.leaders?.length !== 12
    || canonicalData.proposals?.length !== 9
  ) {
    throw new Error("Staged v0.7.2 canonical data has incomplete gameplay counts.");
  }
  if (
    manifest?.release_version !== V072_RULES_VERSION
    || manifest?.status !== "candidate"
    || !manifest?.authority_set_id
  ) {
    throw new Error("Staged v0.7.2 manifest is incomplete.");
  }
  if (
    provenance?.release_version !== V072_RULES_VERSION
    || provenance?.source_version !== V072_SOURCE_VERSION
    || provenance?.status !== "release-candidate"
    || provenance?.authority_set_id !== manifest.authority_set_id
    || canonicalData.frozen_authority_set_id !== manifest.authority_set_id
  ) {
    throw new Error("Staged v0.7.2 provenance is not bound to the frozen release authority.");
  }

  const rules = String(completeRulesMarkdown || "");
  if (
    !rules.includes("<!-- RULES-SURFACE:comprehensive-rules -->")
    || !rules.includes("<!-- RULES-REVIEW-MODE:reviewed-technical -->")
    || !rules.includes("<!-- AUTHORITY:game-data/current-game.json -->")
    || !rules.includes("# Comprehensive Gauntlet Rules")
  ) {
    throw new Error("Staged v0.7.2 Complete Rules are not the reviewed technical rules source.");
  }
  return true;
}

export async function loadV072RulesCorpus(options = {}) {
  const defaults = defaultV072SourceUrls(options.siteOrigin || globalThis.location?.origin || "https://gauntlet.run");
  const urls = { ...defaults, ...options };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required to load v0.7.2 rules.");

  const [rulesResponse, canonicalResponse, manifestResponse, provenanceResponse, startersResponse] = await Promise.all([
    fetchImpl(urls.completeRulesUrl, { cache: "no-store" }),
    fetchImpl(urls.canonicalDataUrl, { cache: "no-store" }),
    fetchImpl(urls.manifestUrl, { cache: "no-store" }),
    fetchImpl(urls.provenanceUrl, { cache: "no-store" }),
    fetchImpl(urls.startersUrl, { cache: "no-store" }),
  ]);
  for (const [label, response] of [
    ["Complete Rules", rulesResponse],
    ["canonical data", canonicalResponse],
    ["manifest", manifestResponse],
    ["provenance", provenanceResponse],
    ["starter Decks", startersResponse],
  ]) {
    if (!response.ok) throw new Error(`Staged v0.7.2 ${label} returned ${response.status}.`);
  }

  const [rulesBytes, canonicalBytes, manifestBytes, provenanceBytes, startersBytes] = await Promise.all([
    rulesResponse.arrayBuffer(),
    canonicalResponse.arrayBuffer(),
    manifestResponse.arrayBuffer(),
    provenanceResponse.arrayBuffer(),
    startersResponse.arrayBuffer(),
  ]);
  const decoder = new TextDecoder();
  const completeRulesMarkdown = decoder.decode(rulesBytes);
  const canonicalData = JSON.parse(decoder.decode(canonicalBytes));
  const manifest = JSON.parse(decoder.decode(manifestBytes));
  const provenance = JSON.parse(decoder.decode(provenanceBytes));

  validateV072ReleaseData({ canonicalData, manifest, provenance, completeRulesMarkdown });

  const [rulesDigest, canonicalDigest, provenanceDigest, startersDigest] = await Promise.all([
    sha256(rulesBytes),
    sha256(canonicalBytes),
    sha256(provenanceBytes),
    sha256(startersBytes),
  ]);
  requireBinding(manifest, "complete_rules", rulesDigest);
  requireBinding(manifest, "canonical_data", canonicalDigest);
  requireBinding(manifest, "source_provenance", provenanceDigest);
  requireBinding(manifest, "approved_starters", startersDigest);

  const rulesCanonicalData = sanitizeV072CanonicalDataForRules(canonicalData);
  const cleanRulesMarkdown = stripRulebookAnnotations(completeRulesMarkdown);
  const corpus = buildRulesCorpus({
    canonicalData: {
      ...rulesCanonicalData,
      name: V072_VERSION_LABEL,
      deck_construction: rulesCanonicalData.gameplay?.deck_construction,
      battlefield: rulesCanonicalData.gameplay?.battlefield,
      battle: rulesCanonicalData.gameplay?.battle,
    },
    rulebookMarkdown: cleanRulesMarkdown,
    siteOrigin: urls.siteOrigin,
    canonicalDataUrl: urls.canonicalDataUrl,
    rulebookUrl: urls.completeRulesUrl,
    rulebookBrowserUrl: urls.rulebookBrowserUrl,
    rulebookPdfUrl: urls.rulebookBrowserUrl,
  });

  const documents = corpus.documents.map(document => document.kind === "rulebook"
    ? { ...document, sourcePath: V072_COMPLETE_RULES_SOURCE_PATH, sourceUrl: document.sourceUrl || urls.rulebookBrowserUrl }
    : { ...document, sourcePath: V072_CANONICAL_SOURCE_PATH, sourceUrl: urls.canonicalDataUrl });

  return {
    ...corpus,
    version: V072_RULES_VERSION,
    versionLabel: V072_VERSION_LABEL,
    published: manifest.status === "current",
    candidate: manifest.status === "candidate",
    reconstruction: false,
    currentPublicRelease: manifest.public_defaults?.rules_arbiter || "v0.7.1",
    sourceVersion: V072_SOURCE_VERSION,
    authoritySetId: manifest.authority_set_id,
    manifest,
    provenance,
    sourceUrls: urls,
    data: canonicalData,
    documents,
    byId: new Map(documents.map(document => [document.id, document])),
  };
}
