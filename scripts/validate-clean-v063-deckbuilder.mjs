import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/deckbuilder';
const authorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const startersPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const startDir = 'artifacts/reconstruction/clean-v0.6.3/start';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const canonicalSha256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';
const startersSha256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hashFile = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
const slugify = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const authority = readJson(authorityPath);
const downstream = readJson(downstreamManifestPath);
const canonical = readJson(canonicalPath);
const starters = readJson(startersPath);
const manifest = readJson(`${outputDir}/manifest.json`);
const index = read(`${outputDir}/index.html`);
const app = read(`${outputDir}/app.js`);
const boundary = read(`${outputDir}/source-boundary.md`);
const status = read(`${outputDir}/validation-status.md`);
const analytics = read('scripts/sync-google-analytics.mjs');
const lifecycle = readJson('config/release-lifecycle.json');
const plan = readJson('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const startIndex = read(`${startDir}/index.html`);
const startApp = read(`${startDir}/app.js`);
const startManifest = readJson(`${startDir}/manifest.json`);

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.status, 'certified_on_manual_merge');
assert.equal(authority.authority_set_id, authoritySetId);
assert.equal(authority.publication_unlocked, false);
assert.equal(authority.public_current_release, 'v0.6.1');

assert.equal(downstream.authority_set_id, authoritySetId);
const canonicalOutput = downstream.outputs.find((item) => item.path === canonicalPath);
const starterOutput = downstream.outputs.find((item) => item.path === startersPath);
assert(canonicalOutput, 'Downstream manifest does not bind canonical-data.json.');
assert(starterOutput, 'Downstream manifest does not bind starter-decks.json.');
assert.equal(canonicalOutput.sha256, canonicalSha256);
assert.equal(starterOutput.sha256, startersSha256);
assert.equal(hashFile(canonicalPath), canonicalSha256);
assert.equal(hashFile(startersPath), startersSha256);

assert.equal(canonical.version, 'clean-v0.6.3-downstream');
assert.equal(canonical.authority_set_id, authoritySetId);
assert.equal(canonical.publication_unlocked, false);
assert.equal(canonical.deck_construction.minimum_cards, 30);
assert.equal(canonical.deck_construction.maximum_deckbuilding_value, 60);
assert.equal(canonical.deck_construction.territories_per_player, 3);
assert.equal(canonical.deck_construction.maximum_arenas, 1);
assert.equal(canonical.deck_construction.factions_per_deck, 1);
assert.equal(canonical.deck_construction.leaders_per_deck, 1);
assert.equal(canonical.cards.length, 128);
assert.equal(canonical.territories.length, 25);
assert.equal(canonical.factions.length, 6);
assert.equal(canonical.factions.reduce((count, faction) => count + faction.leaders.length, 0), 12);
assert.equal(new Set(canonical.cards.map((card) => card.id)).size, 128);
assert.equal(new Set(canonical.territories.map((territory) => territory.id)).size, 25);
assert.equal(canonical.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(canonical.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");

const factionNames = new Map(canonical.factions.map((faction) => [faction.id, faction.name]));
const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const leaderIds = new Set(canonical.factions.flatMap((faction) => faction.leaders.map((leader) => `${faction.id}:${slugify(leader.name)}`)));
assert.equal(starters.version, 'clean-v0.6.3-downstream');
assert.equal(starters.decks.length, 12);
assert.equal(new Set(starters.decks.map((deck) => `${deck.factionId}:${deck.leaderId}`)).size, 12);
for (const deck of starters.decks) {
  assert(leaderIds.has(`${deck.factionId}:${deck.leaderId}`), `Starter has unknown Leader: ${deck.factionId}:${deck.leaderId}`);
  assert.equal(deck.cardCount, 30, `${deck.name} card count drifted.`);
  assert.equal(deck.deckbuildingValue, 60, `${deck.name} Deckbuilding Value drifted.`);
  let count = 0;
  let value = 0;
  const factionName = factionNames.get(deck.factionId);
  assert(factionName, `Starter has unknown faction: ${deck.factionId}`);
  for (const item of deck.cards) {
    const card = cardsByName.get(item.name);
    assert(card, `${deck.name} references missing card ${item.name}.`);
    assert(card.allegiance === 'Neutral' || card.allegiance === factionName, `${deck.name} contains illegal allegiance ${card.allegiance}: ${card.name}.`);
    if (card.unique) assert.equal(item.quantity, 1, `${deck.name} duplicates Unique card ${card.name}.`);
    count += item.quantity;
    value += item.quantity * card.cost;
  }
  assert.equal(count, 30, `${deck.name} recomputed card count drifted.`);
  assert.equal(value, 60, `${deck.name} recomputed value drifted.`);
  const territoryNames = deck.recommendedTerritoryOrder || deck.territories;
  assert.equal(territoryNames.length, 3, `${deck.name} must recommend exactly three Territories.`);
  assert.equal(new Set(territoryNames).size, 3, `${deck.name} repeats a Territory.`);
  const resolvedTerritories = territoryNames.map((name) => territoriesByName.get(name));
  assert(resolvedTerritories.every(Boolean), `${deck.name} references missing Territory.`);
  const arenaCount = resolvedTerritories.filter((territory) => territory.arena === true || String(territory.type || territory.kind || territory.classification || '').toLowerCase().includes('arena') || territory.name.startsWith('Arena:')).length;
  assert(arenaCount <= 1, `${deck.name} exceeds one Arena.`);
}

assert.equal(manifest.schema_version, 1);
assert.equal(manifest.target, 'clean-v0.6.3-deckbuilder');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.canonical_data.path, canonicalPath);
assert.equal(manifest.canonical_data.sha256, canonicalSha256);
assert.equal(manifest.approved_starters.path, startersPath);
assert.equal(manifest.approved_starters.sha256, startersSha256);
assert.equal(manifest.approved_starters.count, 12);
assert.equal(manifest.print_export_integrated, false);
assert.equal(manifest.public_deckbuilder_modified, false);
assert.equal(manifest.clean_start_integrated, true);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  'Clean v0.6.3 reconstruction candidate',
  'not the current public release',
  'publication remains locked',
  'Build from the <span>approved card pool.</span>',
  'minimum 30',
  'maximum 60',
  'exactly 3',
  'maximum 1',
  'Construction is rebuilt. Print/export is not.',
  'Current public Deckbuilder (v0.6.1)',
  authoritySetId,
]) assert(index.includes(marker), `Deckbuilder HTML missing reconstruction marker: ${marker}`);
for (const forbidden of ['googletagmanager.com', 'G-8YYYZJGGPE', 'print-duplex', 'print-all-starters', 'window.print(', 'v0.6.3/deckbuilder/']) {
  assert(!index.includes(forbidden), `Deckbuilder HTML retained forbidden dependency: ${forbidden}`);
}

