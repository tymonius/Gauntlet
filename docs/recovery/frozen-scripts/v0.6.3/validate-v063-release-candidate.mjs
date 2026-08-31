import fs from 'node:fs';
import path from 'node:path';
import { V063_STARTER_CATALOG } from '../v0.6.3/data/starter-decks-candidate.js';

const root = process.cwd();
const dir = 'artifacts/v0.6.3/release-candidate';
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const lifecycle = readJson('config/release-lifecycle.json');
const v063Withdrawn = lifecycle.current_release === 'v0.6.2' &&
  lifecycle.releases?.['v0.6.3']?.status === 'withdrawn' &&
  lifecycle.releases?.['v0.6.3']?.artifacts_preserved === true &&
  lifecycle.releases?.['v0.6.3']?.public_cutover === false;

const required = [
  'README.md', 'Gauntlet_v0.6.3_Rulebook.md', 'Gauntlet_v0.6.3_Reference_Guide.md',
  'Gauntlet_v0.6.3_First_Game_Guide.md', 'Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'Gauntlet_v0.6.3_Starter_Decks.json', 'Gauntlet_v0.6.3_Complete_Card_Reference.md',
  'Gauntlet_v0.6.3_Canonical_Data.json', 'Gauntlet_v0.6.3_Returning_Player_Changes.md',
  'Gauntlet_v0.6.3_Release_Notes.md', 'Gauntlet_v0.6.3_Manifest.json', 'deployment-status.json',
];
for (const file of required) assert(fs.existsSync(path.join(root, dir, file)), `Missing v0.6.3 release-candidate output: ${file}`);
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
  assert(text.includes('v0.6.3'), `${label} does not identify v0.6.3.`);
  assert(text.includes('Territor'), `${label} is missing Territory setup/play guidance.`);
  assert(!text.includes('Playable Deck'), `${label} contains retired Playable Deck terminology.`);
}
for (const token of [
  '**Version 0.6.3 — Release Candidate**', 'Release candidate — not published',
  "Capturing the Territory at the opponent's end immediately runs the Gauntlet and wins the game.",
  'separate legal movement sequence', 'Gambit/Tactic', 'inherent Bank Action', '# Part IV — Factions and Components',
]) assert(rulebook.includes(token), `Rulebook release candidate is missing: ${token}`);
for (const token of ['Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories', 'separate legal movement sequence', 'Gambit/Tactic']) {
  assert(reference.includes(token), `Reference release candidate is missing: ${token}`);
}
for (const token of ['Draw four cards, discard one face up, and keep three', 'secretly arrange your three Territories', 'There are two normal victory routes']) {
  assert(firstGame.includes(token), `First Game release candidate is missing: ${token}`);
}
for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(factionGuide.includes(faction), `Faction guide is missing ${faction}.`);
}
assert(factionGuide.includes('Release candidate — not published'));
assert(factionGuide.includes('# Part IV — Factions and Components'));
for (const title of ['Shock and Awe', 'Margin Loan', 'Second Line', "Smuggler's Run", 'Protracted Siege']) {
  assert(completeReference.includes(title), `Complete reference is missing ${title}.`);
}
assert(!completeReference.includes('## Reserves\n'));
assert(!completeReference.includes("## Smuggler's Pass\n"));

