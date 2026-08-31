import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const metadataDir = 'artifacts/reconstruction/clean-v0.6.3/current-release-metadata';
const authorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const startersPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const printManifestPath = 'artifacts/reconstruction/clean-v0.6.3/print-export/manifest.json';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const rulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const canonicalSha256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';
const startersSha256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const candidatePath = `${metadataDir}/release-candidate.json`;
const registryPath = `${metadataDir}/surface-registry.json`;
const boundaryPath = `${metadataDir}/source-boundary.md`;
const statusPath = `${metadataDir}/validation-status.md`;
const candidate = readJson(candidatePath);
const registry = readJson(registryPath);
const authority = readJson(authorityPath);
const downstream = readJson(downstreamManifestPath);
const canonical = readJson(canonicalPath);
const starters = readJson(startersPath);
const printManifest = readJson(printManifestPath);
const lifecycle = readJson('config/release-lifecycle.json');
const locks = readJson('config/release-locks.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const boundary = read(boundaryPath);
const validationStatus = read(statusPath);
const candidateRaw = read(candidatePath);

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');

assert.equal(registry.schema_version, 1);
assert.equal(registry.target, 'clean-v0.6.3-surface-registry');
assert.equal(registry.release_version, 'v0.6.3');
assert.equal(registry.authority_set_id, authoritySetId);
assert.equal(registry.surface_count, 10);
assert.equal(registry.surfaces.length, 10);
assert.equal(registry.exact_cross_surface_authority_parity_required, true);
assert.equal(registry.publication_unlocked, false);
assert.equal(registry.public_current_release, 'v0.6.1');

const expectedSurfaceIds = [
  'complete-authority',
  'canonical-data-and-starters',
  'browser-rulebook',
  'card-reference',
  'faction-pages',
  'start',
  'deckbuilder',
  'rules-arbiter',
  'digital-rules',
  'print-export',
];
assert.deepEqual(registry.surfaces.map((entry) => entry.id), expectedSurfaceIds);
assert.equal(new Set(registry.surfaces.map((entry) => entry.manifest)).size, 10);

for (const entry of registry.surfaces) {
  assert(fs.existsSync(path.join(root, entry.manifest)), `Registered surface is missing: ${entry.manifest}`);
  const manifest = readJson(entry.manifest);
  assert.equal(manifest.target, entry.expected_target, `${entry.id} target drifted.`);
  assert.equal(manifest.status, entry.expected_status, `${entry.id} status drifted.`);
  assert.equal(manifest[entry.authority_field], authoritySetId, `${entry.id} authority-set binding drifted.`);
  if (Object.hasOwn(manifest, 'publication_unlocked')) assert.equal(manifest.publication_unlocked, false, `${entry.id} unexpectedly unlocked publication.`);
  if (Object.hasOwn(manifest, 'public_current_release')) assert.equal(manifest.public_current_release, 'v0.6.1', `${entry.id} public-current-release guard drifted.`);
}

assert.equal(candidate.schema_version, 1);
assert.equal(candidate.target, 'clean-v0.6.3-current-release-metadata');
assert.equal(candidate.release_version, 'v0.6.3');
assert.equal(candidate.status, 'candidate_not_current');
assert.equal(candidate.publication_date, null);
assert.equal(candidate.authority_set_id, authoritySetId);
assert.equal(candidate.surface_registry, registryPath);
assert.equal(candidate.publication_unlocked, false);
assert.equal(candidate.public_current_release, 'v0.6.1');
assert.equal(candidate.release_directory_materialized, false);
assert.equal(candidate.current_pointer_modified, false);
assert.equal(candidate.release_lifecycle_modified, false);
assert.equal(candidate.public_surfaces_modified, false);

assert.equal(candidate.binding_payloads.rulebook.sha256, rulebookSha256);
assert.equal(hashFile(candidate.binding_payloads.rulebook.path), rulebookSha256);
assert.equal(candidate.binding_payloads.canonical_data.path, canonicalPath);
assert.equal(candidate.binding_payloads.canonical_data.sha256, canonicalSha256);
assert.equal(hashFile(canonicalPath), canonicalSha256);
assert.equal(candidate.binding_payloads.approved_starters.path, startersPath);
assert.equal(candidate.binding_payloads.approved_starters.sha256, startersSha256);
assert.equal(hashFile(startersPath), startersSha256);

assert.equal(downstream.authority_set_id, authoritySetId);
assert.equal(downstream.publication_unlocked, false);
assert.equal(downstream.public_current_release, 'v0.6.1');
const canonicalOutput = downstream.outputs.find((item) => item.path === canonicalPath);
const starterOutput = downstream.outputs.find((item) => item.path === startersPath);
assert(canonicalOutput && starterOutput, 'Downstream manifest no longer binds canonical data and starters.');
assert.equal(canonicalOutput.sha256, canonicalSha256);
assert.equal(starterOutput.sha256, startersSha256);

assert.equal(canonical.version, 'clean-v0.6.3-downstream');
assert.equal(canonical.authority_set_id, authoritySetId);
assert.equal(canonical.cards.length, 128);
assert.equal(canonical.territories.length, 25);
assert.equal(canonical.factions.length, 6);
assert.equal(canonical.factions.reduce((count, faction) => count + faction.leaders.length, 0), 12);
assert.equal(canonical.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(canonical.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");
assert.equal(candidate.counts.playable_cards, canonical.cards.length);
assert.equal(candidate.counts.territories, canonical.territories.length);
assert.equal(candidate.counts.factions, canonical.factions.length);
assert.equal(candidate.counts.leaders, 12);
assert.equal(candidate.identity_invariants.neutral_reserves_title, 'Second Line');
assert.equal(candidate.identity_invariants.smugglers_title, "Smuggler's Run");

assert.equal(starters.version, 'clean-v0.6.3-downstream');
assert.equal(starters.authority_set_id, authoritySetId);
assert.equal(starters.publication_unlocked, false);
assert.equal(starters.decks.length, 12);
assert.equal(new Set(starters.decks.map((deck) => `${deck.factionId}:${deck.leaderId}`)).size, 12);
assert(starters.decks.every((deck) => deck.cardCount === 30 && deck.deckbuildingValue === 60));
assert.equal(candidate.counts.starter_decks, starters.decks.length);

assert.equal(printManifest.target, 'clean-v0.6.3-print-export');
assert.equal(printManifest.authority_set_id, authoritySetId);
assert.equal(printManifest.generated_bundle.print_documents, 9);
assert.equal(printManifest.generated_bundle.pdf_count, 9);
assert.equal(printManifest.generated_bundle.json_exports, 3);
assert.equal(printManifest.publication_unlocked, false);
assert.equal(candidate.counts.clean_print_documents, 9);
assert.equal(candidate.counts.clean_print_pdfs, 9);
assert.equal(candidate.counts.clean_json_exports, 3);

assert.deepEqual(candidate.candidate_public_defaults_after_authorized_cutover, {
  website: 'v0.6.3',
  browser_tools: 'v0.6.3',
  rules_arbiter: 'v0.6.3',
  digital_rules: 'v0.6.3',
});
assert.equal(candidate.current_public_state.release, 'v0.6.1');
assert.equal(candidate.current_public_state.cutover_performed, false);
assert.equal(candidate.current_public_state.lifecycle_path, 'config/release-lifecycle.json');
assert.equal(candidate.current_public_state.current_pointer_path, 'src/content/current.ts');
assert.equal(candidate.current_public_state.release_locks_path, 'config/release-locks.json');

assert.equal(candidate.publication_gates.all_issue_590_derived_surfaces_registered, true);
assert.equal(candidate.publication_gates.exact_cross_surface_authority_parity, true);
assert.equal(candidate.publication_gates.publication_unlocked, false);
assert.equal(candidate.publication_gates.ready_for_publication, false);
assert.equal(candidate.publication_gates.human_publication_authorization_required, true);
assert.equal(candidate.publication_gates.release_materialization_required, true);
assert.equal(candidate.publication_gates.authorized_publication_merge_required, true);
assert.equal(candidate.publication_gates.post_merge_gauntlet_run_verification_required, true);
assert.equal(candidate.publication_gates.post_merge_production_workers_verification_required, true);
assert.equal(candidate.post_merge_verification.gauntlet_run, 'pending_after_authorized_publication_merge');
assert.equal(candidate.post_merge_verification.production_workers, 'pending_after_authorized_publication_merge');
assert.equal(candidate.post_merge_verification.publication_complete_only_after_both_pass, true);

assert.equal(candidate.historical_metadata.published_v061_manifest.path, 'releases/v0.6.1/Gauntlet_v0.6.1_Manifest.json');
assert.match(candidate.historical_metadata.published_v061_manifest.role, /evidence_only_not_v063_content_authority/);
assert.equal(candidate.historical_metadata.withdrawn_v063_manifest.path, 'releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json');
assert.match(candidate.historical_metadata.withdrawn_v063_manifest.role, /withdrawn_historical_evidence_only_not_metadata_authority/);
for (const forbidden of [
  '4114492c77a70b6e526f2248d9f02b78cde900f9cb550632e3fbe15f8d5b4494',
  '7d79aec8d4a1bbee5907b406d9491eb186a026551d47127e96a00ac32696f3af',
  '15d154ae9c36f8bf02a4cb55c9d2bc5e400850caf8a18eca3a5409054fbee8e9',
  'artifacts/v0.6.3/release-candidate',
  'artifacts/v0.6.3/print-candidate',
  '"status": "published"',
  '"print_pdfs": 11',
]) assert(!candidateRaw.includes(forbidden), `Candidate inherited withdrawn metadata: ${forbidden}`);

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.1']?.status, 'current');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert.equal(plan.targets?.['clean-v0.6.3']?.downstream_regeneration_unlocked, true);
assert.equal(locks.recovery_baseline, 'v0.6.1');
assert(Array.isArray(locks.current_v061_surfaces) && locks.current_v061_surfaces.length >= 10);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

for (const marker of [
  'Binding sources',
  authoritySetId,
  rulebookSha256,
  canonicalSha256,
  startersSha256,
  'withdrawn historical evidence',
  'candidate-not-current',
  'v0.6.1 remains current/public',
  'gauntlet.run',
  'production Workers',
]) assert(boundary.includes(marker), `Source boundary missing marker: ${marker}`);
for (const marker of [
  'Status before merge: **candidate**.',
  'ten reconstructed release surfaces',
  '128 playable cards',
  '25 Territories',
  'nine print documents',
  'three JSON exports',
  'v0.6.1',
  'publication still locked',
]) assert(validationStatus.includes(marker), `Validation status missing marker: ${marker}`);

const expectedDiff = [
  '.github/workflows/build-clean-v063-current-release-metadata.yml',
  `${metadataDir}/release-candidate.json`,
  `${metadataDir}/source-boundary.md`,
  `${metadataDir}/surface-registry.json`,
  `${metadataDir}/validation-status.md`,
  'scripts/validate-clean-v063-current-release-metadata.mjs',
].sort();

try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, expectedDiff, `Current-release metadata reconstruction escaped the six-file boundary.\n${changed.join('\n')}`);
  for (const forbiddenPrefix of ['releases/', 'v0.6.3/', 'start/', 'deckbuilder/', 'rulebook/', 'card-reference/', 'factions/', 'rules-assistant/', 'workers/', 'src/reconstruction/']) {
    assert(!changed.some((file) => file.startsWith(forbiddenPrefix)), `Protected publication/runtime surface changed: ${forbiddenPrefix}`);
  }
  for (const forbiddenFile of ['config/release-lifecycle.json', 'config/release-locks.json', 'config/reconstruction-version-plan.json', 'src/content/current.ts', 'index.html']) {
    assert(!changed.includes(forbiddenFile), `Protected current-release metadata changed: ${forbiddenFile}`);
  }
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log('Clean v0.6.3 current-release metadata validated: ten reconstructed surfaces share one authority set; v0.6.1 remains current; publication and post-merge production verification remain pending.');
