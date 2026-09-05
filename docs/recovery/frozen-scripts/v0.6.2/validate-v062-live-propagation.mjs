import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildV062CanonicalData, NEW_CARD_NAMES, V062_VERSION } from "../v0.6.2/data/canonical-data.js";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const exists = relative => fs.existsSync(path.join(root, relative));
const base = JSON.parse(read("releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"));
const data = buildV062CanonicalData(base);
const secondBuild = buildV062CanonicalData(JSON.parse(JSON.stringify(base)));
const starters = JSON.parse(read("docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json"));
const matrix = read("docs/Gauntlet_v0.6.2_Wave_D_Test_Matrix.md");
const readme = read("docs/README.md");
const packageJson = JSON.parse(read("package.json"));
const releaseManifest = exists("v0.6.2/release-manifest.json")
  ? JSON.parse(read("v0.6.2/release-manifest.json"))
  : null;
const published = releaseManifest?.published === true && releaseManifest?.status === "published";
const failures = [];

const requireValue = (condition, message) => { if (!condition) failures.push(message); };
const requireText = (source, text, label) => requireValue(source.includes(text), `${label}: missing ${JSON.stringify(text)}`);
const forbidText = (source, text, label) => requireValue(!source.includes(text), `${label}: forbidden ${JSON.stringify(text)}`);

requireValue(data.version === V062_VERSION, `Version must be ${V062_VERSION}.`);
requireValue(data.cards.length === 128, `Expected 128 playable cards, found ${data.cards.length}.`);
requireValue(data.territories.length === 25, `Expected 25 Territories, found ${data.territories.length}.`);
requireValue(data.proposals.length === 9, `Expected nine Proposals, found ${data.proposals.length}.`);
requireValue(JSON.stringify(data) === JSON.stringify(secondBuild), "Effective canonical materialization must be deterministic.");
requireValue(new Set(data.cards.map(card => card.id)).size === data.cards.length, "Card ids must be unique.");
requireValue(new Set(data.cards.map(card => card.name)).size === data.cards.length, "Card names must be unique.");
requireValue(data.turn.sequence.join(" → ") === "capture → draw → opening → movement → denouement → cleanup", "Turn sequence mismatch.");
requireValue(data.battle.pending_sequence.join(" → ") === "pending_battle → terms → onset → gambits", "Pending-battle sequence mismatch.");
requireValue(data.battle.sequence.join(" → ") === "onset → set_gambits → form_reserves → reveal_gambits → choose_tactics → reveal_tactics → outcome → aftermath", "Battle sequence mismatch.");

const expectedPools = { Neutral: 50, Military: 13, Diplomats: 13, Financiers: 13, Intelligence: 13, Mystics: 13, Inquisition: 13 };
for (const [pool, count] of Object.entries(expectedPools)) requireValue(data.card_pool_summary[pool]?.count === count, `${pool} pool should contain ${count} titles.`);
for (const entry of [...data.cards, ...data.territories]) requireValue(!Object.hasOwn(entry, "complexity"), `${entry.name}: retired complexity field remains active.`);

const cardsByName = new Map(data.cards.map(card => [card.name, card]));
const invasion = cardsByName.get("Invasion");
requireValue(invasion?.allegiance === "Military", "Invasion must be Military.");
requireValue(invasion?.action_phase === "Opening", "Invasion Action must identify Opening.");
requireText(invasion?.battle ?? "", "one additional Tactic", "Invasion Battle");
for (const name of NEW_CARD_NAMES) requireValue(cardsByName.has(name), `Missing new card ${name}.`);
requireValue(cardsByName.get("Martyrdom")?.unique === true, "Martyrdom must be Unique.");
requireValue(cardsByName.get("Nature's Altar")?.trait === "Arcane", "Nature's Altar must be Arcane.");
requireValue(data.cards.filter(card => card.allegiance === "Mystics").every(card => card.trait === "Arcane"), "Every Mystics card must be Arcane.");
requireText(cardsByName.get("Good Faith")?.accepted ?? "", "then gain 1 Influence", "Good Faith");
requireText(cardsByName.get("Black Covenant")?.tactic ?? "", "additional Tactic", "Black Covenant");
requireText(cardsByName.get("Foreclosure")?.action ?? "", "next opposing Territory immediately beyond your Front Line", "Foreclosure");
requireText(cardsByName.get("Protracted Siege")?.overlay ?? "", "prevents one Front Line advance", "Protracted Siege");
requireText(cardsByName.get("Manifest Destiny")?.battle ?? "", "immediately beyond your Front Line", "Manifest Destiny");

