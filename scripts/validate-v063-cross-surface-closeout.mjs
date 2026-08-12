import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const lifecycle = readJson('config/release-lifecycle.json');
const v063Withdrawn = lifecycle.current_release === 'v0.6.2' &&
  lifecycle.releases?.['v0.6.3']?.status === 'withdrawn' &&
  lifecycle.releases?.['v0.6.3']?.artifacts_preserved === true &&
  lifecycle.releases?.['v0.6.3']?.public_cutover === false;

const componentValidators = [
  'scripts/validate-v063-finalized-tracker.mjs',
  'scripts/validate-v063-player-facing-candidates.mjs',
  'scripts/validate-v063-canonical-data-candidate.mjs',
  'scripts/validate-v063-canonical-promotion-boundary.mjs',
  'scripts/validate-v063-browser-development.mjs',
  'scripts/validate-v063-browser-site-conventions.mjs',
  'scripts/validate-v063-starter-guidance.mjs',
  'scripts/validate-v063-rules-arbiter-candidate.mjs',
  'scripts/validate-v063-digital-candidate.mjs',
  'scripts/validate-v063-release-candidate.mjs',
  'scripts/validate-v063-print-candidate.mjs',
  'scripts/validate-v063-print-visual-regressions.mjs',
];

for (const validator of componentValidators) {
  execFileSync(process.execPath, [validator], { cwd: root, stdio: 'inherit', env: process.env });
}
execFileSync(process.execPath, ['scripts/build-v063-cross-surface-closeout.mjs', '--check'], { cwd: root, stdio: 'inherit', env: process.env });

const matrix = read('docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md');
const scenarioIds = [...matrix.matchAll(/\bCS-(\d{3})\b/g)].map((match) => match[0]);
const uniqueScenarioIds = new Set(scenarioIds);
assert.equal(uniqueScenarioIds.size, 60, `Expected 60 unique closeout scenarios; found ${uniqueScenarioIds.size}.`);
for (let index = 1; index <= 60; index += 1) {
  const id = `CS-${String(index).padStart(3, '0')}`;
  assert(uniqueScenarioIds.has(id), `Closeout matrix is missing ${id}.`);
}

