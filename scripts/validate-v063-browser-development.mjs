import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const json = JSON.parse(read('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
const sourceJson = JSON.parse(read('artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert.deepEqual(json, sourceJson, 'Browser candidate JSON must exactly equal the integrated canonical-data candidate');
assert.equal(json.version, 'v0.6.3-candidate');
assert.equal(json.cards.length, 128);
assert.equal(json.territories.length, 25);

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

for (const marker of [
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards',
  "DON'T FORGET THE BOARD",
  'Gambit/Tactic',
  'inherent <strong>Bank</strong> Action',
]) assert(pages.rulebook.includes(marker), `Rulebook browser surface missing: ${marker}`);

for (const marker of [
  'Draw four cards, discard one face up, and keep three',
  'Before you commit cards to a battle, look beyond your Hand.',
  'There are two normal victory routes',
]) assert(pages.start.includes(marker), `Start browser surface missing: ${marker}`);

assert(pages.reference.includes('Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories'));
assert(pages.reference.includes('separate legal movement sequence'));
assert(pages.deckbuilder.includes('Choose three; arrange after opening selection'));
assert(pages.deckbuilder.includes('Selected Territories'));
assert(pages.deckbuilder.includes('selection order here is not their setup order'));
assert(pages.deckbuilder.includes('Load inherited starter'));
assert(pages.deckbuilder.includes('load an inherited starter list'));
assert(pages.deckbuilder.includes('<ul id="selectedTerritories"></ul>'));
assert(!pages.deckbuilder.includes('Territories, own end outward'));
assert(!pages.deckbuilder.includes('Load approved starter'));
assert(!pages.deckbuilder.includes('load the approved starter'));
assert(!pages.deckbuilder.includes('<ol id="selectedTerritories">'));

const referenceApp = read('v0.6.3/reference/app.js');
assert(referenceApp.includes('../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert(referenceApp.includes('v0.6.3-candidate'));
assert(referenceApp.includes('final_territory_capture_required!==false'));
assert(referenceApp.includes('state.data.cards'));

const deckApp = read('v0.6.3/deckbuilder/app.js');
assert(deckApp.includes('../data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert(deckApp.includes('../../releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json'), 'Deckbuilder must explicitly inherit the v0.6.2 starter lists until their own propagation pass');
assert(deckApp.includes('Inherited v0.6.2 starter list'));
assert(deckApp.includes('Inherited strategy note:'));
assert(deckApp.includes('Arrange these three after opening selection.'));
assert(deckApp.includes('No inherited starter matches this faction and Leader.'));
assert(deckApp.includes('Candidate load failed.'));
assert(deckApp.includes('Candidate valid'));
assert(deckApp.includes('Legal v0.6.3 candidate Deck.'));
assert(!deckApp.includes('Approved v0.6.2 starter'));
assert(!deckApp.includes('No approved starter matches'));
assert(!deckApp.includes('Legal v0.6.2 Deck.'));
assert(!deckApp.includes('gauntlet-v062-deckbuilder'));
assert(!deckApp.includes('${selectedIndex >= 0 ? ` · ${selectedIndex + 1}` : ""}'), 'Territory selection UI must not imply a setup order');

for (const text of [pages.rulebook, pages.start, pages.quick, pages.reference, referenceApp]) {
  assert(!text.includes('Playable Deck'), 'Active v0.6.3 browser rules/reference surface uses retired Playable Deck terminology');
  assert(!text.includes('**Battle:**'), 'Active v0.6.3 browser surface uses retired Battle card heading');
  assert(!text.includes('Each player draws three cards.'), 'Active v0.6.3 browser surface uses obsolete opening draw');
  assert(!text.includes('place your token just before your end'), 'Active v0.6.3 browser surface uses obsolete starting position');
}

assert(pages.home.includes('Rules Arbiter remains on the published v0.6.2 corpus'));
assert(pages.home.includes('128 playable cards'));
assert(pages.home.includes('25 Territories inherited from v0.6.2'));

console.log('v0.6.3 development browser surfaces validated: integrated candidate data, current rules/setup/victory, non-ordered Territory selection, inherited starter boundary, noindex publication boundary, and no stale Rules Arbiter embed.');
