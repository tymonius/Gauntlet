import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");

const canonicalPath = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json";
const starterPath = "docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json";
const teachingPath = "docs/Gauntlet_v0.6.2_First_Game_and_Tableside_Candidate.md";
const matrixPath = "docs/Gauntlet_v0.6.2_Wave_C_Test_Matrix.md";
const sharedPath = "docs/Gauntlet_v0.6.2_Shared_Reference_Candidate.md";
const factionPath = "docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md";
const compatibilityPath = "docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md";
const readmePath = "docs/README.md";

const canonical = JSON.parse(read(canonicalPath));
const starterData = JSON.parse(read(starterPath));
const teaching = read(teachingPath);
const matrix = read(matrixPath);
const shared = read(sharedPath);
const factionCandidate = read(factionPath);
const compatibility = read(compatibilityPath);
const readme = read(readmePath);

const failures = [];
const requireText = (source, text, label) => {
  if (!source.includes(text)) failures.push(`${label}: missing ${JSON.stringify(text)}`);
};
const forbidText = (source, text, label) => {
  if (source.includes(text)) failures.push(`${label}: forbidden ${JSON.stringify(text)}`);
};

const cardsByName = new Map(canonical.cards.map(card => [card.name, { ...card }]));
const territoriesByName = new Map(canonical.territories.map(territory => [territory.name, territory]));
const factionsById = new Map(canonical.factions.map(faction => [faction.id, faction]));

const v062Cards = [
  { name: "Invasion", cost: 4, allegiance: "Military", unique: false },
  { name: "Landslide", cost: 4, allegiance: "Neutral", unique: false },
  { name: "Détente", cost: 3, allegiance: "Diplomats", unique: false },
  { name: "Compound Interest", cost: 4, allegiance: "Financiers", unique: false },
  { name: "Extraordinary Rendition", cost: 4, allegiance: "Intelligence", unique: false },
  { name: "Nature's Altar", cost: 4, allegiance: "Mystics", unique: false },
  { name: "Martyrdom", cost: 5, allegiance: "Inquisition", unique: true },
];
for (const card of v062Cards) cardsByName.set(card.name, card);

const expectedLeaderPairs = new Set(
  canonical.factions.flatMap(faction =>
    faction.leaders.map(leader => `${faction.id}/${slugify(leader.name)}`)
  )
);

const construction = starterData.construction ?? {};
if (starterData.version !== "v0.6.2-candidate") failures.push("Starter catalog must identify v0.6.2-candidate.");
if (construction.playableCardCount !== 30) failures.push("Starter construction must require 30 cards.");
if (construction.deckbuildingValue !== 60) failures.push("Starter construction must require value 60.");
if (construction.territoryCount !== 3) failures.push("Starter construction must require three Territories.");
if (construction.maximumArenas !== 1) failures.push("Starter construction must permit at most one Arena.");
if (construction.openingHandSize !== 3) failures.push("Opening-Hand analysis must use three cards.");
if (construction.earlyReviewCardsSeen !== 5) failures.push("Early review must use the first five cards seen.");
if (construction.minimumEarlyPlanCopies < 8) failures.push("Early-plan threshold must be at least eight copies.");

const serializedStarter = JSON.stringify(starterData);
forbidText(serializedStarter, "\"complexity\"", "starter catalog");
forbidText(serializedStarter, "\"Basic\"", "starter catalog");
forbidText(serializedStarter, "\"Advanced\"", "starter catalog");

const seenIds = new Set();
const seenPairs = new Set();
const firstLeaderByFaction = new Map();
const includedNewCards = new Set();

