import { buildCanonicalDocuments, parseRulebookSections } from './local-search.js';

export const V063_PUBLISHED_VERSION = 'v0.6.3';
export const V063_PUBLISHED_SOURCES = Object.freeze([
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Reference_Guide.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_First_Game_Guide.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Returning_Player_Changes.md'
]);

export function defaultPublishedV063SourceUrls(siteOrigin = 'https://gauntlet.run') {
  const origin = String(siteOrigin || 'https://gauntlet.run').replace(/\/$/, '');
  return {
    siteOrigin: origin,
    canonicalUrl: `${origin}/releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`,
    canonicalReferenceUrl: `${origin}/v0.6.3/reference/`,
    documentUrls: V063_PUBLISHED_SOURCES.map((sourcePath) => ({
      sourcePath,
      sourceUrl: `${origin}/${sourcePath}`
    }))
  };
}

export async function loadPublishedV063RulesCorpus(options = {}) {
  const urls = { ...defaultPublishedV063SourceUrls(options.siteOrigin), ...options };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  const documentUrls = Array.isArray(urls.documentUrls)
    ? urls.documentUrls
    : defaultPublishedV063SourceUrls(urls.siteOrigin).documentUrls;
  const [canonicalResponse, ...documentResponses] = await Promise.all([
    fetchImpl(urls.canonicalUrl, { cache: 'no-store' }),
    ...documentUrls.map((entry) => fetchImpl(entry.sourceUrl, { cache: 'no-store' }))
  ]);
  if (!canonicalResponse.ok) {
    throw new Error(`Could not load v0.6.3 canonical data (${canonicalResponse.status}).`);
  }
  documentResponses.forEach((response, index) => {
    if (!response.ok) {
      throw new Error(`Could not load ${documentUrls[index].sourcePath} (${response.status}).`);
    }
  });
  const [canonicalData, ...markdownSources] = await Promise.all([
    canonicalResponse.json(),
    ...documentResponses.map((response) => response.text())
  ]);
  if (canonicalData.version !== V063_PUBLISHED_VERSION) {
    throw new Error(`Expected ${V063_PUBLISHED_VERSION}, received ${String(canonicalData.version)}.`);
  }
  const origin = String(urls.siteOrigin || 'https://gauntlet.run').replace(/\/$/, '');
  const canonicalDocuments = buildCanonicalDocuments(
    canonicalData,
    origin,
    urls.canonicalReferenceUrl
  );
  const markdownDocuments = markdownSources.flatMap((markdown, index) =>
    parseRulebookSections(markdown, documentUrls[index].sourceUrl).map((document) => ({
      ...document,
      id: `v063-published:${index}:${document.id}`,
      sourcePath: documentUrls[index].sourcePath,
      sourceUrl: document.sourceUrl || documentUrls[index].sourceUrl
    }))
  );
  return {
    version: V063_PUBLISHED_VERSION,
    generatedAt: new Date().toISOString(),
    documents: [...markdownDocuments, ...canonicalDocuments],
    sourcePaths: [
      'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json',
      ...V063_PUBLISHED_SOURCES
    ]
  };
}
