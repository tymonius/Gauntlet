import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const starterPath = path.join(root, "deckbuilder/starter-decks.json");
const starterData = JSON.parse(fs.readFileSync(starterPath, "utf8"));
const version = starterData.version || "v0.6.0";
const isV063 = version === "v0.6.3";
const canonicalPath = path.join(
  root,
  isV063
    ? "releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json"
    : "releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json"
);
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const decks = starterData.decks || [];

if (isV063 && canonical.version !== "v0.6.3") {
  throw new Error(`Expected published v0.6.3 canonical data, received ${canonical.version || "unknown"}.`);
}

const cardsByName = new Map(canonical.cards.map(card => [card.name, card]));
const territoriesByName = new Map(canonical.territories.map(territory => [territory.name, territory]));
const factionsById = new Map(canonical.factions.map(faction => [faction.id, faction]));
const expectedLeaderPairs = new Set(
  canonical.factions.flatMap(faction =>
    faction.leaders.map(leader => `${faction.id}/${slugify(leader.name)}`)
  )
);

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

  if (!expectedLeaderPairs.has(pair)) errors.push(`${label}: does not match a canonical faction Leader.`);
  if (!faction) {
    errors.push(`${label}: unknown faction.`);
    continue;
  }

  if (!deck.summary?.trim()) errors.push(`${label}: missing summary.`);
  if (!isV063 && !deck.firstGameTip?.trim()) errors.push(`${label}: missing first-game tip.`);

  let cardCount = 0;
  let deckbuildingValue = 0;
  const seenCardNames = new Set();

  for (const item of deck.cards || []) {
    const card = cardsByName.get(item.name);
    if (!card) {
      errors.push(`${label}: unknown card "${item.name}".`);
      continue;
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors.push(`${label}: ${item.name} has invalid quantity ${item.quantity}.`);
      continue;
    }

    if (seenCardNames.has(item.name)) errors.push(`${label}: ${item.name} appears more than once in the preset data.`);
    seenCardNames.add(item.name);

    const legalAllegiance = card.allegiance === "Neutral" || card.allegiance === faction.name;
    if (!legalAllegiance) errors.push(`${label}: ${item.name} is not legal for ${faction.name}.`);
    if (card.unique && quantity > 1) errors.push(`${label}: ${item.name} is Unique but has ${quantity} copies.`);
    if (!isV063 && card.allegiance === "Neutral" && card.complexity !== "Basic") {
      errors.push(`${label}: Neutral starter card ${item.name} is ${card.complexity || "unclassified"}, not Basic.`);
    }

    cardCount += quantity;
    deckbuildingValue += quantity * Number(card.cost);
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

  if (territoryNames.length !== 3) errors.push(`${label}: must contain exactly three Territories.`);
  if (uniqueTerritories.size !== territoryNames.length) errors.push(`${label}: contains duplicate Territories.`);

  for (const name of territoryNames) {
    const territory = territoriesByName.get(name);
    if (!territory) {
      errors.push(`${label}: unknown Territory "${name}".`);
      continue;
    }
    if (territory.arena) arenaCount += 1;
    if (!isV063 && territory.complexity !== "Basic") {
      errors.push(`${label}: starter Territory ${name} is ${territory.complexity}, not Basic.`);
    }
  }

  if (arenaCount > 1) errors.push(`${label}: contains ${arenaCount} Arenas.`);
  console.log(`✓ ${label}: ${cardCount} cards, ${deckbuildingValue} value, ${territoryNames.join(" → ")}`);
}

for (const pair of expectedLeaderPairs) {
  if (!seenPairs.has(pair)) errors.push(`Missing recommended starter Deck for ${pair}.`);
}

if (decks.length !== expectedLeaderPairs.size) {
  errors.push(`Expected ${expectedLeaderPairs.size} starter Decks, found ${decks.length}.`);
}

if (isV063) {
  if (starterData.status !== "published") errors.push(`Expected published v0.6.3 starter status, found ${starterData.status || "missing"}.`);
  if (decks.length !== 12) errors.push(`Expected 12 published v0.6.3 starter Decks, found ${decks.length}.`);
}

if (errors.length) {
  console.error("\nRecommended starter Deck validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\nValidated ${decks.length} recommended ${version} starter Decks.`);
if (isV063) {
  console.log("Each current preset matches published v0.6.3 canonical data, has 30 cards, 60 value, legal allegiance/Unique counts, and three different Territories with no more than one Arena.");
} else {
  console.log("Each historical preset has 30 cards, 60 value, Basic Neutral cards, and three Basic Territories.");
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