for (const deck of starterData.decks ?? []) {
  const pair = `${deck.factionId}/${deck.leaderId}`;
  const label = `${pair} (${deck.name ?? "unnamed"})`;
  const faction = factionsById.get(deck.factionId);

  if (!deck.id || seenIds.has(deck.id)) failures.push(`${label}: missing or duplicate id.`);
  seenIds.add(deck.id);

  if (seenPairs.has(pair)) failures.push(`${label}: duplicate faction/Leader pair.`);
  seenPairs.add(pair);

  if (!expectedLeaderPairs.has(pair)) failures.push(`${label}: not a canonical faction/Leader pair.`);
  if (!faction) {
    failures.push(`${label}: unknown faction.`);
    continue;
  }

  for (const field of ["summary", "openingPlan", "firstGameTip", "opponentWatch"]) {
    if (!String(deck[field] ?? "").trim()) failures.push(`${label}: missing ${field}.`);
  }

  if (deck.recommendedFirstLeader === true) {
    firstLeaderByFaction.set(deck.factionId, (firstLeaderByFaction.get(deck.factionId) ?? 0) + 1);
  }

  const quantities = new Map();
  let cardCount = 0;
  let deckbuildingValue = 0;
  let factionCardCopies = 0;

  for (const item of deck.cards ?? []) {
    if (quantities.has(item.name)) failures.push(`${label}: ${item.name} appears in multiple catalog rows.`);
    quantities.set(item.name, item.quantity);

    const card = cardsByName.get(item.name);
    if (!card) {
      failures.push(`${label}: unknown card ${JSON.stringify(item.name)}.`);
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      failures.push(`${label}: invalid quantity for ${item.name}.`);
      continue;
    }

    const legal = card.allegiance === "Neutral" || card.allegiance === faction.name;
    if (!legal) failures.push(`${label}: ${item.name} is not legal for ${faction.name}.`);
    if (card.unique && item.quantity > 1) failures.push(`${label}: Unique ${item.name} has ${item.quantity} copies.`);
    if (!card.unique && item.quantity > construction.maximumRecommendedCopiesPerNonUniqueTitle) {
      failures.push(`${label}: ${item.name} exceeds the recommended three-copy ceiling.`);
    }

    if (card.allegiance === faction.name) factionCardCopies += item.quantity;
    if (v062Cards.some(candidate => candidate.name === item.name)) includedNewCards.add(item.name);

    cardCount += item.quantity;
    deckbuildingValue += item.quantity * card.cost;
  }

  if (cardCount !== construction.playableCardCount) failures.push(`${label}: ${cardCount} cards instead of 30.`);
  if (deckbuildingValue !== construction.deckbuildingValue) failures.push(`${label}: ${deckbuildingValue} value instead of 60.`);
  if (deck.cardCount !== cardCount) failures.push(`${label}: declared cardCount does not match.`);
  if (deck.deckbuildingValue !== deckbuildingValue) failures.push(`${label}: declared deckbuildingValue does not match.`);
  if (factionCardCopies < 12) failures.push(`${label}: only ${factionCardCopies} faction-card copies; expected at least 12.`);

  const singletonCount = [...quantities.values()].filter(quantity => quantity === 1).length;
  if (singletonCount > 9) failures.push(`${label}: ${singletonCount} singleton titles exceed the Wave C coherence ceiling.`);

  if (!Array.isArray(deck.signatureCards) || deck.signatureCards.length !== 4) {
    failures.push(`${label}: must identify exactly four signature cards.`);
  } else {
    for (const name of deck.signatureCards) {
      if (!quantities.has(name)) failures.push(`${label}: signature card ${name} is not in the Deck.`);
    }
  }

  if (!Array.isArray(deck.openingPlanCards) || deck.openingPlanCards.length < 4) {
    failures.push(`${label}: must identify at least four opening-plan titles.`);
  }
  const planCopies = (deck.openingPlanCards ?? []).reduce((sum, name) => {
    if (!quantities.has(name)) failures.push(`${label}: opening-plan card ${name} is not in the Deck.`);
    return sum + (quantities.get(name) ?? 0);
  }, 0);
  if (deck.openingPlanCopies !== planCopies) failures.push(`${label}: openingPlanCopies does not match ${planCopies}.`);
  if (planCopies < construction.minimumEarlyPlanCopies) failures.push(`${label}: only ${planCopies} early-plan copies.`);

  const openingAccess = atLeastOneProbability(30, planCopies, construction.openingHandSize);
  const fiveCardAccess = atLeastOneProbability(30, planCopies, construction.earlyReviewCardsSeen);
  if (openingAccess + 1e-12 < construction.minimumOpeningAccessProbability) {
    failures.push(`${label}: opening access ${(openingAccess * 100).toFixed(1)}% is below threshold.`);
  }
  if (fiveCardAccess + 1e-12 < construction.minimumFiveCardAccessProbability) {
    failures.push(`${label}: five-card access ${(fiveCardAccess * 100).toFixed(1)}% is below threshold.`);
  }

  const territoryNames = deck.territories ?? [];
  if (territoryNames.length !== 3) failures.push(`${label}: must contain exactly three Territories.`);
  if (new Set(territoryNames).size !== territoryNames.length) failures.push(`${label}: duplicate Territory.`);
  let arenas = 0;
  for (const name of territoryNames) {
    const territory = territoriesByName.get(name);
    if (!territory) failures.push(`${label}: unknown Territory ${JSON.stringify(name)}.`);
    if (territory?.arena) arenas += 1;
  }
  if (arenas > 1) failures.push(`${label}: contains ${arenas} Arenas.`);

  console.log(
    `✓ ${label}: ${cardCount} cards, ${deckbuildingValue} value, ${factionCardCopies} faction copies, ` +
    `${planCopies} early-plan copies (${(openingAccess * 100).toFixed(1)}% opening / ${(fiveCardAccess * 100).toFixed(1)}% first five)`
  );
}

