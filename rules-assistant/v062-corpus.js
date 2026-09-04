import {
  buildV062CanonicalData,
  V062_VERSION
} from "../v0.6.2/data/canonical-data.js";
import {
  buildCanonicalDocuments,
  parseRulebookSections
} from "./local-search.js";

const BASE_CANONICAL_PATH = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json";
const V062_CANONICAL_PATH = "v0.6.2/data/Gauntlet_v0.6.2_Canonical_Data.json";
const V062_DEVELOPMENT_ARCHIVE = "docs/Archive/v0.6.2-development";

export const V062_CORPUS_SOURCES = Object.freeze([
  `${V062_DEVELOPMENT_ARCHIVE}/Gauntlet_v0.6.2_Shared_Rules_Candidate.md`,
  `${V062_DEVELOPMENT_ARCHIVE}/Gauntlet_v0.6.2_Shared_Reference_Candidate.md`,
  `${V062_DEVELOPMENT_ARCHIVE}/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md`,
  `${V062_DEVELOPMENT_ARCHIVE}/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md`,
  `${V062_DEVELOPMENT_ARCHIVE}/Gauntlet_v0.6.2_First_Game_and_Tableside_Candidate.md`
]);

export function defaultV062SourceUrls(siteOrigin = "https://gauntlet.run") {
  const origin = String(siteOrigin || "https://gauntlet.run").replace(/\/$/, "");
  return {
    siteOrigin: origin,
    baseCanonicalUrl: `${origin}/${BASE_CANONICAL_PATH}`,
    canonicalReferenceUrl: `${origin}/v0.6.2/reference/`,
    documentUrls: V062_CORPUS_SOURCES.map((sourcePath) => ({
      sourcePath,
      sourceUrl: `${origin}/${sourcePath}`
    }))
  };
}

export async function loadV062RulesCorpus(options = {}) {
  const urls = {
    ...defaultV062SourceUrls(options.siteOrigin),
    ...options
  };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to load the v0.6.2 rules corpus.");
  }

  const documentUrls = Array.isArray(urls.documentUrls)
    ? urls.documentUrls
    : defaultV062SourceUrls(urls.siteOrigin).documentUrls;

  const [baseResponse, ...documentResponses] = await Promise.all([
    fetchImpl(urls.baseCanonicalUrl, { cache: "no-store" }),
    ...documentUrls.map((entry) => fetchImpl(entry.sourceUrl, { cache: "no-store" }))
  ]);

  if (!baseResponse.ok) {
    throw new Error(`Could not load the v0.6.1 canonical base (${baseResponse.status}).`);
  }

  documentResponses.forEach((response, index) => {
    if (!response.ok) {
      throw new Error(`Could not load ${documentUrls[index].sourcePath} (${response.status}).`);
    }
  });

  const [baseData, ...markdownSources] = await Promise.all([
    baseResponse.json(),
    ...documentResponses.map((response) => response.text())
  ]);

  return buildV062RulesCorpus({
    baseData,
    markdownSources: markdownSources.map((markdown, index) => ({
      ...documentUrls[index],
      markdown
    })),
    siteOrigin: urls.siteOrigin,
    canonicalReferenceUrl: urls.canonicalReferenceUrl
  });
}

export function buildV062RulesCorpus({
  baseData,
  markdownSources = [],
  siteOrigin = "https://gauntlet.run",
  canonicalReferenceUrl
}) {
  const origin = String(siteOrigin || "https://gauntlet.run").replace(/\/$/, "");
  const canonicalData = buildV062CanonicalData(baseData);
  if (canonicalData.version !== V062_VERSION) {
    throw new Error(`Expected ${V062_VERSION}, received ${String(canonicalData.version)}.`);
  }

  const canonicalUrl = canonicalReferenceUrl || `${origin}/v0.6.2/reference/`;
  const canonicalDocuments = buildCanonicalDocuments(
    canonicalData,
    origin,
    canonicalUrl
  ).map((document) => ({
    ...document,
    sourcePath: document.sourcePath === BASE_CANONICAL_PATH
      ? V062_CANONICAL_PATH
      : document.sourcePath,
    sourceUrl: document.sourcePath === BASE_CANONICAL_PATH
      ? canonicalUrl
      : document.sourceUrl
  }));

  const markdownDocuments = markdownSources.flatMap((source) =>
    parseRulebookSections(source.markdown, source.sourceUrl).map((document) => ({
      ...document,
      id: `v062:${slugify(source.sourcePath)}:${document.id}`,
      sourcePath: source.sourcePath,
      sourceUrl: document.sourceUrl || source.sourceUrl
    }))
  );

  return {
    version: V062_VERSION,
    generatedAt: new Date().toISOString(),
    documents: deduplicateDocuments([...markdownDocuments, ...canonicalDocuments]),
    sourcePaths: [V062_CANONICAL_PATH, ...markdownSources.map((source) => source.sourcePath)]
  };
}

function deduplicateDocuments(documents) {
  const seen = new Set();
  const result = [];
  for (const document of documents) {
    const key = `${document.sourcePath}\u0000${document.title}\u0000${document.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(document);
  }
  return result;
}

function slugify(value) {
  return String(value || "source")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "source";
}