for (const marker of [
  `const AUTHORITY_SET_ID = '${authoritySetId}';`,
  `const CANONICAL_SHA256 = '${canonicalSha256}';`,
  `const STARTERS_SHA256 = '${startersSha256}';`,
  'response.arrayBuffer()',
  "crypto.subtle.digest('SHA-256', bytes)",
  "canonical.cards.length !== 128",
  "canonical.territories.length !== 25",
  "canonical.factions.length !== 6",
  "starters.decks.length !== 12",
  "card.allegiance === 'Neutral'",
  'card.unique',
  'minimum_cards',
  'maximum_deckbuilding_value',
  'territories_per_player',
  'maximum_arenas',
  "params.get('starter') === '1'",
]) assert(app.includes(marker), `Deckbuilder runtime missing clean-source guard: ${marker}`);
for (const forbidden of ['releases/v0.6.3/', 'artifacts/v0.6.3/release-candidate', '../../../../deckbuilder/app.js', 'window.print(', 'localStorage']) {
  assert(!app.includes(forbidden), `Deckbuilder runtime retained forbidden content/output dependency: ${forbidden}`);
}

for (const marker of [
  'Binding sources',
  canonicalPath,
  canonicalSha256,
  startersPath,
  startersSha256,
  authoritySetId,
  'raw bytes',
  'historical `v0.6.3/deckbuilder/` are UX evidence only',
  'Printable card faces, backs, Leader/faction supplemental components, duplex sheet pairing, and release export artifacts are intentionally absent',
  'v0.6.1 remains current/public',
]) assert(boundary.includes(marker), `Deckbuilder source boundary missing: ${marker}`);
assert(status.includes('Status before merge: **candidate**.'));

for (const output of manifest.outputs) assert(fs.existsSync(path.join(root, output)), `Missing Deckbuilder output: ${output}`);
assert(analytics.includes(`"${outputDir}/index.html"`), 'Analytics synchronization does not exclude noindex Deckbuilder reconstruction.');
assert(!index.includes('gtag('), 'Noindex Deckbuilder reconstruction must not load production analytics.');

assert.equal(startManifest.clean_deckbuilder_integrated, true);
assert.equal(startManifest.clean_print_export_integrated, false);
assert(startIndex.includes('Open clean Deckbuilder'));
assert(startIndex.includes('Print/export remains next.'));
assert(startApp.includes("const cleanDeckbuilder = document.querySelector('[data-clean-deckbuilder]');"));
assert(startApp.includes("url.searchParams.set('starter', '1')"));
assert(startApp.includes("url.searchParams.set('source', 'start')"));
assert(startApp.includes("new URL('../deckbuilder/', window.location.href)"));

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const expectedDiff = [
  '.github/workflows/build-clean-v063-deckbuilder.yml',
  `${outputDir}/app.js`,
  `${outputDir}/index.html`,
  `${outputDir}/manifest.json`,
  `${outputDir}/source-boundary.md`,
  `${outputDir}/styles.css`,
  `${outputDir}/validation-status.md`,
  `${startDir}/app.js`,
  `${startDir}/index.html`,
  `${startDir}/manifest.json`,
  `${startDir}/source-boundary.md`,
  `${startDir}/validation-status.md`,
  'scripts/sync-google-analytics.mjs',
  'scripts/validate-clean-v063-deckbuilder.mjs',
  'scripts/validate-clean-v063-start.mjs',
].sort();

try {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^1', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, expectedDiff, `Deckbuilder reconstruction diff escaped the 15-file boundary.\n${changed.join('\n')}`);
  assert(!changed.some((file) => file.startsWith('deckbuilder/')), 'Public v0.6.1 Deckbuilder changed.');
  assert(!changed.some((file) => file.startsWith('start/')), 'Public v0.6.1 Start changed.');
  assert(!changed.includes('src/content/current.ts'), 'Current release pointer changed.');
  assert(!changed.includes('config/release-lifecycle.json'), 'Release lifecycle changed.');
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Diff-boundary check skipped because HEAD^1 is unavailable in this checkout.');
}

console.log('Clean v0.6.3 Deckbuilder validated: 128 cards, 25 Territories, six factions, 12 Leaders/starters, construction constraints enforced, Start handoff integrated, print/export still locked.');
