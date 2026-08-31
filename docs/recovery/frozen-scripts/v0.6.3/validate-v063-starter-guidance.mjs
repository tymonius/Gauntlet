import fs from 'node:fs';
import path from 'node:path';
import { V063_STARTER_CATALOG } from '../v0.6.3/data/starter-decks-candidate.js';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const canonical = readJson('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const finalization = read('docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md');
const source = V063_STARTER_CATALOG;

assert(source.version === 'v0.6.3-candidate', `Expected v0.6.3 starter source, received ${source.version}.`);
assert(source.status === 'Finalized competitive starter Deck set for v0.6.3', 'Starter source must identify the Deck set as finalized for v0.6.3.');
assert(source.optimizationPolicy?.primary === 'competitive-strength-and-strategic-expression', 'Starter source must identify competitive strength and strategic expression as the primary optimization target.');
assert(source.optimizationPolicy?.teachingSimplicityTarget === false, 'Teaching simplicity must not be a starter optimization target.');
assert(source.optimizationPolicy?.cardPoolCoverageTarget === false, 'Card-pool coverage must not be a starter optimization target.');
assert(source.optimizationPolicy?.status === 'finalized-for-v0.6.3; future changes require playtest evidence', 'Starter source must lock further theory-only changes behind playtest evidence.');
assert(source.optimizationPolicy?.audit === 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md', 'Starter source must point to the finalization record.');
assert(source.optimizationPolicy?.predecessorAudit === 'docs/Gauntlet_v0.6.3_Strong_Starter_Decks_Second_Pass_Audit.md', 'Starter source must preserve the second-pass audit as predecessor evidence.');
assert((source.decks ?? []).length === 12, `Expected 12 starters, found ${(source.decks ?? []).length}.`);
assert(canonical.version === 'v0.6.3-candidate', `Expected canonical v0.6.3-candidate, received ${canonical.version}.`);

const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const factionsById = new Map(canonical.factions.map((faction) => [faction.id, faction]));
const seenDeckIds = new Set();
const usedTitles = new Set();

for (const deck of source.decks ?? []) {
  const label = `${deck.factionId}/${deck.leaderId} (${deck.name})`;
  assert(!seenDeckIds.has(deck.id), `${label}: duplicate starter id ${deck.id}.`);
  seenDeckIds.add(deck.id);

  const faction = factionsById.get(deck.factionId);
  assert(Boolean(faction), `${label}: unknown faction.`);
  assert((faction?.leaders ?? []).some((leader) => slug(leader.name) === deck.leaderId), `${label}: Leader does not belong to faction.`);

  let cardCount = 0;
  let deckValue = 0;
  for (const item of deck.cards ?? []) {
    const card = cardsByName.get(item.name);
    assert(Boolean(card), `${label}: card ${JSON.stringify(item.name)} is absent from v0.6.3 canonical data.`);
    assert(Number.isInteger(item.quantity) && item.quantity > 0, `${label}: ${item.name} has invalid quantity ${item.quantity}.`);
    if (!card) continue;
    assert(card.allegiance === 'Neutral' || slug(card.allegiance) === deck.factionId, `${label}: ${item.name} has illegal allegiance ${card.allegiance}.`);
    assert(!(card.unique && item.quantity > 1), `${label}: Unique card ${item.name} appears ${item.quantity} times.`);
    cardCount += item.quantity;
    deckValue += item.quantity * card.cost;
    usedTitles.add(item.name);
  }
  assert(cardCount === 30, `${label}: starter has ${cardCount} cards instead of 30.`);
  assert(deckValue === 60, `${label}: starter has ${deckValue} Deckbuilding Value instead of 60.`);
  assert(deck.cardCount === 30, `${label}: stored cardCount must be 30.`);
  assert(deck.deckbuildingValue === 60, `${label}: stored deckbuildingValue must be 60.`);

  assert(Array.isArray(deck.territories) && deck.territories.length === 3, `${label}: must select exactly three Territories.`);
  assert(new Set(deck.territories ?? []).size === 3, `${label}: Territories must be different.`);
  assert(JSON.stringify(deck.recommendedTerritoryOrder) === JSON.stringify(deck.territories), `${label}: recommended Territory order must match the selected strategic order.`);
  assert(deck.territoryOrderGuidance?.meaning === 'strategy-recommendation', `${label}: Territory order must be marked as strategy guidance.`);
  assert(deck.territoryOrderGuidance?.direction === 'own-end-to-opponent-end', `${label}: recommended order direction must be own end to opponent end.`);
  assert(deck.territoryOrderGuidance?.chosenAfterOpeningSelection === true, `${label}: actual Territory order must be chosen after opening selection.`);
  assert(deck.territoryOrderGuidance?.mayRearrangeAtSetup === true, `${label}: recommendation must remain rearrangeable at setup.`);
  assert(deck.territoryOrderGuidance?.informedByInitiative === false, `${label}: Territory arrangement must remain uninformed by initiative.`);

  let arenas = 0;
  for (const name of deck.territories ?? []) {
    const territory = territoriesByName.get(name);
    assert(Boolean(territory), `${label}: Territory ${JSON.stringify(name)} is absent from v0.6.3 canonical data.`);
    if (territory?.arena) arenas += 1;
  }
  assert(arenas <= 1, `${label}: starter contains ${arenas} Arenas.`);
}

const commandant = source.decks.find((deck) => deck.name === 'Holdfast');
const witchHunter = source.decks.find((deck) => deck.name === 'Relentless Pursuit');
const executive = source.decks.find((deck) => deck.name === 'Hostile Expansion');
const quantity = (deck, cardName) => deck?.cards.find((item) => item.name === cardName)?.quantity ?? 0;
assert(quantity(commandant, 'Contingency Plan') === 1, 'Commandant final starter must contain exactly one Contingency Plan.');
assert(quantity(commandant, 'Unbroken Ranks') === 2, 'Commandant final starter must contain exactly two Unbroken Ranks.');
assert(quantity(witchHunter, 'Contingency Plan') === 1, 'Witch Hunter final starter must contain exactly one Contingency Plan.');
assert(quantity(witchHunter, 'Scouting Report') === 0, 'Witch Hunter final starter must not contain Scouting Report.');
assert(quantity(executive, 'Fealty') === 1, 'Executive starter must retain Fealty after the audit transcription correction.');
assert(usedTitles.size === 110, `Finalized v0.6.3 starters should use 110 unique titles; found ${usedTitles.size}.`);
assert(finalization.includes('110 of 128 playable titles (85.9%)'), 'Finalization record must document the adopted pool-level coverage result.');
assert(finalization.includes('No further theory-only starter changes should be made for v0.6.3.'), 'Finalization record must lock further theory-only changes behind playtest evidence.');
assert(finalization.includes('Teaching simplicity and card-pool coverage are not optimization targets.'), 'Finalization record must preserve the competitive optimization objective.');

if (failures.length) {
  console.error('\nv0.6.3 finalized starter validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`v0.6.3 finalized starter validation passed: ${source.decks.length} starters, every Deck 30/60, ${usedTitles.size}/128 unique titles represented, strategic Territory guidance preserved, future theory-only changes locked behind playtest evidence.`);

function slug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
