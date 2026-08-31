import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildV062CanonicalData } from '../v0.6.2/data/canonical-data.js';

const root = process.cwd();
const write = process.argv.includes('--write');
const outDir = 'artifacts/reconstruction/clean-v0.6.3/complete-authority';
const baselinePath = 'releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
const withdrawnV062CanonicalPath = 'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json';
const downstreamPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const oldCertificationPath = 'artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json';
const candidatesPath = 'config/reconstruction-decision-candidates.json';
const resolutionsPath = 'config/reconstruction-version-resolutions.json';
const planPath = 'config/reconstruction-version-plan.json';
const lifecyclePath = 'config/release-lifecycle.json';
const snapshotPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.md';
const snapshotMetadataPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.json';

const canonicalAuthorityPath = `${outDir}/canonical-structured-data.json`;
const cardPath = `${outDir}/cards.json`;
const territoryPath = `${outDir}/territories.json`;
const ledgerPath = `${outDir}/provenance-ledger.json`;
const manifestPath = `${outDir}/authority-set.json`;
const boundaryPath = `${outDir}/source-boundary.md`;
const reviewPath = `${outDir}/semantic-certification.md`;

const pipelineScripts = [
  'scripts/build-v063-card-normalization.mjs',
  'scripts/finalize-v063-card-conventions.mjs',
  'scripts/apply-v063-general-card-rules.mjs',
  'scripts/apply-v063-numeric-shorthand.mjs',
  'scripts/apply-v063-compact-shorthand.mjs',
  'scripts/apply-v063-natural-advantage-wording.mjs',
  'scripts/apply-v063-advantage-capitalization.mjs',
  'scripts/apply-v063-asset-language.mjs',
  'scripts/apply-v063-gambit-tactic-headings.mjs',
  'scripts/apply-v063-poolwide-card-refinements.mjs',
  'scripts/apply-v063-final-artifact-audit.mjs',
  'scripts/finalize-v063-poolwide-integrity.mjs',
  'scripts/apply-v063-finalized-forward-conventions.mjs',
  'scripts/sync-v063-final-card-mirrors.mjs',
  'scripts/generate-v063-canonical-data-candidate.mjs',
  'scripts/finalize-v063-canonical-data-candidate.mjs',
];
const provenanceInputPaths = [
  'v0.6.2/data/canonical-data.js',
  'docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md',
  'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md',
  'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  ...pipelineScripts,
];

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const provenanceKeys = new Set([
  'source', 'source_candidate', 'v063_source', 'governing_sources',
  'inherits_from', 'release_manifest', 'provenance', 'authority_set_id',
]);
const topLevelProcessKeys = new Set([
  'version', 'name', 'date', 'status', 'publication_unlocked', 'authority_set_id',
  'authority', 'structural_baseline', 'evidence_payload', 'structured_authority', 'governing_sources',
  'starter_decks', 'normalization', 'release_manifest', 'inherits_from',
]);

function stripProvenance(value) {
  if (Array.isArray(value)) return value.map(stripProvenance);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !provenanceKeys.has(key))
    .map(([key, child]) => [key, stripProvenance(child)]));
}

function gameplayPayload(value) {
  const clean = stripProvenance(structuredClone(value));
  for (const key of topLevelProcessKeys) delete clean[key];
  return clean;
}

function replaceStrings(value, from, to) {
  if (Array.isArray(value)) return value.map((entry) => replaceStrings(entry, from, to));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.replaceAll(from, to) : value;
  }
  return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, replaceStrings(child, from, to)]));
}

function fileRecord(rel, text = read(rel)) {
  return {
    path: rel,
    sha256: sha256(text),
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split('\n').length,
  };
}

function runPipeline(v062Path, workDir) {
  const withdrawn = path.join(root, withdrawnV062CanonicalPath);
  const hidden = path.join(workDir, 'withdrawn-v062-canonical-evidence.json');
  assert(fs.existsSync(withdrawn), 'Withdrawn v0.6.2 evidence file is missing before isolation guard.');
  fs.renameSync(withdrawn, hidden);
  const env = {
    ...process.env,
    V063_CARD_SOURCE: v062Path,
    V063_CARD_BASELINE: v062Path,
  };
  try {
    for (const script of pipelineScripts) {
      execFileSync(process.execPath, [path.join(root, script)], {
        cwd: root,
        env,
        stdio: 'inherit',
      });
    }
  } finally {
    if (fs.existsSync(hidden)) fs.renameSync(hidden, withdrawn);
  }
}

