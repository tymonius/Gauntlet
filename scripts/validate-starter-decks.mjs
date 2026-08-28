import path from "node:path";
import process from "node:process";
import { CURRENT_GAME_AUTHORITY_SOURCE, loadCurrentGameAuthority } from "./current-game-authority.mjs";

const root = process.cwd();
const authorityPath = path.join(root, CURRENT_GAME_AUTHORITY_SOURCE);
const authority = await loadCurrentGameAuthority();

const cards = authority.gameplay?.cards || [];
const territories = authority.gameplay?.territories || [];
const factions = authority.gameplay?.factions || [];
const leaders = authority.leaders || [];
const decks = authority.starterDecks?.decks || [];

const cardsByName = new Map(cards.map(card => [card.name, card]));
const territoriesByName = new Map(territories.map(territory => [territory.name, territory]));
const factionsById = new Map(factions.map(faction => [faction.id, faction]));
const expectedLeaderPairs = new Set(leaders.map(leader => `${leader.faction}/${leader.id}`));
const mysticsRiteIds = new Set((authority.mystics?.rites || []).map(rite => rite.id));
const mysticsSelectedRiteCount = Number(authority.mystics?.selectionPolicy?.selectedCount || 0);

const errors = [];
const seenIds = new Set();
const seenPairs = new Set();

for (const deck of decks) {
  const label = `${deck.factionId}/${deck.leaderId} (${deck.name || "unnamed"})`;
  const pair = `${deck.factionId}/${deck.leaderId}`;
  const faction = factionsById.get(deck.factionId);

  if (!deck.id || seenIds.has(deck.id)) errors.push(`${label}: missing or duplicate Deck id.`);
  seenIds.add(deck.id);

  if (seenPairs.has(pair)) errors.push(`${label}: duplicate faction/Leader preset.`);
  seenPairs.add(pair);

  if (!expectedLeaderPairs.has(pair)) errors.push(`${label}: does not match a current faction Leader.`);
  if (!faction) {
    errors.push(`${label}: unknown faction.`);
    continue;
  }

  if (!deck.summary?.trim()) errors.push(`${label}: missing summary.`);
  if (!deck.firstGameTip?.trim()) errors.push(`${label}: missing first-game tip.`);

  let cardCount = 0;
  let deckbuildingValue = 0;
  const seenCardNames = new Set();

  for (const item of deck.cards || []) {
    const card = cardsByName.get(item.name);
    if (!card) {
      errors.push(`${label}: unknown card "${item.name}".`);
      continue;
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      errors.push(`${label}: ${item.name} has invalid quantity ${item.quantity}.`);
      continue;
    }

    if (seenCardNames.has(item.name)) errors.push(`${label}: ${item.name} appears more than once in the preset data.`);
    seenCardNames.add(item.name);

    const legalAllegiance = card.allegiance === "Neutral" || card.allegiance === faction.name;
    if (!legalAllegiance) errors.push(`${label}: ${item.name} is not legal for ${faction.name}.`);
    if (card.unique && item.quantity > 1) errors.push(`${label}: ${item.name} is Unique but has ${item.quantity} copies.`);
    if (card.allegiance === "Neutral" && card.complexity !== "Basic") {
      errors.push(`${label}: Neutral starter card ${item.name} is ${card.complexity || "unclassified"}, not Basic.`);
    }

    cardCount += item.quantity;
    deckbuildingValue += item.quantity * card.cost;
  }

  if (cardCount !== 30) errors.push(`${label}: ${cardCount} cards instead of 30.`);
  if (deckbuildingValue !== 60) errors.push(`${label}: ${deckbuildingValue} value instead of 60.`);
  if (deck.cardCount !== cardCount) errors.push(`${label}: declared cardCount ${deck.cardCount} does not match ${cardCount}.`);
  if (deck.deckbuildingValue !== deckbuildingValue) {
    errors.push(`${label}: declared deckbuildingValue ${deck.deckbuildingValue} does not match ${deckbuildingValue}.`);
  }

  const territoryNames = deck.territories || [];
  const uniqueTerritories = new Set(territoryNames);
  let arenaCount = 0;

  if (territoryNames.length !== 3) errors.push(`${label}: must contain exactly three ordered Territories.`);
  if (uniqueTerritories.size !== territoryNames.length) errors.push(`${label}: contains duplicate Territories.`);

  for (const name of territoryNames) {
    const territory = territoriesByName.get(name);
    if (!territory) {
      errors.push(`${label}: unknown Territory "${name}".`);
      continue;
    }
    if (territory.arena) arenaCount += 1;
    if (territory.complexity !== "Basic") {
      errors.push(`${label}: starter Territory ${name} is ${territory.complexity}, not Basic.`);
    }
  }

  if (arenaCount > 1) errors.push(`${label}: contains ${arenaCount} Arenas.`);

  let riteSummary = "";
  if (deck.factionId === "mystics") {
    const selected = Array.isArray(deck.selectedRites) ? deck.selectedRites : [];
    const order = Array.isArray(deck.recommendedRiteOrder) ? deck.recommendedRiteOrder : [];
    const selectedSorted = [...selected].sort();
    const orderSorted = [...order].sort();
    if (selected.length !== mysticsSelectedRiteCount || new Set(selected).size !== selected.length) {
      errors.push(`${label}: must select exactly ${mysticsSelectedRiteCount} different Rites.`);
    }
    if (selected.some(id => !mysticsRiteIds.has(id))) errors.push(`${label}: references an unknown Rite.`);
    if (
      order.length !== selected.length
      || new Set(order).size !== order.length
      || selectedSorted.some((id, index) => id !== orderSorted[index])
    ) {
      errors.push(`${label}: recommended Rite order must contain exactly its selected Rites.`);
    }
    riteSummary = `, Rites ${order.join(" → ")}`;
  }
  console.log(`✓ ${label}: ${cardCount} cards, ${deckbuildingValue} value, ${territoryNames.join(" → ")}${riteSummary}`);
}

for (const pair of expectedLeaderPairs) {
  if (!seenPairs.has(pair)) errors.push(`Missing recommended starter Deck for ${pair}.`);
}

if (decks.length !== expectedLeaderPairs.size) {
  errors.push(`Expected ${expectedLeaderPairs.size} starter Decks, found ${decks.length}.`);
}

if (errors.length) {
  console.error("\nRecommended starter Deck validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\nValidated ${decks.length} recommended ${authority.version} starter Decks from ${authorityPath}.`);
console.log("Each preset has 30 cards, 60 value, Basic Neutral cards, and three Basic Territories; Mystics starters also carry a valid three-Rite package and recommended Rite order.");
