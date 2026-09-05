import { expect, test } from 'vitest';
import { validateSourceFirstRefinements } from './validate-rules-refinement-source-first.mjs';

const requiredManifest = {
  schema: 'gauntlet.rules-refinement-manifest.v1',
  rootCause: 'source_specificity',
  remediation: {
    sourceAuthorityRequired: true,
    reasonSignalCodes: ['review_ambiguous_rule'],
  },
};

const ordinaryManifest = {
  schema: 'gauntlet.rules-refinement-manifest.v1',
  rootCause: 'retrieval',
  remediation: {
    sourceAuthorityRequired: false,
    reasonSignalCodes: [],
  },
};

test('rejects a source-required refinement manifest with only Arbiter implementation changes', () => {
  const manifestPath = 'artifacts/rules-refinement/source-specificity.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, 'rules-assistant/worker-v071.js'],
    manifests: [{ path: manifestPath, manifest: requiredManifest }],
  });

  expect(result.ok).toBe(false);
  expect(result.failures).toHaveLength(1);
  expect(result.failures[0].reasonSignalCodes).toContain('review_ambiguous_rule');
});

test('accepts a source-required refinement when the rulebook authority changes in the same PR', () => {
  const manifestPath = 'artifacts/rules-refinement/source-specificity.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, 'rulebook/player-facing/current-rulebook.md', 'rules-assistant/worker-v071.js'],
    manifests: [{ path: manifestPath, manifest: requiredManifest }],
  });

  expect(result.ok).toBe(true);
  expect(result.authorityChanges).toEqual(['rulebook/player-facing/current-rulebook.md']);
});

test('does not require an authority edit for a refinement whose diagnostics say the source is already sufficient', () => {
  const manifestPath = 'artifacts/rules-refinement/retrieval.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, 'rules-assistant/local-search.js'],
    manifests: [{ path: manifestPath, manifest: ordinaryManifest }],
  });

  expect(result.ok).toBe(true);
  expect(result.authorityChanges).toEqual([]);
});

test('ignores unchanged historical refinement manifests', () => {
  const result = validateSourceFirstRefinements({
    changedFiles: ['rules-assistant/local-search.js'],
    manifests: [{ path: 'artifacts/rules-refinement/old.json', manifest: requiredManifest }],
  });

  expect(result.ok).toBe(true);
});
