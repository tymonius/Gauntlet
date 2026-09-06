import { buildRulesCorpus } from './local-search.js';

export const V071_RULES_VERSION = 'v0.7.1';
export const V071_VERSION_LABEL = 'Gauntlet v0.7.1';
export const V071_SOURCE_VERSION = 'v0.7.1';
export const V071_RULEBOOK_SOURCE_PATH = 'releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md';
export const V071_CANONICAL_SOURCE_PATH = 'releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json';
export const V071_MANIFEST_SOURCE_PATH = 'releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';
export const V071_PROVENANCE_SOURCE_PATH = 'releases/v0.7.1/Gauntlet_v0.7.1_Source_Provenance.json';

function originOf(value = 'https://gauntlet.run') {
  return String(value || 'https://gauntlet.run').replace(/\/$/, '');
}

export function defaultV071SourceUrls(origin = 'https://gauntlet.run') {
  const base = originOf(origin);
  return {
    siteOrigin: base,
    rulebookUrl: `${base}/${V071_RULEBOOK_SOURCE_PATH}`,
    canonicalDataUrl: `${base}/${V071_CANONICAL_SOURCE_PATH}`,
    manifestUrl: `${base}/${V071_MANIFEST_SOURCE_PATH}`,
    provenanceUrl: `${base}/${V071_PROVENANCE_SOURCE_PATH}`,
    rulebookBrowserUrl: `${base}/rulebook/`,
    rulebookPdfUrl: `${base}/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf`,
  };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function requireBinding(manifest, key, digest) {
  const binding = manifest?.binding_sources?.[key];
  if (!binding?.sha256) throw new Error(`v0.7.1 manifest is missing ${key} binding.`);
  if (binding.sha256 !== digest) {
    throw new Error(`v0.7.1 ${key} hash mismatch: expected ${binding.sha256}, received ${digest}.`);
  }
}

function stripRulebookAnnotations(value) {
  return String(value || '').replace(/<!--[\s\S]*?-->/g, '');
}

export function validateV071PublishedData({ canonicalData, manifest, provenance, rulebookMarkdown } = {}) {
  if (!canonicalData || canonicalData.release_version !== V071_RULES_VERSION) {
    throw new Error('Published v0.7.1 canonical data has the wrong release identity.');
  }
  if (canonicalData.source_version !== V071_SOURCE_VERSION) {
    throw new Error('Published v0.7.1 canonical data has the wrong source identity.');
  }
  if (
    canonicalData.gameplay?.cards?.length !== 142
    || canonicalData.gameplay?.territories?.length !== 25
    || canonicalData.gameplay?.factions?.length !== 6
    || canonicalData.leaders?.length !== 12
  ) {
    throw new Error('Published v0.7.1 canonical data has incomplete gameplay counts.');
  }
  if (!canonicalData.faction_feature_taxonomy?.actionProfiles?.['1 Action'] || !canonicalData.faction_features) {
    throw new Error('Published v0.7.1 canonical data is missing Faction Feature authority.');
  }
  const diplomats = canonicalData.gameplay?.factions?.find(faction => faction.id === 'diplomats');
  if (diplomats?.factionRules?.peace_treaty_threshold !== 6) {
    throw new Error('Published v0.7.1 canonical Peace Treaty threshold must be six.');
  }
  const mystics = canonicalData.mystics;
  if (
    mystics?.rites?.length !== 6
    || mystics?.selectionPolicy?.poolSize !== 6
    || mystics?.selectionPolicy?.selectedCount !== 3
  ) {
    throw new Error('Published v0.7.1 Mystics Rite authority must contain a six-Rite pool with exactly three selected.');
  }

  const rulebook = stripRulebookAnnotations(rulebookMarkdown);
  if (
    !rulebook.includes('Ratify six different Proposals')
    || !rulebook.includes('if six different Proposals are ratified')
    || rulebook.includes('Ratify five different Proposals')
    || rulebook.includes('if five different Proposals are ratified')
  ) {
    throw new Error('Published v0.7.1 Rulebook Peace Treaty threshold is not synchronized to six.');
  }
  if (!canonicalData.leaders.every(leader =>
    Array.isArray(leader.sections)
    && leader.sections.every(section =>
      !Array.isArray(section)
      && typeof section.classification === 'string'
      && typeof section.name === 'string'
    )
  )) {
    throw new Error('Published v0.7.1 Leader data is not structurally current.');
  }

  const retired = /\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/i;
  if (retired.test(String(rulebookMarkdown || ''))) {
    throw new Error('Published v0.7.1 Rulebook contains retired current terminology.');
  }
  if (retired.test(JSON.stringify(canonicalData))) {
    throw new Error('Published v0.7.1 canonical data contains retired current terminology.');
  }

  if (
    manifest?.release_version !== V071_RULES_VERSION
    || manifest?.status !== 'current'
    || !manifest?.authority_set_id
  ) {
    throw new Error('Published v0.7.1 manifest is incomplete.');
  }
  if (
    provenance?.release_version !== V071_RULES_VERSION
    || provenance?.source_version !== V071_SOURCE_VERSION
    || provenance?.authority_set_id !== manifest.authority_set_id
  ) {
    throw new Error('Published v0.7.1 provenance is not bound to the release manifest.');
  }
  return true;
}

export async function loadV071RulesCorpus(options = {}) {
  const defaults = defaultV071SourceUrls(options.siteOrigin || globalThis.location?.origin || 'https://gauntlet.run');
  const urls = { ...defaults, ...options };
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required to load v0.7.1 rules.');

  const [rulebookResponse, canonicalResponse, manifestResponse, provenanceResponse] = await Promise.all([
    fetchImpl(urls.rulebookUrl, { cache: 'no-store' }),
    fetchImpl(urls.canonicalDataUrl, { cache: 'no-store' }),
    fetchImpl(urls.manifestUrl, { cache: 'no-store' }),
    fetchImpl(urls.provenanceUrl, { cache: 'no-store' }),
  ]);
  for (const [label, response] of [
    ['Rulebook', rulebookResponse],
    ['canonical data', canonicalResponse],
    ['manifest', manifestResponse],
    ['provenance', provenanceResponse],
  ]) {
    if (!response.ok) throw new Error(`Published v0.7.1 ${label} returned ${response.status}.`);
  }

  const [rulebookBytes, canonicalBytes, manifestBytes, provenanceBytes] = await Promise.all([
    rulebookResponse.arrayBuffer(),
    canonicalResponse.arrayBuffer(),
    manifestResponse.arrayBuffer(),
    provenanceResponse.arrayBuffer(),
  ]);
  const decoder = new TextDecoder();
  const rulebookMarkdown = decoder.decode(rulebookBytes);
  const canonicalText = decoder.decode(canonicalBytes);
  const manifestText = decoder.decode(manifestBytes);
  const provenanceText = decoder.decode(provenanceBytes);
  const canonicalData = JSON.parse(canonicalText);
  const manifest = JSON.parse(manifestText);
  const provenance = JSON.parse(provenanceText);

  validateV071PublishedData({ canonicalData, manifest, provenance, rulebookMarkdown });

  const [rulebookDigest, canonicalDigest, provenanceDigest] = await Promise.all([
    sha256(rulebookBytes),
    sha256(canonicalBytes),
    sha256(provenanceBytes),
  ]);
  requireBinding(manifest, 'rulebook', rulebookDigest);
  requireBinding(manifest, 'canonical_data', canonicalDigest);
  requireBinding(manifest, 'source_provenance', provenanceDigest);

  const corpus = buildRulesCorpus({
    canonicalData,
    rulebookMarkdown,
    siteOrigin: urls.siteOrigin,
    canonicalDataUrl: urls.canonicalDataUrl,
    rulebookUrl: urls.rulebookUrl,
    rulebookBrowserUrl: urls.rulebookBrowserUrl,
    rulebookPdfUrl: urls.rulebookPdfUrl,
  });

  const documents = corpus.documents.map(document => document.kind === 'rulebook'
    ? {
        ...document,
        sourcePath: V071_RULEBOOK_SOURCE_PATH,
        sourceUrl: document.sourceUrl || urls.rulebookBrowserUrl,
      }
    : {
        ...document,
        sourcePath: V071_CANONICAL_SOURCE_PATH,
        sourceUrl: urls.canonicalDataUrl,
      });

  return {
    ...corpus,
    version: V071_RULES_VERSION,
    versionLabel: V071_VERSION_LABEL,
    published: true,
    reconstruction: false,
    currentPublicRelease: V071_RULES_VERSION,
    sourceVersion: V071_SOURCE_VERSION,
    authoritySetId: manifest.authority_set_id,
    manifest,
    provenance,
    sourceUrls: urls,
    data: canonicalData,
    documents,
    byId: new Map(documents.map(document => [document.id, document])),
  };
}