function buildProvenanceLedger({ candidates, resolutions, plan, snapshotText, snapshotMetadata }) {
  const v062Overrides = new Map(
    (resolutions['clean-v0.6.2']?.candidate_resolutions ?? [])
      .map((entry) => [entry.candidate_id, entry]),
  );
  const v063Supersessions = new Map(
    (resolutions['clean-v0.6.3']?.supersessions ?? [])
      .map((entry) => [entry.earlier_decision, entry]),
  );
  const records = (candidates.decisions ?? []).map((decision) => ({
    id: decision.id,
    audit_issue: decision.audit_issue,
    category: decision.category,
    summary: decision.summary,
    historical_registry_recommendation: decision.recommendation,
    historical_human_adoption_status: decision.human_adoption_status,
    approved_reconstruction_disposition: v062Overrides.get(decision.id)?.version_disposition ?? decision.recommendation,
    approval_bridge: {
      pr: 606,
      merge_commit: 'e84e27958c7f6d8d4bd0390bdbac456b40adef1b',
      effect: 'Manual merge approved the version-scoped reconstruction dispositions for authority construction only.',
    },
    explicit_v062_resolution: v062Overrides.get(decision.id) ?? null,
    explicit_v063_supersession: v063Supersessions.get(decision.id) ?? null,
    evidence: decision.evidence ?? [],
    semantic_assertions: decision.semantic_assertions ?? [],
    affected_surfaces: decision.affected_surfaces ?? [],
  }));

  assert.equal(records.length, candidates.decisions?.length ?? 0, 'Provenance ledger must cover the complete reconstruction audit registry.');
  assert(records.every((entry) => entry.historical_human_adoption_status === 'pending'));
  assert(records.every((entry) => entry.approved_reconstruction_disposition !== 'pending'));

  const overrideDir = path.join(root, 'docs/v063-card-language-overrides');
  const overridePaths = fs.readdirSync(overrideDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => `docs/v063-card-language-overrides/${name}`);
  const implementationFiles = [...provenanceInputPaths, ...overridePaths]
    .map((rel) => fileRecord(rel));

  return {
    schema_version: 1,
    target: 'clean-v0.6.3-complete-authority',
    status: 'provenance_reconstructed_for_certification',
    publication_unlocked: false,
    public_current_release: 'v0.6.1',
    approval_bridge: {
      pr: 606,
      merged_at: '2026-08-13T07:24:17Z',
      merge_commit: 'e84e27958c7f6d8d4bd0390bdbac456b40adef1b',
      source: 'https://github.com/tymonius/Gauntlet/pull/606',
      mechanism: resolutions.approval_mechanism,
    },
    baseline: {
      path: baselinePath,
      role: 'immutable_published_v061_authority_and_structural_base',
      sha256: sha256(read(baselinePath)),
    },
    decision_registry: {
      historical_candidates: candidatesPath,
      version_resolutions: resolutionsPath,
      version_plan: planPath,
      records,
      additional_recovered_decisions: [
        ...(resolutions['clean-v0.6.2']?.additional_recovered_decisions ?? []),
        ...(resolutions['clean-v0.6.3']?.additional_recovered_decisions ?? []),
      ],
    },
    required_clean_v063_delta_ids: plan.targets?.['clean-v0.6.3']?.required_v063_deltas ?? [],
    source_pipeline: [
      {
        stage: 'v0.6.2-effective-data',
        implementation: 'v0.6.2/data/canonical-data.js#buildV062CanonicalData',
        evidence: ['https://github.com/tymonius/Gauntlet/pull/502'],
        rule: 'Regenerate the v0.6.2 effective state from immutable v0.6.1 authority; do not read the withdrawn published v0.6.2 canonical JSON.',
      },
      {
        stage: 'v0.6.3-card-language-and-general-rules',
        workflow: '.github/workflows/build-v063-card-language-normalization.yml',
        evidence: [
          'https://github.com/tymonius/Gauntlet/pull/540',
          'https://github.com/tymonius/Gauntlet/pull/549',
          'https://github.com/tymonius/Gauntlet/pull/550',
          'https://github.com/tymonius/Gauntlet/pull/551',
        ],
      },
      {
        stage: 'v0.6.3-final-card-and-identity-supersessions',
        implementation: 'scripts/sync-v063-final-card-mirrors.mjs',
        evidence: [
          'https://github.com/tymonius/Gauntlet/pull/560',
          'https://github.com/tymonius/Gauntlet/pull/571',
        ],
      },
      {
        stage: 'v0.6.3-canonical-rule-integration',
        implementation: 'scripts/generate-v063-canonical-data-candidate.mjs',
        evidence: [
          'https://github.com/tymonius/Gauntlet/pull/529',
          'https://github.com/tymonius/Gauntlet/pull/555',
          'https://github.com/tymonius/Gauntlet/pull/557',
        ],
      },
      {
        stage: 'clean-v0.6.3-human-authority',
        evidence: [
          'https://github.com/tymonius/Gauntlet/pull/619',
          'https://github.com/tymonius/Gauntlet/pull/621',
          'https://github.com/tymonius/Gauntlet/pull/623',
        ],
      },
    ],
    implementation_files: implementationFiles,
    frozen_editorial_evidence: {
      issue: 405,
      comment_id: 5221286097,
      source: snapshotMetadata.source_url,
      source_created_at: snapshotMetadata.created_at,
      source_updated_at: snapshotMetadata.updated_at,
      snapshot: snapshotPath,
      snapshot_sha256: sha256(snapshotText),
      role: 'immutable_snapshot_of_21_finalized_bespoke_card_sections',
    },
    non_authority_sources: [
      {
        path: 'governance/traceability.json',
        role: 'historical_governance_evidence_only',
        reason: 'Contains stale version metadata and superseded expected fields; excluded from clean-v0.6.3 certification.',
      },
      {
        path: 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json',
        role: 'historical_comparison_evidence_only',
        reason: 'Not read as a content source by the complete-authority builder.',
      },
      {
        path: withdrawnV062CanonicalPath,
        role: 'withdrawn_historical_evidence_only',
        reason: 'Physically hidden while the v0.6.3 transformation pipeline runs so accidental reads fail.',
      },
    ],
  };
}

