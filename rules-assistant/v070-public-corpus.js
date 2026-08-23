import {
  defaultV064CandidateSourceUrls,
  loadV064CandidateRulesCorpus,
} from './v064-candidate-corpus.js';

export const V070_RULES_VERSION = 'v0.7.0';
export const V070_VERSION_LABEL = 'Gauntlet v0.7.0';
export const V070_SOURCE_VERSION = 'v0.6.4-candidate';

export function defaultV070SourceUrls(origin = 'https://gauntlet.run') {
  return defaultV064CandidateSourceUrls(origin);
}

export async function loadV070RulesCorpus(options = {}) {
  const corpus = await loadV064CandidateRulesCorpus(options);
  if (corpus.version !== V070_SOURCE_VERSION) {
    throw new Error(`Published v0.7.0 corpus expected ${V070_SOURCE_VERSION} source material, received ${corpus.version}.`);
  }
  return {
    ...corpus,
    version: V070_RULES_VERSION,
    versionLabel: V070_VERSION_LABEL,
    published: true,
    reconstruction: false,
    currentPublicRelease: V070_RULES_VERSION,
    sourceVersion: V070_SOURCE_VERSION,
    candidateBaseVersion: corpus.candidateBaseVersion || 'v0.6.3',
  };
}
