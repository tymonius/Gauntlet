import fs from 'node:fs';
import path from 'node:path';
import { migrateV063StarterCatalog } from '../v0.6.3/deckbuilder/starter-adapter.js';

const root = process.cwd();
const dir = 'artifacts/v0.6.3/release-candidate';
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const required = [
  'README.md',
  'Gauntlet_v0.6.3_Rulebook.md',
  'Gauntlet_v0.6.3_Reference_Guide.md',
  'Gauntlet_v0.6.3_First_Game_Guide.md',
  'Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'Gauntlet_v0.6.3_Starter_Decks.json',
  'Gauntlet_v0.6.3_Complete_Card_Reference.md',
  'Gauntlet_v0.6.3_Canonical_Data.json',
  'Gauntlet_v0.6.3_Returning_Player_Changes.md',
  'Gauntlet_v0.6.3_Release_Notes.md',
  'Gauntlet_v0.6.3_Manifest.json',
  'deployment-status.json',
];
for (const file of required) {
  assert(fs.existsSync(path.join(root, dir, file)), `Missing v0.6.3 release-candidate output: ${file}`);
}
if (failures.length) finish();

const rulebook = read(`${dir}/Gauntlet_v0.6.3_Rulebook.md`);
const reference = read(`${dir}/Gauntlet_v0.6.3_Reference_Guide.md`);
const firstGame = read(`${dir}/Gauntlet_v0.6.3_First_Game_Guide.md`);
const factionGuide = read(`${dir}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`);
const completeReference = read(`${dir}/Gauntlet_v0.6.3_Complete_Card_Reference.md`);
const returning = read(`${dir}/Gauntlet_v0.6.3_Returning_Player_Changes.md`);
const notes = read(`${dir}/Gauntlet_v0.6.3_Release_Notes.md`);
const readme = read(`${dir}/README.md`);
const canonical = readJson(`${dir}/Gauntlet_v0.6.3_Canonical_Data.json`);
const upstreamCanonical = readJson('artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const starters = readJson(`${dir}/Gauntlet_v0.6.3_Starter_Decks.json`);
const inheritedStarters = readJson('releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json');
const expectedStarters = migrateV063StarterCatalog(inheritedStarters);
const manifest = readJson(`${dir}/Gauntlet_v0.6.3_Manifest.json`);
const deployment = readJson(`${dir}/deployment-status.json`);

assert(JSON.stringify(canonical) === JSON.stringify(upstreamCanonical), 'Release candidate canonical data must exactly equal the integrated v0.6.3 canonical candidate.');
assert(canonical.version === 'v0.6.3-candidate', `Canonical version must remain v0.6.3-candidate before publication; found ${canonical.version}.`);
assert(canonical.release_manifest === null, 'Canonical release_manifest must remain null before publication.');
assert(canonical.normalization?.canonical_data_integration?.published_release === false, 'Canonical candidate must remain explicitly unpublished.');
assert(canonical.cards?.length === 128, `Expected 128 cards; found ${canonical.cards?.length}.`);
assert(canonical.territories?.length === 25, `Expected 25 Territories; found ${canonical.territories?.length}.`);
assert(canonical.battlefield?.last_stand?.final_territory_capture_required === false, 'Last Stand candidate data incorrectly requires final-Territory capture.');
assert(canonical.battlefield?.last_stand?.separate_movement_sequence_required === true, 'Last Stand candidate data must require a separate movement sequence.');
assert(canonical.deck_construction?.opening_draw === 4 && canonical.deck_construction?.opening_discard === 1, 'Opening selection is not draw four / discard one.');
assert(canonical.deck_construction?.territory_arrangement_after_opening_selection === true, 'Territory arrangement must follow opening selection.');

for (const [label, text] of Object.entries({ rulebook, reference, firstGame })) {
  for (const token of [
    'v0.6.3',
    'Draw four',
    'discard one',
    'Territor',
  ]) assert(text.includes(token), `${label} is missing release-candidate token: ${token}`);
  assert(!text.includes('Playable Deck'), `${label} contains retired Playable Deck terminology.`);
}
for (const token of [
  '**Version 0.6.3 — Release Candidate**',
  'Release candidate — not published',
  'Capturing the Territory at the opponent\'s end immediately runs the Gauntlet and wins the game.',
  'separate legal movement sequence',
  'Gambit/Tactic',
  'inherent Bank Action',
  '# Part IV — Factions and Components',
]) assert(rulebook.includes(token), `Rulebook release candidate is missing: ${token}`);

for (const token of [
  'Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories',
  'separate legal movement sequence',
  'Gambit/Tactic',
]) assert(reference.includes(token), `Reference release candidate is missing: ${token}`);

for (const token of [
  'Draw four cards, discard one face up, and keep three',
  'secretly arrange your three Territories',
  'There are two normal victory routes',
]) assert(firstGame.includes(token), `First Game release candidate is missing: ${token}`);

for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(factionGuide.includes(faction), `Faction guide is missing ${faction}.`);
}
assert(factionGuide.includes('Release candidate — not published'), 'Faction guide must identify the publication boundary.');
assert(factionGuide.includes('# Part IV — Factions and Components'), 'Faction guide must be extracted from synchronized Rulebook Part IV.');

for (const title of ['Shock and Awe', 'Margin Loan', 'Second Line', "Smuggler's Run", 'Protracted Siege']) {
  assert(completeReference.includes(title), `Complete reference is missing ${title}.`);
}
assert(!completeReference.includes('## Reserves\n'), 'Complete reference still contains the retired Reserves card title.');
assert(!completeReference.includes("## Smuggler's Pass\n"), 'Complete reference still contains the retired Smuggler\'s Pass Territory title.');

