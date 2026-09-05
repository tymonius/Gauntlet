import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildV062CanonicalData,
  V062_VERSION
} from "../v0.6.2/data/canonical-data.js";
import {
  buildV062RulesCorpus,
  V062_CORPUS_SOURCES
} from "../rules-assistant/v062-corpus.js";
import {
  resolveV062DeterministicRuling,
  V062_DETERMINISTIC_CASE_COUNT
} from "../rules-assistant/rules-deterministic-v062.js";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const fail = (message) => {
  console.error(`v0.6.2 Wave E validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const matrix = read("docs/Gauntlet_v0.6.2_Wave_E_Test_Matrix.md");
const scenarioIds = [...matrix.matchAll(/\bWE-(\d{3})\b/g)].map((match) => match[0]);
const uniqueScenarioIds = new Set(scenarioIds);
assert(uniqueScenarioIds.size === 80, `expected 80 unique Wave E scenarios, received ${uniqueScenarioIds.size}`);
for (let index = 1; index <= 80; index += 1) {
  const id = `WE-${String(index).padStart(3, "0")}`;
  assert(uniqueScenarioIds.has(id), `missing scenario ${id}`);
}

const packageJson = JSON.parse(read("package.json"));
assert(String(packageJson.scripts?.test || "").includes("validate-v062-arbiter-digital.mjs"), "npm test does not run the Wave E validator");
assert(packageJson.scripts?.["test:v062-arbiter-digital"] === "node scripts/validate-v062-arbiter-digital.mjs", "missing dedicated Wave E test script");

const workerEntry = read("rules-assistant/worker-entry.js");
const candidateWorker = read("rules-assistant/worker-v062-candidate.js");
const corpusSource = read("rules-assistant/v062-corpus.js");
const deterministicSource = read("rules-assistant/rules-deterministic-v062.js");
const digitalRules = read("legacy/digital-engine-migration/v0.6.2/rules.ts");
const digitalTests = read("legacy/digital-engine-migration/v0.6.2/rules.test.ts");
const contentLoader = read("src/content/v062.ts");

assert(workerEntry.includes('import worker from "./worker-v061.js"'), "historical v0.6.1 worker is not imported");
assert(workerEntry.includes('import candidateWorker from "./worker-v062-candidate.js"'), "candidate worker is not imported");
assert(workerEntry.includes('import publishedWorker from "./worker-v062.js"'), "published v0.6.2 worker is not imported");
assert(workerEntry.includes('url.pathname.startsWith("/api/v062-candidate/")'), "candidate API route is not version-separated");
assert(workerEntry.includes('url.pathname === "/api/v062/rules"'), "published v0.6.2 API route is not explicit");
assert(workerEntry.includes("return candidateWorker.fetch(rewriteCandidatePath(request)"), "candidate route does not reach the candidate worker");
assert(candidateWorker.includes('const RULES_VERSION = "v0.6.2-candidate"'), "candidate worker version is incorrect");
assert(candidateWorker.includes('publishedVersion: "v0.6.1"'), "candidate response does not identify the publication baseline used during Wave E");
for (const responseType of ["written_rule", "clarification", "provisional_ruling", "out_of_scope"]) {
  assert(candidateWorker.includes(responseType), `candidate worker does not expose ${responseType}`);
}
assert(candidateWorker.includes("resolveV062DeterministicRuling"), "candidate worker does not prioritize deterministic rulings");
assert(candidateWorker.includes("buildLocalFallbackAnswer"), "candidate worker lacks source-only degradation");

assert(V062_CORPUS_SOURCES.length === 5, `expected five candidate corpus documents, received ${V062_CORPUS_SOURCES.length}`);
for (const sourcePath of V062_CORPUS_SOURCES) {
  assert(fs.existsSync(path.join(root, sourcePath)), `missing candidate corpus source ${sourcePath}`);
  assert(corpusSource.includes(sourcePath), `corpus builder does not list ${sourcePath}`);
}

const baseData = JSON.parse(read("releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"));
const markdownSources = V062_CORPUS_SOURCES.map((sourcePath) => ({
  sourcePath,
  sourceUrl: `https://gauntlet.run/${sourcePath}`,
  markdown: read(sourcePath)
}));
const corpus = buildV062RulesCorpus({ baseData, markdownSources });
assert(corpus.version === V062_VERSION, `candidate corpus reports ${corpus.version}`);
assert(corpus.documents.length > 150, `candidate corpus is unexpectedly small (${corpus.documents.length} documents)`);
assert(!corpus.documents.some((document) => document.sourcePath === "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json"), "candidate corpus leaks the v0.6.1 canonical fallback path");
for (const sourcePath of V062_CORPUS_SOURCES) {
  assert(corpus.documents.some((document) => document.sourcePath === sourcePath), `candidate corpus has no documents from ${sourcePath}`);
}