for (const pair of expectedLeaderPairs) {
  if (!seenPairs.has(pair)) failures.push(`Missing Wave C starter for ${pair}.`);
}
if ((starterData.decks ?? []).length !== expectedLeaderPairs.size) {
  failures.push(`Expected ${expectedLeaderPairs.size} starters, found ${(starterData.decks ?? []).length}.`);
}
for (const factionId of factionsById.keys()) {
  if ((firstLeaderByFaction.get(factionId) ?? 0) !== 1) {
    failures.push(`${factionId}: must identify exactly one recommended first Leader.`);
  }
}
for (const card of v062Cards) {
  if (!includedNewCards.has(card.name)) failures.push(`No Wave C starter includes new card ${card.name}.`);
}

for (const text of [
  "Capture → Draw → Opening → Movement → Denouement → Cleanup",
  "Pending battle → Terms → Onset → Gambits",
  "Onset → set Gambits → form Reserves → reveal Gambits → choose Tactics → reveal Tactics → Outcome → Aftermath",
  "Fall Back is ordinary Movement. A losing player retreats. A player who leaves without losing withdraws.",
  "BOUND — outside Hand, Draw Pile, Discard Pile, Graveyard, Reserve, Tactic, and Asset Bank",
  "YOUR TURN",
  "Military — General vs Inquisition — Grand Inquisitor",
  "Five-minute guided first battle",
  "one authoritative tableside faction reference",
  "The Deckbuilder and `/start/` flow remain on the published v0.6.1 catalog until Wave D",
]) requireText(teaching, text, "teaching candidate");

for (const heading of ["Military", "Diplomats", "Financiers", "Intelligence", "Mystics", "Inquisition"]) {
  requireText(teaching, `## ${heading}`, `faction teaching ${heading}`);
}
for (const leader of ["General", "Ambassador", "Executive", "Ranger", "Spirit Walker", "Grand Inquisitor"]) {
  requireText(teaching, `Recommended first Leader:** ${leader}`, `recommended first Leader ${leader}`);
}

for (const text of [
  "Capture → Draw → Opening → Movement → Denouement → Cleanup",
  "Pending battle → Terms → Onset → Gambits",
  "Defensive Edge",
  "Tiebreak Roll",
  "Front Line",
]) requireText(shared + teaching, text, "Wave A/C parity");

for (const text of [
  "Invasion",
  "Détente",
  "Compound Interest",
  "Extraordinary Rendition",
  "Nature's Altar",
  "Martyrdom",
  "Landslide",
]) requireText(factionCandidate + teaching + serializedStarter, text, "Wave B/C parity");

for (const text of [
  "Rite of Crossing",
  "Relentless Pursuit",
  "Protracted Siege",
  "Manifest Destiny",
  "Refuge",
]) requireText(compatibility + teaching + serializedStarter, text, "compatibility parity");

const scenarioIds = [...matrix.matchAll(/^## ([A-F]\d{2}) —/gm)].map(match => match[1]);
if (scenarioIds.length !== 66 || new Set(scenarioIds).size !== 66) {
  failures.push(`Expected 66 unique Wave C scenarios; found ${scenarioIds.length}/${new Set(scenarioIds).size}.`);
}
for (const prefix of ["A", "B", "C", "D", "E", "F"]) {
  if (!scenarioIds.some(id => id.startsWith(prefix))) failures.push(`Missing Wave C scenario family ${prefix}.`);
}

for (const text of [
  "v0.6.2 Starter Decks Candidate",
  "v0.6.2 First-Game and Tableside Candidate",
  "v0.6.2 Wave C Test Matrix",
  "v0.6.2 Wave C Review Checklist",
]) requireText(readme, text, "documentation index");

if (failures.length) {
  console.error("\nv0.6.2 Wave C validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `\nv0.6.2 Wave C validation passed: ${(starterData.decks ?? []).length} starter Decks, ` +
  `${scenarioIds.length} scenarios, full-pool legality, early-access, teaching, and tableside gates.`
);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = result * (n - k + i) / i;
  return result;
}

function atLeastOneProbability(deckSize, qualifyingCopies, draws) {
  return 1 - choose(deckSize - qualifyingCopies, draws) / choose(deckSize, draws);
}
