import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const fail = (m) => { console.error(`v0.6.3 published-release validation failed: ${m}`); process.exit(1); };
const assert = (c, m) => { if (!c) fail(m); };
const releaseDir = 'releases/v0.6.3';

for (const file of [
  `${releaseDir}/README.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Rulebook.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Reference_Guide.md`,
  `${releaseDir}/Gauntlet_v0.6.3_First_Game_Guide.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Complete_Card_Reference.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Canonical_Data.json`,
  `${releaseDir}/Gauntlet_v0.6.3_Starter_Decks.json`,
  `${releaseDir}/Gauntlet_v0.6.3_Returning_Player_Changes.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Release_Notes.md`,
  `${releaseDir}/Gauntlet_v0.6.3_Manifest.json`,
  `${releaseDir}/Gauntlet_v0.6.3_Print_Manifest.json`,
  `${releaseDir}/deployment-status.json`,
  'v0.6.3/index.html',
  'v0.6.3/print/index.html',
  'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data.json',
  'v0.6.3/data/starter-decks.js',
  'deckbuilder/index.html',
  'deckbuilder/v061-runtime.js',
  'deckbuilder/starter-decks.json',
  'card-reference/index.html',
  'card-reference/app.js',
  'rules-assistant/v063-published-corpus.js',
  'rules-assistant/worker-v063.js',
  'rules-assistant/widget.js',
  'rules-assistant/worker-entry.js',
  'src/content/current.ts',
]) assert(exists(file), `missing ${file}`);

const manifest = json(`${releaseDir}/Gauntlet_v0.6.3_Manifest.json`);
const deployment = json(`${releaseDir}/deployment-status.json`);
const closeout = json('artifacts/v0.6.3/closeout/Gauntlet_v0.6.3_Closeout_Manifest.json');
const canonical = json(`${releaseDir}/Gauntlet_v0.6.3_Canonical_Data.json`);
const browserCanonical = json('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data.json');
const starters = json(`${releaseDir}/Gauntlet_v0.6.3_Starter_Decks.json`);
const printManifest = json(`${releaseDir}/Gauntlet_v0.6.3_Print_Manifest.json`);

assert(manifest.version === 'v0.6.3' && manifest.status === 'published', 'manifest is not published v0.6.3');
assert(manifest.published_date === '2026-08-12', 'publication date is wrong');
assert(Object.values(manifest.public_defaults || {}).every((v) => v === 'v0.6.3'), 'public defaults are mixed');
assert(manifest.closeout?.status === 'validated', 'published manifest does not carry the green closeout');
assert(manifest.closeout?.source_package_fingerprint?.digest === closeout.freshness?.source_package?.digest, 'source closeout provenance mismatch');
assert(manifest.closeout?.print_semantics_fingerprint?.digest === closeout.freshness?.print_semantics?.digest, 'print closeout provenance mismatch');
const trackedProvenance = manifest.closeout?.tracked_candidate_surfaces_fingerprint;
assert(trackedProvenance?.algorithm === 'sha256' && trackedProvenance?.files === 79 && /^[a-f0-9]{64}$/.test(trackedProvenance?.digest || ''), 'published manifest lost the immutable pre-publication tracked-surface fingerprint');
assert(deployment.canonical_public_version === 'v0.6.3' && deployment.status === 'published', 'deployment status is not v0.6.3');
assert(Object.values(deployment.public_defaults || {}).every((v) => v === 'v0.6.3'), 'deployment public defaults are mixed');

assert(canonical.version === 'v0.6.3' && canonical.status === 'Published playtest edition', 'canonical JSON retains candidate identity');
assert(canonical.cards?.length === 128, `expected 128 cards, found ${canonical.cards?.length}`);
assert(canonical.territories?.length === 25, `expected 25 Territories, found ${canonical.territories?.length}`);
assert(canonical.proposals?.length === 9, `expected 9 Proposals, found ${canonical.proposals?.length}`);
assert(JSON.stringify(browserCanonical) === JSON.stringify(canonical), 'browser canonical JSON differs from immutable release canonical JSON');
assert(canonical.deck_construction?.opening_draw === 4 && canonical.deck_construction?.opening_discard === 1 && canonical.deck_construction?.opening_hand === 3, 'opening 4 / discard 1 / keep 3 changed');
assert(canonical.deck_construction?.territory_arrangement_after_opening_selection === true, 'Territory arrangement is not after opening selection');
assert(canonical.battlefield?.last_stand?.final_territory_capture_required === false, 'Last Stand incorrectly requires final-Territory capture');
assert(canonical.battlefield?.last_stand?.final_territory_control_required === false, 'Last Stand incorrectly requires final-Territory control');
assert(String(canonical.battlefield?.victory || '').includes("capturing the Territory at the opponent's end"), 'final-Territory victory route missing');
assert(String(canonical.battlefield?.victory || '').includes('Last Stand'), 'Last Stand victory route missing');
assert(canonical.cards.find((c) => c.id === 'neutral-reserves')?.name === 'Second Line', 'neutral-reserves is not Second Line');
assert(canonical.territories.find((t) => t.id === 'territory-smuggler-s-pass')?.name === "Smuggler's Run", "territory-smuggler-s-pass is not Smuggler's Run");
const marginText = JSON.stringify(canonical.cards.find((c) => c.id === 'financiers-margin-loan'));
assert(marginText.includes('While this remains banked, you may not draw at the start of your turn.'), 'Margin Loan persistent draw restriction is missing');
assert(!marginText.includes('After income on your next turn'), 'Margin Loan retains retired next-turn-only settlement');