assert(V062_DETERMINISTIC_CASE_COUNT >= 30, `expected at least 30 deterministic cases, received ${V062_DETERMINISTIC_CASE_COUNT}`);
const deterministicChecks = [
  ["If Terms are accepted, do we still perform Aftermath?", "accepted-terms-prevent-onset"],
  ["How does Defensive Edge resolve a tied battle?", "defensive-edge"],
  ["What is the Tiebreak Roll?", "tiebreak-roll"],
  ["Does Fall Back count as retreat?", "movement-choices"],
  ["How does Extraordinary Rendition work?", "extraordinary-rendition"],
  ["How does Nature's Altar work?", "natures-altar"],
  ["How does Martyrdom work?", "martyrdom"],
  ["How does Landslide work?", "landslide"]
];
for (const [question, expectedId] of deterministicChecks) {
  const ruling = resolveV062DeterministicRuling({ question });
  assert(ruling?.id === expectedId, `deterministic question did not resolve to ${expectedId}: ${question}`);
}
assert(!/\bAction Opportunity\b/.test(deterministicSource), "candidate deterministic answers use retired Action Opportunity terminology");
assert(!/\bdefender(?:'s|s)? advantage\b/i.test(deterministicSource), "candidate deterministic answers use retired defender advantage terminology");

const data = buildV062CanonicalData(baseData);
assert(data.version === V062_VERSION, `effective data reports ${data.version}`);
assert(data.cards.length === 128, `expected 128 cards, received ${data.cards.length}`);
assert(data.territories.length === 25, `expected 25 Territories, received ${data.territories.length}`);
assert(data.proposals.length === 9, `expected nine Proposals, received ${data.proposals.length}`);
assert(data.cards.filter((card) => card.allegiance === "Neutral").length === 50, "Neutral pool is not 50 cards");
for (const faction of data.factions) {
  assert(data.cards.filter((card) => card.allegiance === faction.name).length === 13, `${faction.name} pool is not 13 cards`);
}

const expectedCards = new Map([
  ["Invasion", ["Military", 4]],
  ["Landslide", ["Neutral", 4]],
  ["Détente", ["Diplomats", 3]],
  ["Compound Interest", ["Financiers", 4]],
  ["Extraordinary Rendition", ["Intelligence", 4]],
  ["Nature's Altar", ["Mystics", 4]],
  ["Martyrdom", ["Inquisition", 5]]
]);
for (const [name, [allegiance, cost]] of expectedCards) {
  const card = data.cards.find((entry) => entry.name === name);
  assert(card, `missing ${name}`);
  assert(card.allegiance === allegiance, `${name} allegiance is ${card.allegiance}`);
  assert(card.cost === cost, `${name} cost is ${card.cost}`);
}
assert(data.cards.filter((card) => card.name === "Invasion").length === 1, "Invasion appears more than once");
assert(data.faction_rules.financiers.starting_capital === 2, "Financiers do not start with 2 Capital");
assert(JSON.stringify(data.faction_rules.mystics.guardians_protection_values) === JSON.stringify({ first_rite: 1, second_rite: 2, third_rite: 3, ritual: 4 }), "Guardians scaling is not 1/2/3/4");
assert(JSON.stringify(data.faction_rules.inquisition.purge_phases) === JSON.stringify(["Opening", "Denouement"]), "Purge phases are not Opening and Denouement");

for (const exportedFunction of [
  "createTurnState",
  "advanceTurnPhase",
  "canTakeAction",
  "takeAction",
  "beginMovement",
  "applyMovementChoice",
  "controlsTerritory",
  "applyNormalCapture",
  "createPendingBattle",
  "acceptTerms",
  "refuseTerms",
  "defenderHasDefensiveEdge",
  "resolveBattleOutcome",
  "resolveWithdrawal",
  "applyBattleOutcome"
]) {
  assert(digitalRules.includes(`function ${exportedFunction}`), `digital rules layer does not export ${exportedFunction}`);
}
assert(digitalRules.includes("'capture',\n  'draw',\n  'opening',\n  'movement',\n  'denouement',\n  'cleanup'"), "digital turn sequence is incorrect");
assert(digitalTests.includes("accepted Terms prevent Onset and Aftermath"), "digital tests do not cover accepted Terms");
assert(digitalTests.includes("post-Onset withdrawal completes non-result Aftermath"), "digital tests do not cover post-Onset withdrawal");
assert(digitalTests.includes("Position beyond the Front Line does not itself create control"), "digital tests do not cover Position/control distinction");
assert(contentLoader.includes("buildV062CanonicalData"), "typed digital content does not consume the Wave D builder");
assert(contentLoader.includes("content.cards.length !== 128"), "typed digital content does not enforce the 128-card pool");

console.log(`v0.6.2 Wave E validation passed: ${corpus.documents.length} corpus documents, ${V062_DETERMINISTIC_CASE_COUNT} deterministic rulings, 128 cards, and 80 scenarios.`);