assert(starters.version === 'v0.6.3-release-candidate', `Starter catalog version is ${starters.version}.`);
assert(starters.status === 'Release candidate — not published', 'Starter catalog must identify the release-candidate boundary.');
assert(starters.decks?.length === 12, `Expected 12 starter Decks; found ${starters.decks?.length}.`);
assert(starters.inheritedFromVersion === expectedStarters.inheritedFromVersion, 'Starter inheritance metadata drifted.');
const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
let sawSecondLine = false;
let sawSmugglersRun = false;
for (const deck of starters.decks ?? []) {
  const count = (deck.cards ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const value = (deck.cards ?? []).reduce((sum, item) => {
    const card = cardsByName.get(item.name);
    assert(Boolean(card), `${deck.name}: unknown v0.6.3 card ${item.name}.`);
    if (item.name === 'Second Line') sawSecondLine = true;
    assert(item.name !== 'Reserves', `${deck.name}: retired Reserves title remains in starter Deck.`);
    return sum + (card ? item.quantity * card.cost : 0);
  }, 0);
  assert(count === 30, `${deck.name}: expected 30 cards; found ${count}.`);
  assert(value === 60, `${deck.name}: expected Deckbuilding Value 60; found ${value}.`);
  assert((deck.territories ?? []).length === 3, `${deck.name}: expected three Territories.`);
  assert(JSON.stringify(deck.recommendedTerritoryOrder) === JSON.stringify(deck.territories), `${deck.name}: recommended Territory order does not preserve inherited strategic order.`);
  assert(deck.territoryOrderGuidance?.meaning === 'strategy-recommendation', `${deck.name}: Territory order is not marked as strategy guidance.`);
  assert(deck.territoryOrderGuidance?.mayRearrangeAtSetup === true, `${deck.name}: Territory order is incorrectly locked at setup.`);
  assert(deck.territoryOrderGuidance?.informedByInitiative === false, `${deck.name}: Territory order incorrectly uses initiative.`);
  for (const name of deck.territories ?? []) {
    assert(territoriesByName.has(name), `${deck.name}: unknown v0.6.3 Territory ${name}.`);
    if (name === "Smuggler's Run") sawSmugglersRun = true;
    assert(name !== "Smuggler's Pass", `${deck.name}: retired Smuggler's Pass title remains.`);
  }
}
assert(sawSecondLine, 'Adapted starter package does not exercise the Second Line title migration.');
assert(sawSmugglersRun, 'Adapted starter package does not exercise the Smuggler\'s Run title migration.');

assert(manifest.version === 'v0.6.3-release-candidate', `Manifest version is ${manifest.version}.`);
assert(manifest.release_version === 'v0.6.3', 'Manifest release_version must be v0.6.3.');
assert(manifest.status === 'candidate-not-published', 'Manifest must remain candidate-not-published.');
assert(manifest.playable_card_designs === 128, 'Manifest card count must be 128.');
assert(manifest.territories === 25, 'Manifest Territory count must be 25.');
assert(manifest.starter_decks === 12, 'Manifest starter count must be 12.');
assert(manifest.publication_boundary?.published_version === 'v0.6.2', 'Manifest must preserve v0.6.2 as published baseline.');
assert(manifest.publication_boundary?.promotion_target === 'releases/v0.6.3/', 'Manifest promotion target must be releases/v0.6.3/.');
for (const field of ['public_site_cutover', 'rules_arbiter_default_cutover', 'digital_default_cutover', 'published_release_directory_materialized']) {
  assert(manifest.publication_boundary?.[field] === false, `Manifest publication boundary ${field} must be false.`);
}
assert(manifest.validation?.source_release_candidate_assembled === true, 'Manifest does not record assembled source candidate.');
assert(manifest.validation?.print_package_generated === false, 'Print package must remain a later gate.');
assert(manifest.validation?.ready_for_publication === false, 'Source package alone must not mark v0.6.3 ready for publication.');
for (const file of required) assert(manifest.current_outputs?.includes(file), `Manifest current_outputs omits ${file}.`);

assert(deployment.status === 'not-published', 'Deployment status must remain not-published.');
assert(deployment.published_version === 'v0.6.2', 'Deployment status must retain v0.6.2 as published version.');
assert(deployment.source_package_ready === true, 'Deployment status must record source package ready.');
assert(deployment.print_package_ready === false, 'Deployment status must keep print package unready.');
assert(deployment.public_cutover_ready === false, 'Deployment status must keep public cutover unready.');

for (const token of [
  'pre-publication source package',
  'v0.6.2',
  'next gate is generation and validation of the v0.6.3 printed-material package',
]) assert(readme.includes(token), `Release-candidate README is missing: ${token}`);
assert(notes.includes('does **not** change the public website'), 'Release notes must state the public boundary.');
assert(notes.includes('Margin Loan'), 'Release notes must include the final Margin Loan behavior change.');
assert(returning.includes('v0.6.2 remains the published playtest edition'), 'Returning-player handout must preserve the publication boundary.');

assert(!fs.existsSync(path.join(root, 'releases/v0.6.3')), 'Pre-publication assembly must not materialize releases/v0.6.3/.');

finish();

function finish() {
  if (failures.length) {
    console.error('v0.6.3 source release-candidate validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('v0.6.3 source release-candidate validation passed: 128 cards, 25 Territories, 12 current-name starter Decks, synchronized player-facing sources, and no public cutover.');
}
