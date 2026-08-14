import { buildRulesCorpus } from "../../../../rules-assistant/local-search.js";

export const CLEAN_V063_RULES_VERSION = "clean-v0.6.3-reconstruction";
export const CLEAN_V063_VERSION_LABEL = "Gauntlet clean v0.6.3 reconstruction";
export const CLEAN_V063_AUTHORITY_SET_ID = "64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49";
export const CLEAN_V063_RULEBOOK_SHA256 = "7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643";
export const CLEAN_V063_CANONICAL_DATA_SHA256 = "641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c";

export const CLEAN_V063_RULEBOOK_SOURCE_PATH =
  "artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md";
export const CLEAN_V063_CANONICAL_SOURCE_PATH =
  "artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json";
export const CLEAN_V063_BROWSER_RULEBOOK_PATH =
  "artifacts/reconstruction/clean-v0.6.3/browser-rulebook/";

export function defaultCleanV063SourceUrls(origin = "https://gauntlet.run") {
  const base = String(origin || "https://gauntlet.run").replace(/\/$/, "");
  return {
    rulebookUrl: `${base}/${CLEAN_V063_RULEBOOK_SOURCE_PATH}`,
    canonicalDataUrl: `${base}/${CLEAN_V063_CANONICAL_SOURCE_PATH}`,
    rulebookBrowserUrl: `${base}/${CLEAN_V063_BROWSER_RULEBOOK_PATH}`
  };
}

export async function loadCleanV063RulesCorpus({
  rulebookUrl,
  canonicalDataUrl,
  rulebookBrowserUrl,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  const defaults = defaultCleanV063SourceUrls(
    globalThis.location?.origin || "https://gauntlet.run"
  );
  const urls = {
    rulebookUrl: rulebookUrl || defaults.rulebookUrl,
    canonicalDataUrl: canonicalDataUrl || defaults.canonicalDataUrl,
    rulebookBrowserUrl: rulebookBrowserUrl || defaults.rulebookBrowserUrl
  };

  const [rulebookResponse, canonicalResponse] = await Promise.all([
    fetchImpl(urls.rulebookUrl, { cache: "no-store" }),
    fetchImpl(urls.canonicalDataUrl, { cache: "no-store" })
  ]);

  if (!rulebookResponse.ok) {
    throw new Error(`Clean v0.6.3 Rulebook returned ${rulebookResponse.status}.`);
  }
  if (!canonicalResponse.ok) {
    throw new Error(`Clean v0.6.3 canonical data returned ${canonicalResponse.status}.`);
  }

  const rulebookMarkdown = await rulebookResponse.text();
  const canonicalData = await canonicalResponse.json();
  validateCleanV063Inputs({ rulebookMarkdown, canonicalData });

  const corpus = buildRulesCorpus({
    canonicalData,
    rulebookMarkdown,
    siteOrigin: inferOrigin(urls.rulebookUrl),
    canonicalDataUrl: urls.canonicalDataUrl,
    rulebookUrl: urls.rulebookUrl,
    rulebookBrowserUrl: urls.rulebookBrowserUrl,
    rulebookPdfUrl: urls.rulebookBrowserUrl
  });

  corpus.version = CLEAN_V063_RULES_VERSION;
  corpus.versionLabel = CLEAN_V063_VERSION_LABEL;
  corpus.reconstruction = true;
  corpus.published = false;
  corpus.currentPublicRelease = "v0.6.1";
  corpus.authoritySetId = CLEAN_V063_AUTHORITY_SET_ID;
  corpus.sourceUrls = urls;
  corpus.data = canonicalData;
  corpus.documents = corpus.documents.map((document) => {
    if (document.kind === "rulebook") {
      return {
        ...document,
        sourcePath: CLEAN_V063_RULEBOOK_SOURCE_PATH,
        sourceUrl: document.sourceUrl || urls.rulebookBrowserUrl
      };
    }

    const inheritedDefault = /releases\/v0\.6\.1\/Gauntlet_v0\.6\.1_Canonical_Data\.json$/.test(
      String(document.sourcePath || "")
    );
    return {
      ...document,
      title: document.id === "canonical:release-summary"
        ? "Canonical clean v0.6.3 reconstruction summary"
        : document.title,
      sourcePath: inheritedDefault || document.kind === "canonical"
        ? CLEAN_V063_CANONICAL_SOURCE_PATH
        : document.sourcePath,
      sourceUrl: inheritedDefault || document.kind === "canonical"
        ? urls.canonicalDataUrl
        : document.sourceUrl
    };
  });
  corpus.byId = new Map(corpus.documents.map((document) => [document.id, document]));
  return corpus;
}

export function validateCleanV063Inputs({ rulebookMarkdown, canonicalData } = {}) {
  const rulebook = String(rulebookMarkdown || "");
  if (!rulebook.includes("# GAUNTLET") || !rulebook.includes("## Official Rulebook")) {
    throw new Error("Clean v0.6.3 Rulebook is missing the expected GAUNTLET / Official Rulebook headings.");
  }

  if (!canonicalData || typeof canonicalData !== "object") {
    throw new Error("Clean v0.6.3 canonical data is missing.");
  }
  if (canonicalData.cards?.length !== 128) {
    throw new Error("Expected 128 playable cards in clean v0.6.3 canonical data.");
  }
  if (canonicalData.territories?.length !== 25) {
    throw new Error("Expected 25 Territories in clean v0.6.3 canonical data.");
  }
  if (canonicalData.factions?.length !== 6) {
    throw new Error("Expected six factions in clean v0.6.3 canonical data.");
  }
  const leaderCount = canonicalData.factions.reduce(
    (count, faction) => count + (Array.isArray(faction?.leaders) ? faction.leaders.length : 0),
    0
  );
  if (leaderCount !== 12) {
    throw new Error("Expected twelve Leaders in clean v0.6.3 canonical data.");
  }

  const serialized = JSON.stringify(canonicalData);
  if (!serialized.includes(CLEAN_V063_AUTHORITY_SET_ID)) {
    throw new Error("Clean canonical data is not bound to the repaired complete-authority set.");
  }
  return true;
}

function inferOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "https://gauntlet.run";
  }
}