const integrated = readJson('artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const browser = readJson('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const release = readJson('artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json');
assert.deepEqual(browser, integrated, 'Browser canonical data drifted from the integrated v0.6.3 candidate.');
assert.deepEqual(release, integrated, 'Source release canonical data drifted from the integrated v0.6.3 candidate.');
assert.equal(integrated.version, 'v0.6.3-candidate');
assert.equal(integrated.cards?.length, 128);
assert.equal(integrated.territories?.length, 25);
assert.equal(integrated.factions?.length, 6);
assert.equal((integrated.factions ?? []).reduce((sum, faction) => sum + (faction.leaders?.length ?? 0), 0), 12);
assert.equal(integrated.proposals?.length, 9);

assert.equal(integrated.deck_construction?.opening_draw, 4);
assert.equal(integrated.deck_construction?.opening_discard, 1);
assert.equal(integrated.deck_construction?.opening_hand, 3);
assert.equal(integrated.deck_construction?.territory_arrangement_after_opening_selection, true);
assert.equal(integrated.deck_construction?.first_player_after_territory_arrangement, true);
assert.equal(integrated.battlefield?.last_stand?.final_territory_control_required, false);
assert.equal(integrated.battlefield?.last_stand?.final_territory_capture_required, false);
assert.equal(integrated.battlefield?.last_stand?.separate_movement_sequence_required, true);

const secondLine = integrated.cards.find((card) => card.id === 'neutral-reserves');
assert.equal(secondLine?.name, 'Second Line');
const smugglersRun = integrated.territories.find((territory) => territory.id === 'territory-smuggler-s-pass');
assert.equal(smugglersRun?.name, "Smuggler's Run");
const marginLoan = integrated.cards.find((card) => card.id === 'financiers-margin-loan');
assert((marginLoan?.effects ?? []).some((effect) => effect.label === 'Asset' && effect.text.includes('While this remains banked, you may not draw at the start of your turn.')), 'Margin Loan persistent draw restriction drifted.');

const armistice = integrated.cards.find((card) => card.id === 'neutral-armistice');
assert.equal(armistice?.cost, 4);
assert.equal(armistice?.effects?.find((effect) => effect.label === 'Asset')?.text, 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.');
const contingencyPlan = integrated.cards.find((card) => card.id === 'neutral-contingency-plan');
assert.equal(contingencyPlan?.cost, 1);
assert.equal(contingencyPlan?.effects?.find((effect) => effect.label === 'Asset')?.text, 'If this card is Removed, +1 Card.');
assert.equal(contingencyPlan?.effects?.find((effect) => effect.label === 'Gambit/Tactic')?.text, 'If your opponent controls more Territories than you, +2 Battle Total.');
const manifestDestiny = integrated.cards.find((card) => card.id === 'neutral-manifest-destiny');
assert.equal(manifestDestiny?.cost, 5);
assert(manifestDestiny?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.'), 'Manifest Destiny normal-Deed rule drifted.');

const protractedSiege = integrated.cards.find((card) => card.name === 'Protracted Siege');
assert(protractedSiege, 'Protracted Siege is missing from the final candidate.');

const sourceManifest = readJson('artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Manifest.json');
const sourceDeployment = readJson('artifacts/v0.6.3/release-candidate/deployment-status.json');
const starterCatalog = readJson('artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Starter_Decks.json');
const printManifest = readJson('artifacts/v0.6.3/print-candidate/Gauntlet_v0.6.3_Print_Manifest.json');
const closeoutManifest = readJson('artifacts/v0.6.3/closeout/Gauntlet_v0.6.3_Closeout_Manifest.json');

assert.equal(sourceManifest.release_version, 'v0.6.3');
assert.equal(sourceManifest.status, 'candidate-not-published');
assert.equal(sourceManifest.playable_card_designs, 128);
assert.equal(sourceManifest.territories, 25);
assert.equal(sourceManifest.proposals, 9);
assert.equal(sourceManifest.factions, 6);
assert.equal(sourceManifest.leaders, 12);
assert.equal(sourceManifest.starter_decks, 12);
assert.equal(sourceManifest.validation?.starter_decks_finalized_for_v063, true);
assert.equal(sourceManifest.validation?.future_starter_changes_require_playtest_evidence, true);
assert.equal(sourceDeployment.source_package_ready, true);
assert.equal(sourceDeployment.published_version, 'v0.6.2');

assert.equal(starterCatalog.decks?.length, 12);
const canonicalCardsByName = new Map(integrated.cards.map((card) => [card.name, card]));
const usedTitles = new Set();
for (const deck of starterCatalog.decks ?? []) {
  for (const item of deck.cards ?? []) {
    assert(canonicalCardsByName.has(item.name), `${deck.name}: starter card ${item.name} is not in canonical v0.6.3.`);
    usedTitles.add(item.name);
  }
}
assert.equal(usedTitles.size, 110, 'Finalized starter Decks must represent the locked 110-title baseline.');
const starterQuantity = (deckName, cardName) => starterCatalog.decks.find((deck) => deck.name === deckName)?.cards.find((item) => item.name === cardName)?.quantity ?? 0;
assert.equal(starterQuantity('Holdfast', 'Contingency Plan'), 1);
assert.equal(starterQuantity('Holdfast', 'Unbroken Ranks'), 2);
assert.equal(starterQuantity('Relentless Pursuit', 'Contingency Plan'), 1);
assert.equal(starterQuantity('Relentless Pursuit', 'Scouting Report'), 0);

assert.equal(printManifest.release_version, 'v0.6.3');
assert.equal(printManifest.status, 'candidate-not-published');
assert.equal(printManifest.source_package, 'artifacts/v0.6.3/release-candidate');
assert.equal(printManifest.outputs?.length, 11);
const printByKey = new Map((printManifest.outputs ?? []).map((item) => [item.key, item]));
for (const [key, pages] of Object.entries({ reference: 4, player_mat: 1, playtest_sheet: 2, faction_cards: 3, active_marker: 1, tableside_pack: 22 })) {
  assert.equal(printByKey.get(key)?.pages, pages, `Unexpected print page count for ${key}.`);
}

assert.equal(closeoutManifest.version, 'v0.6.3-closeout-candidate');
assert.equal(closeoutManifest.release_version, 'v0.6.3');
assert.equal(closeoutManifest.previous_version, 'v0.6.2');
assert.equal(closeoutManifest.status, 'candidate-not-published');
assert.equal(closeoutManifest.stage_readiness?.source_package_ready, true);
assert.equal(closeoutManifest.stage_readiness?.print_package_ready, true);
assert.equal(closeoutManifest.stage_readiness?.cross_surface_gate, 'validated');
for (const key of ['source_package', 'print_semantics', 'tracked_candidate_surfaces']) {
  assert.equal(closeoutManifest.freshness?.[key]?.algorithm, 'sha256', `Closeout freshness ${key} must use SHA-256.`);
  assert.match(closeoutManifest.freshness?.[key]?.digest ?? '', /^[a-f0-9]{64}$/, `Closeout freshness ${key} is missing a valid digest.`);
  assert((closeoutManifest.freshness?.[key]?.files ?? 0) > 0, `Closeout freshness ${key} must cover at least one file.`);
}
assert.equal(closeoutManifest.freshness?.pdf_bytes_intentionally_excluded, true);
assert.equal(closeoutManifest.counts?.playable_cards, 128);
assert.equal(closeoutManifest.counts?.territories, 25);
assert.equal(closeoutManifest.counts?.starter_decks, 12);
assert.equal(closeoutManifest.counts?.print_pdfs, 11);
assert.equal(closeoutManifest.publication_boundary?.published_version, 'v0.6.2');
assert.equal(closeoutManifest.publication_boundary?.releases_v063_materialized, false);
assert.equal(closeoutManifest.publication_boundary?.root_site_cutover, false);
assert.equal(closeoutManifest.publication_boundary?.rules_arbiter_default_cutover, false);
assert.equal(closeoutManifest.publication_boundary?.digital_default_cutover, false);
assert.equal(closeoutManifest.next_gate_after_green_closeout, 'v0.6.3 publication/cutover');

const rootSite = read('index.html');
assert(rootSite.includes('Current canonical playtest edition · v0.6.2'), 'Root site no longer identifies v0.6.2 as canonical before cutover.');
assert(rootSite.includes('href="v0.6.2/start/"'), 'Root start link no longer points to v0.6.2 before cutover.');
assert(rootSite.includes('href="v0.6.2/rulebook/"'), 'Root rules link no longer points to v0.6.2 before cutover.');

const currentContent = read('src/content/current.ts');
assert(currentContent.includes("export * from './v062';"), 'Digital current content no longer exports v0.6.2 before cutover.');
assert(currentContent.includes("CURRENT_RULES_VERSION = 'v0.6.2'"), 'Digital current rules version is not v0.6.2 before cutover.');

const publicWidget = read('rules-assistant/widget.js');
const publicWorkerEntry = read('rules-assistant/worker-entry.js');
assert(publicWidget.includes('version: "v0.6.2"'), 'Public Rules Arbiter widget is not v0.6.2 before cutover.');
assert(publicWorkerEntry.includes('./worker-v062.js'), 'Public Rules Arbiter worker entry is not routed to v0.6.2 before cutover.');
assert(!publicWorkerEntry.includes('v063'), 'Public Rules Arbiter worker entry routes to v0.6.3 before cutover.');

const publishedV063Exists = fs.existsSync(path.join(root, 'releases/v0.6.3'));
assert(
  !publishedV063Exists || v063Withdrawn,
  'Closeout may coexist with releases/v0.6.3/ only when the lifecycle explicitly marks v0.6.3 withdrawn and v0.6.2 current.'
);
if (v063Withdrawn) {
  assert(publishedV063Exists, 'Withdrawn v0.6.3 lifecycle must preserve releases/v0.6.3/ for provenance and diagnosis.');
}

if (process.env.GITHUB_BASE_REF) {
  const changed = execFileSync('git', ['diff', '--name-only', `origin/${process.env.GITHUB_BASE_REF}...HEAD`], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const protectedV062 = changed.filter((file) =>
    file.startsWith('releases/v0.6.2/') ||
    file.startsWith('v0.6.2/') ||
    ['rules-assistant/worker-v062.js', 'rules-assistant/v062-published-corpus.js'].includes(file)
  );
  assert.deepEqual(protectedV062, [], `Closeout changed protected v0.6.2 release/implementation files: ${protectedV062.join(', ')}`);

  if (!v063Withdrawn) {
    const currentSurfaceChanges = changed.filter((file) =>
      ['index.html', 'rules-assistant/widget.js', 'rules-assistant/worker-entry.js', 'src/content/current.ts'].includes(file)
    );
    assert.deepEqual(currentSurfaceChanges, [], `Closeout crossed the current/publication boundary: ${currentSurfaceChanges.join(', ')}`);
  }
}

console.log(`v0.6.3 cross-surface closeout passed: 60 scenarios, exact canonical equality across integrated/browser/release data, late card corrections and finalized 110-title starter baseline locked, tracked freshness fingerprints verified, fresh PDFs validated, and every public default still on v0.6.2${v063Withdrawn ? '; preserved v0.6.3 package is explicitly withdrawn' : ''}.`);