assert(starters.version === 'v0.6.3' && starters.status === 'published', 'starter catalog is not published v0.6.3');
assert(Array.isArray(starters.decks) && starters.decks.length === 12, 'expected 12 published starter Decks');
for (const deck of starters.decks) {
  assert(deck.cardCount === 30, `${deck.name} is not 30 cards`);
  assert(deck.deckbuildingValue === 60, `${deck.name} is not 60 value`);
}

assert(Array.isArray(printManifest.outputs) && printManifest.outputs.length === 11, 'published print manifest does not contain 11 outputs');
for (const output of printManifest.outputs) {
  const published = path.join(root, releaseDir, output.file);
  const candidate = path.join(root, 'artifacts/v0.6.3/print-candidate/pdf', output.file);
  assert(fs.existsSync(published), `missing published PDF ${output.file}`);
  assert(fs.readFileSync(published).equals(fs.readFileSync(candidate)), `${output.file} differs from validated print candidate`);
}
const pages = Object.fromEntries(printManifest.outputs.map((o) => [o.key, o.pages]));
assert(pages.rulebook === 46 && pages.reference === 4 && pages.player_mat === 1 && pages.playtest_sheet === 2 && pages.faction_cards === 3 && pages.active_marker === 1 && pages.tableside_pack === 22, 'key print page counts changed');
const printIndex = read('v0.6.3/print/index.html');
for (const icon of ['/favicon-32.png?v=20260804-1', '/favicon.ico?v=20260804-1', '/apple-touch-icon.png?v=20260804-1']) assert(printIndex.includes(icon), `published print index is missing ${icon}`);
assert(printIndex.includes('G-8YYYZJGGPE'), 'published print index is missing the Google Analytics tag');

for (const file of ['v0.6.3/index.html','v0.6.3/start/index.html','v0.6.3/rulebook/index.html','v0.6.3/quick-reference/index.html','v0.6.3/changes/index.html','v0.6.3/deckbuilder/index.html','v0.6.3/reference/index.html','v0.6.3/rules-arbiter/index.html']) {
  const t = read(file);
  assert(!t.includes('noindex,nofollow'), `${file} remains noindex`);
  assert(!t.includes('v0.6.2 remains canonical') && !t.includes('v0.6.2 remains the canonical published playtest edition'), `${file} still calls v0.6.2 current`);
}
const home = read('index.html');
assert(home.includes('Current canonical playtest edition · v0.6.3'), 'homepage does not identify v0.6.3');
for (const href of ['v0.6.3/start/','v0.6.3/deckbuilder/','v0.6.3/rulebook/','v0.6.3/reference/','releases/v0.6.3/']) assert(home.includes(href), `homepage is missing ${href}`);
assert(home.includes('canonical v0.6.3 sources'), 'homepage Rules Arbiter description is not v0.6.3');
assert(home.includes('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md'), 'homepage Rulebook source is not immutable v0.6.3');
assert(!home.includes('releases/v0.6.3/Gauntlet_v0.6.2_'), 'homepage contains a mixed-version release link');
assert(home.includes("Capture the opponent's final Territory to win immediately") && home.includes('win their Last Stand'), 'homepage does not state both normal victory routes');
for (const faction of ['military','diplomats','financiers','intelligence','mystics','inquisition']) {
  const h = read(`factions/${faction}/index.html`);
  assert(h.includes('· v0.6.3 faction guide') && h.includes('href="../../v0.6.3/rulebook/"') && h.includes('Current playtest edition: v0.6.3.'), `${faction} overview is not cut over to v0.6.3`);
}