const territoriesByName = new Map(data.territories.map(territory => [territory.name, territory]));
requireText(territoriesByName.get("Quicksand")?.text ?? "", "Fall Back", "Quicksand");
requireText(territoriesByName.get("Refuge")?.text ?? "", "Falls Back", "Refuge");
requireText(territoriesByName.get("Command Tent")?.text ?? "", "Opening and Denouement", "Command Tent");
for (const arena of data.territories.filter(territory => territory.arena)) {
  requireText(arena.text, "Defensive Edge does not apply", arena.name);
  requireText(arena.text, "Tiebreak Roll", arena.name);
}

const serialized = JSON.stringify(data);
for (const retired of ["Action Opportunity", "opening effects", "battle opening", "revealed Territory", "Defender's Advantage"]) forbidText(serialized, retired, "effective canonical data");
requireValue(data.proposals.every(proposal => !/\byou\b|\byour\b/i.test(`${proposal.accepted} ${proposal.refused}`)), "Proposal results must use explicit roles rather than reader-dependent you/your.");
requireText(data.proposals.find(proposal => proposal.name === "Diplomatic Recognition")?.accepted ?? "", "advances their Front Line", "Diplomatic Recognition");
requireValue(data.faction_rules.financiers.starting_capital === 2, "Financiers must begin with 2 Capital in the candidate.");
requireValue(data.faction_rules.mystics.guardians_protection_values.ritual === 4, "Guardians of the Circle Ritual protection must require value 4.");

requireValue(starters.decks?.length === 12, `Expected 12 Wave C starters, found ${starters.decks?.length ?? 0}.`);
const territories = new Map(data.territories.map(territory => [territory.name, territory]));
for (const deck of starters.decks ?? []) {
  const faction = data.factions.find(entry => entry.id === deck.factionId);
  const label = `${deck.factionId}/${deck.leaderId}`;
  requireValue(Boolean(faction), `${label}: unknown faction.`);
  let count = 0;
  let value = 0;
  for (const item of deck.cards ?? []) {
    const card = cardsByName.get(item.name);
    requireValue(Boolean(card), `${label}: unknown card ${item.name}.`);
    if (!card || !faction) continue;
    requireValue(card.allegiance === "Neutral" || card.allegiance === faction.name, `${label}: illegal card ${item.name}.`);
    requireValue(!card.unique || item.quantity === 1, `${label}: Unique ${item.name} quantity must be one.`);
    count += item.quantity;
    value += item.quantity * card.cost;
  }
  requireValue(count === 30, `${label}: ${count} cards instead of 30.`);
  requireValue(value === 60, `${label}: value ${value} instead of 60.`);
  requireValue(deck.territories?.length === 3, `${label}: must contain three Territories.`);
  requireValue(deck.territories?.every(name => territories.has(name)), `${label}: unknown Territory.`);
  requireValue(deck.territories?.filter(name => territories.get(name)?.arena).length <= 1, `${label}: more than one Arena.`);
}

