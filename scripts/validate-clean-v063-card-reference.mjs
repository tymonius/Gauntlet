import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/card-reference';
const authoritySetPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const canonicalSha256 = '9b79203f38d99d79202ccd834f8794a345513503505f1910b71665973dbb7851';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const authority = readJson(authoritySetPath);
const canonical = readJson(canonicalPath);
const manifest = readJson(`${outputDir}/manifest.json`);
const lifecycle = readJson('config/release-lifecycle.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const index = read(`${outputDir}/index.html`);
const app = read(`${outputDir}/app.js`);
const boundary = read(`${outputDir}/source-boundary.md`);
const validationStatus = read(`${outputDir}/validation-status.md`);
const analytics = read('scripts/sync-google-analytics.mjs');

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
const certifiedCanonical = authority.authority_files.find((item) => item.path === canonicalPath);
assert(certifiedCanonical, 'Complete authority set does not bind canonical structured data.');
assert.equal(certifiedCanonical.sha256, canonicalSha256);
assert.equal(hashFile(canonicalPath), canonicalSha256);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');

assert.equal(canonical.target, 'clean-v0.6.3-canonical-structured-authority');
assert.equal(canonical.publication_unlocked, false);
assert.equal(canonical.gameplay.cards.length, 128);
assert.equal(canonical.gameplay.territories.length, 25);
assert.equal(canonical.gameplay.factions.length, 6);
assert.equal(canonical.gameplay.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(canonical.gameplay.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");
for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(canonical.gameplay.factions.some((item) => item.name === faction), `Clean authority missing faction: ${faction}`);
}

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-card-reference');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.authority_certification, authoritySetPath);
assert.equal(manifest.canonical_structured_data.path, canonicalPath);
assert.equal(manifest.canonical_structured_data.sha256, canonicalSha256);
assert.equal(manifest.playable_cards, 128);
assert.equal(manifest.territories, 25);
assert.equal(manifest.factions, 6);
assert.equal(manifest.public_card_reference_modified, false);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
assert.equal(manifest.ui_baseline.role, 'public_v0.6.1_renderer_only_not_content_authority');

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const copiedBaselines = [
  ['site.css', `${outputDir}/site.css`],
  ['card-reference/styles.css', `${outputDir}/styles.css`],
  ['card-reference/faction-colors.css', `${outputDir}/faction-colors.css`],
  ['card-reference/mobile-card-preview.css', `${outputDir}/mobile-card-preview.css`],
  ['card-reference/mobile-card-preview.js', `${outputDir}/mobile-card-preview.js`],
];
for (const [source, output] of copiedBaselines) {
  assert.equal(read(output), read(source), `Card Reference UI baseline drift: ${output}`);
}

for (const output of manifest.outputs) {
  assert(fs.existsSync(path.join(root, output)), `Missing Card Reference reconstruction output: ${output}`);
}
assert(fs.existsSync(path.join(root, `${outputDir}/manifest.json`)));

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  'Clean v0.6.3 reconstruction candidate',
  '128 playable cards and 25 Territories',
  'not the current public release',
  'publication remains locked',
  '../browser-rulebook/',
  '../../../../card-reference/',
]) assert(index.includes(marker), `Card Reference HTML missing reconstruction boundary marker: ${marker}`);
for (const forbidden of [
  'googletagmanager.com',
  'G-8YYYZJGGPE',
  '../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json',
  'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
  'artifacts/v0.6.3/release-candidate',
]) assert(!index.includes(forbidden), `Card Reference HTML retained forbidden dependency: ${forbidden}`);

for (const marker of [
  `const CANONICAL_DATA_SOURCE = "../complete-authority/canonical-structured-data.json";`,
  `const AUTHORITY_SET_ID = "${authoritySetId}";`,
  'const EXPECTED_TARGET = "clean-v0.6.3-canonical-structured-authority";',
  'gameplay.cards.length !== 128',
  'gameplay.territories.length !== 25',
  'gameplay.factions.length !== 6',
  'neutral-reserves',
  'Second Line',
  'territory-smuggler-s-pass',
  "Smuggler's Run",
  'publication locked',
]) assert(app.includes(marker), `Card Reference adapter missing clean authority guard: ${marker}`);
for (const forbidden of [
  'Gauntlet_v0.6.1_Canonical_Data.json',
  'Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
  'artifacts/v0.6.3/release-candidate',
]) assert(!app.includes(forbidden), `Card Reference adapter retained forbidden data source: ${forbidden}`);

for (const marker of [
  'Binding gameplay source',
  canonicalPath,
  canonicalSha256,
  authoritySetId,
  'UI/renderer baseline',
  'not content authority',
  '128 playable cards and 25 Territories',
  'v0.6.1 remains the current public release',
]) assert(boundary.includes(marker), `Card Reference source-boundary record missing: ${marker}`);
assert(validationStatus.includes('Status before merge: **candidate**.'));

const analyticsExclusion = `${outputDir}/index.html`;
assert(analytics.includes(`"${analyticsExclusion}"`), 'Analytics synchronization does not exclude the noindex Card Reference reconstruction page.');
assert(!index.includes('gtag('), 'Noindex Card Reference reconstruction must not load production analytics.');

const changed = changedFiles();
const cardReferenceSurfaceChanged = changed.some((file) => file.startsWith(`${outputDir}/`));

if (cardReferenceSurfaceChanged) {
  const expectedDiff = [
    '.github/workflows/build-clean-v063-card-reference.yml',
    `${outputDir}/app.js`,
    `${outputDir}/faction-colors.css`,
    `${outputDir}/index.html`,
    `${outputDir}/manifest.json`,
    `${outputDir}/mobile-card-preview.css`,
    `${outputDir}/mobile-card-preview.js`,
    `${outputDir}/site.css`,
    `${outputDir}/source-boundary.md`,
    `${outputDir}/styles.css`,
    `${outputDir}/validation-status.md`,
    'scripts/build-clean-v063-card-reference.mjs',
    'scripts/sync-google-analytics.mjs',
    'scripts/validate-clean-v063-card-reference.mjs',
    'scripts/validate-clean-v063-rules-arbiter.mjs',
  ].sort();
  assert.deepEqual(changed, expectedDiff, `Card Reference reconstruction diff escaped the 15-file boundary.\n${changed.join('\n')}`);
} else {
  const forbiddenCardReferenceChanges = changed.filter((file) =>
    file.startsWith('card-reference/') ||
    file === '.github/workflows/build-clean-v063-card-reference.yml' ||
    file === 'scripts/build-clean-v063-card-reference.mjs'
  );
  assert.deepEqual(
    forbiddenCardReferenceChanges,
    [],
    `Dependency-triggered Card Reference validation must not modify public or reconstruction-build Card Reference files: ${forbiddenCardReferenceChanges.join(', ')}`
  );
}

console.log(
  cardReferenceSurfaceChanged
    ? `Clean v0.6.3 Card Reference validated: ${canonical.gameplay.cards.length} cards, ${canonical.gameplay.territories.length} Territories, six factions, certified authority ${authoritySetId.slice(0, 12)}…, noindex analytics exclusion explicit, public v0.6.1 route untouched.`
    : `Clean v0.6.3 Card Reference dependency validation passed: shared dependency changed, existing clean surface remains valid, public v0.6.1 route untouched.`
);

function changedFiles() {
  try {
    return execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean).sort();
  } catch (error) {
    console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.', error);
    return [];
  }
}
