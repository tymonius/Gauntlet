import { expect, test } from 'vitest';
import {
  REFINEMENT_LEDGER_PATH,
  validateResolutionLedger,
  validateSourceFirstRefinements,
} from './validate-rules-refinement-source-first.mjs';

const sourceInteractionId = '11111111-1111-4111-8111-111111111111';
const retrievalInteractionId = '22222222-2222-4222-8222-222222222222';

const requiredManifest = {
  schema: 'gauntlet.rules-refinement-manifest.v1',
  rootCause: 'source_specificity',
  cluster: { interactionIds: [sourceInteractionId] },
  remediation: {
    sourceAuthorityRequired: true,
    reasonSignalCodes: ['review_ambiguous_rule'],
  },
};

const ordinaryManifest = {
  schema: 'gauntlet.rules-refinement-manifest.v1',
  rootCause: 'retrieval',
  cluster: { interactionIds: [retrievalInteractionId] },
  remediation: {
    sourceAuthorityRequired: false,
    reasonSignalCodes: [],
  },
};

function ledger(entries = []) {
  return {
    schema: 'gauntlet.rules-refinement-resolution-ledger.v1',
    updatedAt: '2026-09-05T22:30:00.000Z',
    entries,
  };
}

function resolution({
  id = 'source-fix',
  rootCause = 'source_specificity',
  interactionIds = [sourceInteractionId],
  binding = { authoritySetId: 'authority-123' },
} = {}) {
  return {
    id,
    status: 'resolved',
    rootCause,
    interactionIds,
    resolutionSurface: rootCause === 'source_specificity' ? 'rules_authority' : 'arbiter_retrieval',
    summary: 'Resolved the systemic refinement issue.',
    resolvedAt: '2026-09-05T22:30:00.000Z',
    binding,
  };
}

test('rejects a source-required refinement manifest with only Arbiter implementation changes', () => {
  const manifestPath = 'artifacts/rules-refinement/source-specificity.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, REFINEMENT_LEDGER_PATH, 'rules-assistant/worker-v071.js'],
    manifests: [{ path: manifestPath, manifest: requiredManifest }],
    resolutionLedger: ledger([resolution()]),
  });

  expect(result.ok).toBe(false);
  expect(result.failures.map((item) => item.reason)).toContain('source_authority_missing');
  expect(result.failures.find((item) => item.reason === 'source_authority_missing').reasonSignalCodes).toContain('review_ambiguous_rule');
});

test('accepts a source-required refinement when authority and the resolution ledger change together', () => {
  const manifestPath = 'artifacts/rules-refinement/source-specificity.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, REFINEMENT_LEDGER_PATH, 'rulebook/player-facing/current-rulebook.md', 'rules-assistant/worker-v071.js'],
    manifests: [{ path: manifestPath, manifest: requiredManifest }],
    resolutionLedger: ledger([resolution()]),
  });

  expect(result.ok).toBe(true);
  expect(result.authorityChanges).toEqual(['rulebook/player-facing/current-rulebook.md']);
  expect(result.resolvedInteractionCount).toBe(1);
});

test('non-source refinements still require resolved ledger coverage but not an authority edit', () => {
  const manifestPath = 'artifacts/rules-refinement/retrieval.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, REFINEMENT_LEDGER_PATH, 'rules-assistant/local-search.js'],
    manifests: [{ path: manifestPath, manifest: ordinaryManifest }],
    resolutionLedger: ledger([resolution({
      id: 'retrieval-fix',
      rootCause: 'retrieval',
      interactionIds: [retrievalInteractionId],
      binding: { behaviorRevision: 'v071-qa-next' },
    })]),
  });

  expect(result.ok).toBe(true);
  expect(result.authorityChanges).toEqual([]);
});

test('rejects a changed refinement manifest that does not update the resolution ledger', () => {
  const manifestPath = 'artifacts/rules-refinement/retrieval.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, 'rules-assistant/local-search.js'],
    manifests: [{ path: manifestPath, manifest: ordinaryManifest }],
    resolutionLedger: ledger([resolution({
      id: 'retrieval-fix',
      rootCause: 'retrieval',
      interactionIds: [retrievalInteractionId],
      binding: { behaviorRevision: 'v071-qa-next' },
    })]),
  });

  expect(result.ok).toBe(false);
  expect(result.failures.map((item) => item.reason)).toContain('resolution_ledger_not_changed');
});

test('rejects a refinement ledger that does not cover every affected interaction', () => {
  const manifestPath = 'artifacts/rules-refinement/source-specificity.json';
  const result = validateSourceFirstRefinements({
    changedFiles: [manifestPath, REFINEMENT_LEDGER_PATH, 'rulebook/player-facing/current-rulebook.md'],
    manifests: [{ path: manifestPath, manifest: requiredManifest }],
    resolutionLedger: ledger([resolution({ interactionIds: ['different-interaction'] })]),
  });

  expect(result.ok).toBe(false);
  const failure = result.failures.find((item) => item.reason === 'resolution_coverage_missing');
  expect(failure.missingInteractionIds).toEqual([sourceInteractionId]);
});

test('resolved ledger entries require a durable authority, behavior, or commit binding', () => {
  const result = validateResolutionLedger(ledger([resolution({ binding: {} })]));
  expect(result.ok).toBe(false);
  expect(result.failures.join(' ')).toMatch(/authoritySetId, behaviorRevision, or fix commit/i);
});

test('ignores unchanged historical refinement manifests', () => {
  const result = validateSourceFirstRefinements({
    changedFiles: ['rules-assistant/local-search.js'],
    manifests: [{ path: 'artifacts/rules-refinement/old.json', manifest: requiredManifest }],
    resolutionLedger: null,
  });

  expect(result.ok).toBe(true);
});