const surfaces = {
  landing: read("v0.6.2/index.html"),
  start: read("v0.6.2/start/index.html"),
  startApp: read("v0.6.2/start/app.js"),
  deckbuilder: read("v0.6.2/deckbuilder/index.html"),
  deckbuilderApp: read("v0.6.2/deckbuilder/app.js"),
  reference: read("v0.6.2/reference/index.html"),
  referenceApp: read("v0.6.2/reference/app.js")
};
for (const [label, source] of Object.entries(surfaces)) requireText(source, "v0.6.2", label);
const dataConsumers = [surfaces.startApp, surfaces.deckbuilderApp, surfaces.referenceApp];
const expectedDataMarker = published ? "Gauntlet_v0.6.2_Canonical_Data.json" : "canonical-data.js";
for (const source of dataConsumers) requireText(source, expectedDataMarker, `${published ? "published" : "candidate"} data consumer`);
if (published) {
  for (const source of [surfaces.startApp, surfaces.deckbuilderApp]) requireText(source, "Gauntlet_v0.6.2_Starter_Decks.json", "published starter consumer");
  for (const source of dataConsumers) forbidText(source, "canonical-data.js", "published data consumer");
}
requireText(surfaces.landing, "128-card pool", `${published ? "published" : "candidate"} landing`);
requireText(surfaces.start, "Capture → Draw → Opening → Movement → Denouement → Cleanup", "start surface");
requireText(surfaces.start, "Pending battle → Terms → Onset", "start surface");
requireText(surfaces.start, "BOUND — outside Hand", "start surface");
requireText(surfaces.deckbuilder, "Basic and Advanced no longer restrict construction", "Deckbuilder surface");
requireText(surfaces.deckbuilderApp, "loadStarter", "Deckbuilder starter handoff");
requireText(surfaces.deckbuilderApp, "window.print", "Deckbuilder print path");
requireText(surfaces.deckbuilderApp, "card.unique && quantity >= 1", "Unique-only add limit");
forbidText(surfaces.deckbuilderApp, "three-copy limit", "Deckbuilder");
forbidText(surfaces.deckbuilderApp, "card.unique ? 1 : 3", "Deckbuilder");
requireText(surfaces.referenceApp, "state.data.cards", "generated reference");
for (const [label, source] of Object.entries(surfaces)) {
  forbidText(source, "Defender's Advantage", label);
  forbidText(source, "Action Opportunity", label);
  forbidText(source, "129", label);
}

const scenarioIds = [...matrix.matchAll(/^## ([A-F]\d{2}) —/gm)].map(match => match[1]);
requireValue(scenarioIds.length === 48 && new Set(scenarioIds).size === 48, `Expected 48 unique Wave D scenarios; found ${scenarioIds.length}/${new Set(scenarioIds).size}.`);
for (const prefix of ["A", "B", "C", "D", "E", "F"]) requireValue(scenarioIds.filter(id => id.startsWith(prefix)).length === 8, `Wave D scenario family ${prefix} must contain eight cases.`);
for (const text of ["v0.6.2 Wave D Test Matrix", "v0.6.2 Wave D Review Checklist", "v0.6.2 Candidate Player Surfaces"]) requireText(readme, text, "documentation index");
forbidText(readme, "129-card", "documentation index");

requireValue(packageJson.scripts["data:v062"] === "node scripts/generate-v062-canonical-data.mjs", "package.json must expose data:v062.");
requireValue(packageJson.scripts["data:v062:write"] === "node scripts/generate-v062-canonical-data.mjs --write", "package.json must expose data:v062:write.");
requireValue(packageJson.scripts["test:v062-live"] === "node scripts/validate-v062-live-propagation.mjs", "package.json must expose test:v062-live.");
requireText(packageJson.scripts.test, "validate-v062-live-propagation.mjs", "npm test");

if (failures.length) {
  console.error("\nv0.6.2 Wave D validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`v0.6.2 Wave D validation passed: ${data.cards.length} cards, ${data.territories.length} Territories, ${data.proposals.length} Proposals, ${starters.decks.length} starters, ${scenarioIds.length} scenarios, and three ${published ? "published" : "candidate"} player surfaces.`);