const polishedDeckIndex = read('deckbuilder/index.html');
const polishedDeckRuntime = read('deckbuilder/v061-runtime.js');
const polishedStarters = json('deckbuilder/starter-decks.json');
const versionedDeckHandoff = read('v0.6.3/deckbuilder/index.html');
assert(polishedDeckIndex.includes('builder-grid') && polishedDeckIndex.includes('card-preview') && polishedDeckIndex.includes('territory-browser'), 'current Deckbuilder no longer uses the established polished production UI');
assert(polishedDeckRuntime.includes('const VERSION = "v0.6.3"') && polishedDeckRuntime.includes('releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json'), 'polished Deckbuilder is not wired to published v0.6.3 canonical data');
assert(polishedDeckRuntime.includes('data.gameVersion = VERSION'), 'polished Deckbuilder exports do not identify v0.6.3');
assert(polishedStarters.version === 'v0.6.3' && polishedStarters.decks?.length === 12, 'polished Deckbuilder does not use the 12 published v0.6.3 starters');
assert(versionedDeckHandoff.includes('https://gauntlet.run/deckbuilder/') && versionedDeckHandoff.includes("location.replace('/deckbuilder/'"), 'versioned v0.6.3 Deckbuilder does not hand off to the polished current tool');

const polishedReferenceIndex = read('card-reference/index.html');
const polishedReferenceApp = read('card-reference/app.js');
const versionedReferenceHandoff = read('v0.6.3/reference/index.html');
assert(polishedReferenceIndex.includes('reference-browser') && polishedReferenceIndex.includes('reference-preview') && polishedReferenceIndex.includes('filter-panel'), 'current Card Reference no longer uses the established polished production UI');
assert(polishedReferenceApp.includes('releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json') && polishedReferenceApp.includes('data.version !== "v0.6.3"'), 'polished Card Reference is not wired to published v0.6.3 canonical data');
assert(versionedReferenceHandoff.includes('https://gauntlet.run/card-reference/') && versionedReferenceHandoff.includes("location.replace('/card-reference/'"), 'versioned v0.6.3 Card Reference does not hand off to the polished current tool');
for (const file of ['v0.6.3/deckbuilder/index.html', 'v0.6.3/reference/index.html']) {
  const t = read(file);
  for (const icon of ['/favicon-32.png?v=20260804-1', '/favicon.ico?v=20260804-1', '/apple-touch-icon.png?v=20260804-1']) assert(t.includes(icon), `${file} is missing ${icon}`);
}

const widget = read('rules-assistant/widget.js');
assert(widget.includes('v063-published-corpus.js') && widget.includes('version: "v0.6.3"'), 'public Rules Arbiter widget is not v0.6.3');
const entry = read('rules-assistant/worker-entry.js');
assert(entry.includes('import publishedWorker from "./worker-v062.js";'), 'historical v0.6.2 worker alias is not preserved');
assert(entry.includes('import currentPublishedWorker from "./worker-v063.js";'), 'current v0.6.3 worker is not imported');
assert(entry.includes('return publishedWorker.fetch(request, env, context)'), 'explicit historical v0.6.2 route is not preserved');
assert(entry.includes('return currentPublishedWorker.fetch(request, env, context)'), 'public v0.6.3 route does not reach the current worker');
assert(entry.includes('/api/v063/rules') && entry.includes('/api/v063-candidate/') && entry.includes('/api/v061/rules'), 'versioned Rules Arbiter routes are incomplete');
const worker = read('rules-assistant/worker-v063.js');
assert(worker.includes('service: "gauntlet-rules-assistant"'), 'v0.6.3 worker breaks the stable service identity');
assert(worker.includes('candidate: false') && worker.includes('publishedVersion: "v0.6.3"') && worker.includes('loadPublishedV063RulesCorpus'), 'v0.6.3 worker is not published-corpus mode');
assert(read('rules-assistant/v063-published-corpus.js').includes('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md'), 'published corpus does not cite immutable v0.6.3 sources');
const arbiter = read('v0.6.3/rules-arbiter/app.js');
assert(arbiter.includes('loadPublishedV063RulesCorpus') && arbiter.includes('candidate: false'), 'standalone Rules Arbiter is not published v0.6.3');
const current = read('src/content/current.ts');
assert(current.includes("export * from './v063';") && current.includes("CURRENT_RULES_VERSION = 'v0.6.3'"), 'digital current pointer is not v0.6.3');
assert(exists('releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json') && exists('v0.6.2/index.html'), 'historical v0.6.2 release was removed');
const pkg = json('package.json');
assert(String(pkg.scripts?.['release:v063:build'] || '').includes('build-v063-published-release.mjs'), 'release:v063:build is missing');
assert(String(pkg.scripts?.['release:v063:check'] || '').includes('validate-v063-published-release.mjs'), 'release:v063:check is missing');
assert(String(pkg.scripts?.test || '').includes('validate-v063-published-release.mjs'), 'main test chain does not validate published v0.6.3');

console.log('Published Gauntlet v0.6.3 validation passed: immutable release package, 128 cards, 25 Territories, 9 Proposals, 12 finalized starters, 11 print PDFs, polished current browser tools, public Rules Arbiter, and digital defaults are synchronized on v0.6.3 while historical v0.6.2 remains preserved.');
