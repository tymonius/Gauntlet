import fs from 'node:fs';
import path from 'node:path';
import { migrateV063StarterCatalog } from '../v0.6.3/deckbuilder/starter-adapter.js';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const inherited = readJson('releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json');
const canonical = readJson('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const adapted = migrateV063StarterCatalog(inherited);
const app = read('v0.6.3/deckbuilder/app.js');
const index = read('v0.6.3/deckbuilder/index.html');
const refiner = read('scripts/refine-v063-browser-development.mjs');
const source = read('docs/Gauntlet_v0.6.3_Starter_Deck_Presentation_Candidate.md');

assert(inherited.version === 'v0.6.2', `Expected published starter source v0.6.2, received ${inherited.version}.`);
assert(adapted.version === 'v0.6.3-candidate-adapter', 'Adapted starter catalog must identify the v0.6.3 candidate adapter.');
assert((adapted.decks ?? []).length === 12, `Expected 12 adapted starters, found ${(adapted.decks ?? []).length}.`);
assert(canonical.version === 'v0.6.3-candidate', `Expected canonical v0.6.3-candidate, received ${canonical.version}.`);

const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const sourceReserves = inherited.decks.flatMap((deck) => deck.cards).filter((item) => item.name === 'Reserves').reduce((sum, item) => sum + item.quantity, 0);
const sourceSmugglersPass = inherited.decks.flatMap((deck) => deck.territories).filter((name) => name === "Smuggler's Pass").length;
let adaptedSecondLine = 0;
let adaptedSmugglersRun = 0;

assert(sourceReserves > 0, 'Published starter source no longer contains the expected Reserves title migration.');
assert(sourceSmugglersPass > 0, "Published starter source no longer contains the expected Smuggler's Pass title migration.");

for (const deck of adapted.decks ?? []) {
  const label = `${deck.factionId}/${deck.leaderId} (${deck.name})`;
  let cardCount = 0;
  let deckValue = 0;
  for (const item of deck.cards ?? []) {
    assert(item.name !== 'Reserves', `${label}: retired card title Reserves survived adaptation.`);
    const card = cardsByName.get(item.name);
    assert(Boolean(card), `${label}: adapted card ${JSON.stringify(item.name)} is absent from v0.6.3 canonical data.`);
    if (!card) continue;
    if (item.name === 'Second Line') adaptedSecondLine += item.quantity;
    cardCount += item.quantity;
    deckValue += item.quantity * card.cost;
  }
  assert(cardCount === 30, `${label}: adapted starter has ${cardCount} cards instead of 30.`);
  assert(deckValue === 60, `${label}: adapted starter has ${deckValue} Deckbuilding Value instead of 60.`);

  assert(Array.isArray(deck.territories) && deck.territories.length === 3, `${label}: must select exactly three Territories.`);
  assert(JSON.stringify(deck.recommendedTerritoryOrder) === JSON.stringify(deck.territories), `${label}: recommended Territory order must preserve the inherited ordered three-Territory set.`);
  assert(deck.territoryOrderGuidance?.meaning === 'strategy-recommendation', `${label}: Territory order must be marked as strategy guidance.`);
  assert(deck.territoryOrderGuidance?.direction === 'own-end-to-opponent-end', `${label}: recommended order direction must be own end to opponent end.`);
  assert(deck.territoryOrderGuidance?.chosenAfterOpeningSelection === true, `${label}: actual Territory order must be chosen after opening selection.`);
  assert(deck.territoryOrderGuidance?.mayRearrangeAtSetup === true, `${label}: starter recommendation must remain rearrangeable at setup.`);
  assert(deck.territoryOrderGuidance?.informedByInitiative === false, `${label}: Territory arrangement must remain uninformed by initiative.`);

  let arenas = 0;
  for (const name of deck.territories ?? []) {
    assert(name !== "Smuggler's Pass", `${label}: retired Territory title Smuggler's Pass survived adaptation.`);
    const territory = territoriesByName.get(name);
    assert(Boolean(territory), `${label}: adapted Territory ${JSON.stringify(name)} is absent from v0.6.3 canonical data.`);
    if (name === "Smuggler's Run") adaptedSmugglersRun += 1;
    if (territory?.arena) arenas += 1;
  }
  assert(arenas <= 1, `${label}: adapted starter contains ${arenas} Arenas.`);
}

assert(adaptedSecondLine === sourceReserves, `Second Line migration changed quantity: expected ${sourceReserves}, found ${adaptedSecondLine}.`);
assert(adaptedSmugglersRun === sourceSmugglersPass, `Smuggler's Run migration changed starter occurrence count: expected ${sourceSmugglersPass}, found ${adaptedSmugglersRun}.`);

for (const marker of [
  "import { migrateV063StarterCatalog } from './starter-adapter.js';",
  'state.starters = migrateV063StarterCatalog(starterData).decks ?? [];',
  'Recommended Territory order (own end → opponent end):',
  'keep this order or rearrange these three Territories',
  'Initiative is not yet known.',
]) assert(app.includes(marker), `v0.6.3 Deckbuilder app is missing starter-guidance marker: ${marker}`);

for (const marker of [
  'strategy guidance, not a setup lock',
  'After opening selection, you may keep the recommendation or rearrange the three Territories.',
]) assert(index.includes(marker), `v0.6.3 Deckbuilder page is missing setup-guidance marker: ${marker}`);

for (const marker of [
  'migrateV063StarterCatalog',
  'strategy guidance, not a setup lock',
  'Recommended Territory order (own end → opponent end):',
]) assert(refiner.includes(marker), `Browser refiner is missing reproducibility marker: ${marker}`);

for (const marker of [
  'The order is a **strategy recommendation**, not a mandatory setup instruction.',
  'the player may keep the starter\'s recommended order or rearrange the three Territories',
  '**Reserves** becomes **Second Line**.',
  "**Smuggler's Pass** becomes **Smuggler's Run**.",
  'The published v0.6.2 starter files remain immutable.',
]) assert(source.includes(marker), `Starter presentation source is missing adopted marker: ${marker}`);

if (failures.length) {
  console.error('\nv0.6.3 starter guidance validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`v0.6.3 starter guidance validation passed: ${adapted.decks.length} starters, ${sourceReserves} Reserves→Second Line copies, ${sourceSmugglersPass} Smuggler's Pass→Smuggler's Run starter occurrences, and strategic Territory-order guidance preserved.`);
