import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const json = JSON.parse(read('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
const sourceJson = JSON.parse(read('artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert.deepEqual(json, sourceJson, 'Browser candidate JSON must exactly equal the integrated canonical-data candidate');
assert.equal(json.version, 'v0.6.3-candidate');
assert.equal(json.cards.length, 128);
assert.equal(json.territories.length, 25);
assert.equal(json.normalization.canonical_data_integration.published_release, false);

const pages = {
  home: read('v0.6.3/index.html'),
  rulebook: read('v0.6.3/rulebook/index.html'),
  start: read('v0.6.3/start/index.html'),
  quick: read('v0.6.3/quick-reference/index.html'),
  changes: read('v0.6.3/changes/index.html'),
  reference: read('v0.6.3/reference/index.html'),
  deckbuilder: read('v0.6.3/deckbuilder/index.html'),
};

for (const [name, html] of Object.entries(pages)) {
  assert(/v0\.6\.3/i.test(html), `${name} is not labeled v0.6.3`);
  assert(/v0\.6\.2 remains (?:the )?canonical/i.test(html), `${name} does not preserve the v0.6.2 publication boundary`);
  assert(html.includes('noindex'), `${name} must remain noindex while v0.6.3 is unpublished`);
  assert(!html.includes('/rules-assistant/widget.js'), `${name} must not embed the v0.6.2 Rules Arbiter on a v0.6.3 development page`);
}

for (const [name, html] of Object.entries(pages)) {
  assert(!html.includes('href="/v0.6.3/'), `${name} contains a root-relative v0.6.3 internal link`);
  assert(!html.includes('href="/v0.6.2/'), `${name} contains a root-relative v0.6.2 internal link`);
}
for (const marker of [
  'href="../"', 'href="./"', 'href="start/"', 'href="rulebook/"', 'href="quick-reference/"',
  'href="deckbuilder/"', 'href="reference/"', 'href="changes/"', 'href="../v0.6.2/"',
  'href="data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json"', 'href="styles.css"',
]) assert(pages.home.includes(marker), `v0.6.3 home is missing relative navigation marker: ${marker}`);

for (const [name, html] of Object.entries({ rulebook: pages.rulebook, start: pages.start, quick: pages.quick, changes: pages.changes })) {
  for (const marker of [
    'href="../../"', 'href="../"', 'href="../start/"', 'href="../rulebook/"', 'href="../quick-reference/"',
    'href="../deckbuilder/"', 'href="../reference/"', 'href="../changes/"', 'href="../../v0.6.2/"', 'href="../styles.css"',
  ]) assert(html.includes(marker), `${name} is missing relative navigation marker: ${marker}`);
}

for (const marker of [
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards',
  "DON'T FORGET THE BOARD", 'Gambit/Tactic', 'inherent <strong>Bank</strong> Action',
  'inherited v0.6.2 faction/component baseline, with duplicated card excerpts synchronized to the final v0.6.3 card candidate',
  'governing v0.6.3 source documents control candidate changes; v0.6.2 remains authoritative for published play',
  'Territory text remains inherited from v0.6.2 unless a v0.6.3 source expressly replaces it',
]) assert(pages.rulebook.includes(marker), `Rulebook browser surface missing: ${marker}`);
assert(!pages.rulebook.includes('<hr>\n<hr>'));

for (const marker of [
  'Draw four cards, discard one face up, and keep three',
  'Before you commit cards to a battle, look beyond your Hand.',
  'There are two normal victory routes',
]) assert(pages.start.includes(marker), `Start browser surface missing: ${marker}`);

assert(pages.reference.includes('Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories'));
assert(pages.reference.includes('separate legal movement sequence'));
assert(pages.reference.includes('v0.6.3 development candidate'));
assert(pages.deckbuilder.includes('Choose three; decide their setup order after opening selection'));
assert(pages.deckbuilder.includes('Selected Territories'));
assert(pages.deckbuilder.includes('strategy guidance, not a setup lock'));
assert(pages.deckbuilder.includes('After opening selection, you may keep the recommendation or rearrange the three Territories.'));
assert(pages.deckbuilder.includes('Load recommended starter'));
assert(pages.deckbuilder.includes('load a recommended v0.6.3 starter'));
assert(pages.deckbuilder.includes('<ul id="selectedTerritories"></ul>'));
assert(!pages.deckbuilder.includes('Load inherited starter'));
assert(!pages.deckbuilder.includes('load an inherited starter list'));
assert(!pages.deckbuilder.includes('<ol id="selectedTerritories">'));

const referenceApp = read('v0.6.3/reference/app.js');
assert(referenceApp.includes('../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert(referenceApp.includes('const VERSION = "v0.6.3-candidate";'));
assert(referenceApp.includes('final_territory_capture_required!==false'));
assert(referenceApp.includes('state.data.cards'));

const deckApp = read('v0.6.3/deckbuilder/app.js');
assert(deckApp.includes("import { V063_STARTER_CATALOG } from './starter-adapter.js';"));
assert(deckApp.includes('../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert(deckApp.includes('const V063_VERSION = "v0.6.3-candidate";'));
assert(deckApp.includes('state.starters = V063_STARTER_CATALOG.decks ?? [];'));
assert(deckApp.includes('Recommended v0.6.3 competitive starter'));
assert(deckApp.includes('Strategy:'));
assert(deckApp.includes('Recommended Territory order (own end → opponent end):'));
assert(deckApp.includes('keep this order or rearrange these three Territories'));
assert(deckApp.includes('No recommended v0.6.3 starter matches this faction and Leader.'));
assert(deckApp.includes('Candidate load failed.'));
assert(deckApp.includes('Candidate valid'));
assert(deckApp.includes('Legal v0.6.3 candidate Deck.'));
assert(!deckApp.includes('../../releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json'));
assert(!deckApp.includes('Inherited v0.6.2 starter list'));
assert(!deckApp.includes('Inherited strategy note:'));
assert(!deckApp.includes('gauntlet-v062-deckbuilder'));
assert(!deckApp.includes('${selectedIndex >= 0 ? ` · ${selectedIndex + 1}` : ""}'));

const starterSource = read('v0.6.3/data/starter-decks-candidate.js');
assert(starterSource.includes("primary: 'competitive-strength-and-strategic-expression'"));
assert(starterSource.includes('teachingSimplicityTarget: false'));
assert(starterSource.includes('cardPoolCoverageTarget: false'));
assert(starterSource.includes("['Shock and Awe', 1]"));
assert(starterSource.includes("['Corner the Market', 1]"));
assert(starterSource.includes("['Fealty', 1], ['Forced March', 3]"), 'Executive Fealty correction must survive browser source regeneration');

for (const text of [pages.rulebook, pages.start, pages.quick, pages.reference, referenceApp]) {
  assert(!text.includes('Playable Deck'));
  assert(!text.includes('**Battle:**'));
  assert(!text.includes('Each player draws three cards.'));
  assert(!text.includes('place your token just before your end'));
}

assert(pages.home.includes('Rules Arbiter remains on the published v0.6.2 corpus'));
assert(pages.home.includes('128 playable cards'));
assert(pages.home.includes('25 Territories inherited from v0.6.2'));
assert(pages.home.includes('without changing the published v0.6.2 release'));

console.log('v0.6.3 development browser surfaces validated: integrated unpublished candidate data, competitive v0.6.3 starter source, strategic Territory-order guidance, current rules/setup/victory, repository-safe relative navigation, publication boundary, and no stale Rules Arbiter embed.');