export function buildOutputs({ writeOutputs = write } = {}) {
  const lifecycle = readJson(lifecyclePath);
  assert.equal(lifecycle.current_release, 'v0.6.1');
  assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
  assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');

  const oldCertification = readJson(oldCertificationPath);
  assert.equal(oldCertification.target, 'clean-v0.6.3');
  assert.equal(oldCertification.status, 'certified_on_merge');
  for (const entry of oldCertification.authority_files ?? []) {
    assert.equal(sha256(read(entry.path)), entry.sha256, `Existing certified authority drifted: ${entry.path}`);
  }

  const snapshotText = read(snapshotPath);
  const snapshotMetadata = readJson(snapshotMetadataPath);
  assert.equal(snapshotMetadata.source_comment_id, 5221286097);
  assert.equal(snapshotMetadata.snapshot_path, snapshotPath);
  assert.equal(snapshotMetadata.snapshot_sha256, sha256(snapshotText));

  const baseline = readJson(baselinePath);
  const v062 = buildV062CanonicalData(baseline);
  assert.equal(v062.cards?.length, 128);
  assert.equal(v062.territories?.length, 25);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-v063-provenance-'));
  const v062Path = path.join(workDir, 'clean-v062-source.json');
  fs.writeFileSync(v062Path, jsonText(v062), 'utf8');
  try {
    runPipeline(v062Path, workDir);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }

  const generatedCanonicalPath = 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';
  const generatedCanonical = readJson(generatedCanonicalPath);
  assert.equal(generatedCanonical.cards?.length, 128);
  assert.equal(generatedCanonical.territories?.length, 25);

  const generatedGameplay = gameplayPayload(generatedCanonical);
  const currentDownstream = readJson(downstreamPath);
  const currentGameplay = gameplayPayload(currentDownstream);
  assert.deepEqual(
    generatedGameplay,
    currentGameplay,
    'Source-regenerated canonical gameplay payload differs from current clean-v0.6.3 downstream data.',
  );

  let expectedTerritories = structuredClone(v062.territories);
  expectedTerritories = replaceStrings(expectedTerritories, 'only one banked Asset they control can be active', 'only 1 of their Assets can be active');
  expectedTerritories = replaceStrings(expectedTerritories, 'all their other banked Assets are inactive', 'their other Assets are inactive');
  expectedTerritories = replaceStrings(expectedTerritories, "Smuggler's Pass", "Smuggler's Run");
  expectedTerritories = stripProvenance(expectedTerritories);
  assert.deepEqual(
    generatedGameplay.territories,
    expectedTerritories,
    'Territory authority contains a v0.6.3 mutation outside the approved Asset-language normalization or Smuggler title migration.',
  );

  const counts = generatedGameplay.cards.reduce((map, card) => {
    map[card.allegiance] = (map[card.allegiance] ?? 0) + 1;
    return map;
  }, {});
  assert.deepEqual(counts, {
    Mystics: 13,
    Inquisition: 13,
    Neutral: 50,
    Intelligence: 13,
    Military: 13,
    Financiers: 13,
    Diplomats: 13,
  });
  assert.equal(generatedGameplay.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
  assert.equal(generatedGameplay.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");

  const candidates = readJson(candidatesPath);
  const resolutions = readJson(resolutionsPath);
  const plan = readJson(planPath);
  assert.equal(candidates.required_human_adoption_status, 'pending');
  assert.match(resolutions.approval_mechanism, /Manual merge/);
  assert.equal(plan.targets?.['clean-v0.6.2']?.approval?.pr, 606);
  assert.equal(plan.targets?.['clean-v0.6.2']?.approval?.merge_commit, 'e84e27958c7f6d8d4bd0390bdbac456b40adef1b');

  const ledger = buildProvenanceLedger({ candidates, resolutions, plan, snapshotText, snapshotMetadata });
  const canonicalAuthority = {
    schema_version: 1,
    target: 'clean-v0.6.3-canonical-structured-authority',
    status: 'complete_authority_candidate',
    publication_unlocked: false,
    derivation: 'v0.6.1 authority -> source-driven v0.6.2 builder -> exact v0.6.3 card pipeline -> v0.6.3 canonical rules integration',
    gameplay: generatedGameplay,
  };
  const cardAuthority = {
    schema_version: 1,
    target: 'clean-v0.6.3-card-authority',
    status: 'complete_authority_candidate',
    publication_unlocked: false,
    count: generatedGameplay.cards.length,
    cards: generatedGameplay.cards,
  };
  const territoryAuthority = {
    schema_version: 1,
    target: 'clean-v0.6.3-territory-authority',
    status: 'complete_authority_candidate',
    publication_unlocked: false,
    count: generatedGameplay.territories.length,
    territories: generatedGameplay.territories,
  };

  const canonicalText = jsonText(canonicalAuthority);
  const cardText = jsonText(cardAuthority);
  const territoryText = jsonText(territoryAuthority);
  const ledgerText = jsonText(ledger);
  const newAuthorityRecords = [
    fileRecord(canonicalAuthorityPath, canonicalText),
    fileRecord(cardPath, cardText),
    fileRecord(territoryPath, territoryText),
    fileRecord(ledgerPath, ledgerText),
  ];
  const authorityFiles = [
    ...(oldCertification.authority_files ?? []).map((entry) => fileRecord(entry.path)),
    ...newAuthorityRecords,
  ];
  const authoritySetId = sha256(authorityFiles.map((entry) => `${entry.path}:${entry.sha256}`).join('\n'));

  const manifest = {
    schema_version: 1,
    target: 'clean-v0.6.3-complete',
    status: 'certified_on_manual_merge',
    authority_set_id: authoritySetId,
    supersedes_authority_set_id: oldCertification.authority_set_id,
    authority_files: authorityFiles,
    evidence_files: [
      fileRecord(snapshotPath, snapshotText),
      fileRecord(snapshotMetadataPath),
    ],
    equality_target: {
      path: downstreamPath,
      sha256: sha256(read(downstreamPath)),
      role: 'comparison_only_not_authority',
      result: 'full_gameplay_payload_semantically_identical',
    },
    source_guards: {
      withdrawn_v062_canonical_hidden_during_pipeline: true,
      old_v063_release_candidate_used_as_content_source: false,
      stale_governance_traceability_used_as_authority: false,
    },
    publication_unlocked: false,
    public_current_release: 'v0.6.1',
  };
  const manifestText = jsonText(manifest);

  const boundaryText = `# Clean v0.6.3 complete authority source boundary\n\n**Status:** certified on manual merge of the containing PR  \n**Authority set:** \`${authoritySetId}\`  \n**Publication:** locked  \n**Current public release:** v0.6.1\n\nThis authority reconstruction does not copy gameplay content from the withdrawn v0.6.2 canonical package or the historical v0.6.3 release-candidate canonical package.\n\nThe complete structured authority is regenerated from the immutable published v0.6.1 canonical baseline by rebuilding the effective v0.6.2 data in memory, running the exact historical v0.6.3 card-language/refinement sequence, and then running the v0.6.3 canonical rules integration. While that sequence runs, the withdrawn v0.6.2 canonical JSON is physically unavailable, so an accidental historical-package dependency fails.\n\nThe complete 25-Territory authority is independently checked against the regenerated v0.6.2 state after applying only two historically evidenced v0.6.3 Territory transformations: the Asset ownership-language normalization encoded in scripts/apply-v063-asset-language.mjs (affecting Disrupted Supply Lines) and the stable-ID title migration from **Smuggler's Pass** to **Smuggler's Run**.\n\nThe frozen #405 finalized-card tracker is repository evidence, not a live mutable dependency. The current clean-v0.6.3 downstream gameplay payload is used only as an equality target. Any content difference causes the build to fail; the builder never repairs a mismatch by copying the existing downstream value.\n\n\`governance/traceability.json\` is explicitly excluded from this certification because its version metadata and some expected fields are stale. The decision registry and version-scoped reconstruction records remain the governing provenance records.\n\nPublication remains separately locked. v0.6.1 remains current/public; v0.6.2 and v0.6.3 remain withdrawn.\n`;

  const reviewText = `# Clean v0.6.3 complete-authority semantic certification\n\n**Status:** certified on manual merge of the containing PR  \n**Authority set:** \`${authoritySetId}\`  \n**Supersedes incomplete seven-document set:** \`${oldCertification.authority_set_id}\`\n\nThis certification extends the existing clean Rulebook and six faction-guide authority with complete machine-readable authority for the full structured gameplay payload, all 128 playable cards, all 25 Territories, and an explicit post-v0.6.1 provenance ledger.\n\nThe build proves that the independently regenerated gameplay payload is semantically identical to the payload already emitted by the clean-v0.6.3 downstream reconstruction. This is a proof repair, not a game-design change.\n\nThe old v0.6.3 release-candidate canonical data is no longer needed as a content source for this complete authority. The withdrawn v0.6.2 canonical JSON is made unavailable during regeneration. The live #405 GitHub comment is replaced as a reconstruction dependency by its immutable repository snapshot.\n\nPublication is not unlocked by this certification.\n`;

  const outputs = new Map([
    [canonicalAuthorityPath, canonicalText],
    [cardPath, cardText],
    [territoryPath, territoryText],
    [ledgerPath, ledgerText],
    [manifestPath, manifestText],
    [boundaryPath, boundaryText],
    [reviewPath, reviewText],
  ]);

  if (writeOutputs) {
    for (const [rel, text] of outputs) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text, 'utf8');
    }
  }

  console.log(`Built clean-v0.6.3 complete authority ${authoritySetId}: ${generatedGameplay.cards.length} cards, ${generatedGameplay.territories.length} Territories; gameplay payload unchanged.`);
  return { outputs, authoritySetId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildOutputs();
}