assert(starters.version === 'v0.6.3-release-candidate', `Starter catalog version is ${starters.version}.`);
assert(starters.status === 'Release candidate — finalized starter Decks; not published', 'Starter catalog must identify both finalization and the release-candidate publication boundary.');
assert(starters.decks?.length === 12, `Expected 12 starter Decks; found ${starters.decks?.length}.`);
assert(starters.purpose?.includes('competitive strength'), 'Starter catalog purpose must explicitly identify competitive strength.');
assert(starters.purpose?.includes('Further composition changes require playtest evidence.'), 'Starter catalog purpose must lock future changes behind playtest evidence.');
assert(!starters.purpose?.includes('inherited v0.6.2 compositions'), 'Starter catalog purpose must not describe the independent v0.6.3 Decks as inherited compositions.');
assert(starters.compositionSource === 'v0.6.3/data/starter-decks-candidate.js', 'Starter catalog must identify the independent v0.6.3 composition source.');
assert(starters.audit === 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md', 'Starter catalog must identify the finalization record.');
assert(starters.predecessorAudit === 'docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md', 'Starter catalog must preserve the second-pass audit as predecessor evidence.');
assert(starters.optimizationPolicy?.primary === 'competitive-strength-and-strategic-expression', 'Starter catalog must preserve the competitive optimization policy.');
assert(starters.optimizationPolicy?.teachingSimplicityTarget === false, 'Release starters must not be teaching-simplicity optimized.');
assert(starters.optimizationPolicy?.cardPoolCoverageTarget === false, 'Release starters must not be coverage optimized.');
assert(starters.optimizationPolicy?.status === 'finalized-for-v0.6.3; future changes require playtest evidence', 'Release starters must be finalized for v0.6.3 and locked behind playtest evidence.');

const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const sourceDecksById = new Map(V063_STARTER_CATALOG.decks.map((deck) => [deck.id, deck]));
const usedTitles = new Set();
for (const deck of starters.decks ?? []) {
  const sourceDeck = sourceDecksById.get(deck.id);
  assert(Boolean(sourceDeck), `${deck.name}: release Deck has no v0.6.3 source Deck.`);
  assert(JSON.stringify(deck.cards) === JSON.stringify(sourceDeck?.cards), `${deck.name}: release composition drifted from finalized source.`);
  assert(JSON.stringify(deck.territories) === JSON.stringify(sourceDeck?.territories), `${deck.name}: release Territories drifted from finalized source.`);
  const count = (deck.cards ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const value = (deck.cards ?? []).reduce((sum, item) => {
    const card = cardsByName.get(item.name);
    assert(Boolean(card), `${deck.name}: unknown v0.6.3 card ${item.name}.`);
    if (card?.unique) assert(item.quantity === 1, `${deck.name}: Unique card ${item.name} appears ${item.quantity} times.`);
    if (card) usedTitles.add(item.name);
    return sum + (card ? item.quantity * card.cost : 0);
  }, 0);
  assert(count === 30, `${deck.name}: expected 30 cards; found ${count}.`);
  assert(value === 60, `${deck.name}: expected Deckbuilding Value 60; found ${value}.`);
  assert((deck.territories ?? []).length === 3, `${deck.name}: expected three Territories.`);
  assert(new Set(deck.territories ?? []).size === 3, `${deck.name}: Territories must be different.`);
  assert(JSON.stringify(deck.recommendedTerritoryOrder) === JSON.stringify(deck.territories), `${deck.name}: recommended Territory order drifted.`);
  assert(deck.territoryOrderGuidance?.meaning === 'strategy-recommendation', `${deck.name}: Territory order is not marked as strategy guidance.`);
  assert(deck.territoryOrderGuidance?.mayRearrangeAtSetup === true, `${deck.name}: Territory order is incorrectly locked at setup.`);
  assert(deck.territoryOrderGuidance?.informedByInitiative === false, `${deck.name}: Territory order incorrectly uses initiative.`);
  let arenas = 0;
  for (const name of deck.territories ?? []) {
    const territory = territoriesByName.get(name);
    assert(Boolean(territory), `${deck.name}: unknown v0.6.3 Territory ${name}.`);
    if (territory?.arena) arenas += 1;
  }
  assert(arenas <= 1, `${deck.name}: more than one Arena.`);
}
const quantity = (deck, cardName) => deck?.cards.find((item) => item.name === cardName)?.quantity ?? 0;
const commandant = starters.decks.find((deck) => deck.name === 'Holdfast');
const witchHunter = starters.decks.find((deck) => deck.name === 'Relentless Pursuit');
assert(usedTitles.size === 110, `Expected finalized starters to represent 110 unique titles; found ${usedTitles.size}.`);
assert(quantity(commandant, 'Contingency Plan') === 1 && quantity(commandant, 'Unbroken Ranks') === 2, 'Commandant release starter must contain the finalized Contingency Plan / Unbroken Ranks split.');
assert(quantity(witchHunter, 'Contingency Plan') === 1 && quantity(witchHunter, 'Scouting Report') === 0, 'Witch Hunter release starter must contain the finalized Contingency Plan swap.');
assert(starters.decks.some((deck) => deck.name === 'Forward Doctrine' && deck.cards.some((item) => item.name === 'Shock and Awe')), 'General starter must include Shock and Awe.');
assert(starters.decks.some((deck) => deck.name === 'Hostile Expansion' && deck.cards.some((item) => item.name === 'Fealty')), 'Executive starter must retain Fealty after audit transcription correction.');

assert(manifest.version === 'v0.6.3-release-candidate');
assert(manifest.release_version === 'v0.6.3');
assert(manifest.status === 'candidate-not-published');
assert(manifest.playable_card_designs === 128);
assert(manifest.territories === 25);
assert(manifest.starter_decks === 12);
assert(manifest.publication_boundary?.published_version === 'v0.6.2');
assert(manifest.publication_boundary?.promotion_target === 'releases/v0.6.3/');
for (const field of ['public_site_cutover', 'rules_arbiter_default_cutover', 'digital_default_cutover', 'published_release_directory_materialized']) {
  assert(manifest.publication_boundary?.[field] === false, `Manifest publication boundary ${field} must be false.`);
}
assert(manifest.validation?.source_release_candidate_assembled === true);
assert(manifest.validation?.competitive_starter_baseline_integrated === true, 'Manifest must record competitive starter integration.');
assert(manifest.validation?.starter_decks_finalized_for_v063 === true, 'Manifest must record starter finalization.');
assert(manifest.validation?.future_starter_changes_require_playtest_evidence === true, 'Manifest must record the playtest-evidence gate for future starter changes.');
assert(manifest.validation?.print_package_generated === false);
assert(manifest.validation?.ready_for_publication === false);
assert(manifest.upstream_sources?.starterAudit === 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md');
assert(manifest.upstream_sources?.starterPredecessorAudit === 'docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md');
for (const file of required) assert(manifest.current_outputs?.includes(file), `Manifest current_outputs omits ${file}.`);

assert(deployment.status === 'not-published');
assert(deployment.published_version === 'v0.6.2');
assert(deployment.source_package_ready === true);
assert(deployment.print_package_ready === false);
assert(deployment.public_cutover_ready === false);
for (const token of ['pre-publication source package', 'v0.6.2', 'next gate is generation and validation of the v0.6.3 printed-material package']) {
  assert(readme.includes(token), `Release-candidate README is missing: ${token}`);
}
assert(readme.includes('finalized independent v0.6.3 competitive starter source'), 'Release README must describe the finalized starter source.');
assert(notes.includes('does **not** change the public website'));
assert(notes.includes('twelve recommended starter Decks are finalized as independent v0.6.3 competitive release baselines'), 'Release notes must record starter finalization.');
assert(notes.includes('110 of 128 playable titles'), 'Release notes must record finalized starter title representation.');
assert(notes.includes('further composition changes require playtest evidence'), 'Release notes must record the post-release playtest gate.');
assert(notes.includes('Margin Loan'));
assert(returning.includes('v0.6.2 remains the published playtest edition'));

const publishedV063Exists = fs.existsSync(path.join(root, 'releases/v0.6.3'));
assert(
  !publishedV063Exists || v063Withdrawn,
  'A v0.6.3 published package may coexist with candidate rebuilding only when the release lifecycle explicitly marks v0.6.3 withdrawn and v0.6.2 current.'
);
if (v063Withdrawn) {
  assert(publishedV063Exists, 'Withdrawn v0.6.3 lifecycle must preserve the published release package for provenance and diagnosis.');
}

finish();

function finish() {
  if (failures.length) {
    console.error('v0.6.3 source release-candidate validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`v0.6.3 source release-candidate validation passed: 128 cards, 25 Territories, 12 finalized competitive 30/60 starter Decks using 110 titles, synchronized player-facing sources, and no public cutover${v063Withdrawn ? '; preserved published package is explicitly withdrawn' : ''}.`);
}
