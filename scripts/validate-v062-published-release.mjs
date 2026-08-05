import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const fail = (message) => {
  console.error(`v0.6.2 published-release validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const requiredFiles = [
  'releases/v0.6.2/README.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Reference_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_First_Game_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json',
  'releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',
  'releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Release_Notes.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json',
  'releases/v0.6.2/deployment-status.json',
  'v0.6.2/rulebook/index.html',
  'v0.6.2/changes/index.html',
  'rules-assistant/v062-published-corpus.js',
  'rules-assistant/worker-v062.js',
  'src/content/current.ts'
];
for (const file of requiredFiles) assert(exists(file), `missing ${file}`);

const sourceManifest = JSON.parse(read('v0.6.2/release-manifest.json'));
const releaseManifest = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json'));
const deployment = JSON.parse(read('releases/v0.6.2/deployment-status.json'));
const canonical = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json'));
const starters = JSON.parse(read('releases/v0.6.2/Gauntlet_v0.6.2_Starter_Decks.json'));
const rulebook = read('releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md');
const returning = read('releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md');
const home = read('index.html');
const widget = read('rules-assistant/widget.js');
const workerEntry = read('rules-assistant/worker-entry.js');
const publishedWorker = read('rules-assistant/worker-v062.js');
const corpus = read('rules-assistant/v062-published-corpus.js');
const currentContent = read('src/content/current.ts');
const packageJson = JSON.parse(read('package.json'));

assert(sourceManifest.version === 'v0.6.2' && sourceManifest.published === true && sourceManifest.status === 'published', 'source manifest is not published v0.6.2');
assert(Object.values(sourceManifest.publicDefaults).every((value) => value === 'v0.6.2'), 'public defaults are mixed');
assert(sourceManifest.scenarioCounts.total === 416, 'source manifest must include 368 propagation plus 48 closeout scenarios');
assert(releaseManifest.version === 'v0.6.2' && releaseManifest.status === 'published', 'release manifest is not published v0.6.2');
assert(releaseManifest.scenario_counts.total === 416, 'release manifest scenario total is wrong');
assert(deployment.canonical_public_version === 'v0.6.2', 'deployment status is not v0.6.2');
assert(Object.values(deployment.public_defaults).every((value) => value === 'v0.6.2'), 'deployment public defaults are mixed');

assert(canonical.version === 'v0.6.2', 'canonical JSON still reports a candidate version');
assert(canonical.status === 'Published playtest edition', 'canonical JSON is not published');
assert(canonical.cards.length === 128, `expected 128 cards, found ${canonical.cards.length}`);
assert(canonical.territories.length === 25, `expected 25 Territories, found ${canonical.territories.length}`);
assert(canonical.proposals.length === 9, `expected 9 Proposals, found ${canonical.proposals.length}`);
assert(canonical.cards.filter((card) => card.allegiance === 'Neutral').length === 50, 'Neutral pool must contain 50 titles');
for (const faction of ['Military','Diplomats','Financiers','Intelligence','Mystics','Inquisition']) {
  assert(canonical.cards.filter((card) => card.allegiance === faction).length === 13, `${faction} pool must contain 13 titles`);
}
for (const title of ['Landslide','Invasion','Détente','Compound Interest','Extraordinary Rendition',"Nature's Altar",'Martyrdom']) {
  assert(canonical.cards.some((card) => card.name === title), `canonical data is missing ${title}`);
}

assert(starters.version === 'v0.6.2' && starters.status === 'published', 'starter catalog is not published v0.6.2');
const starterList = Array.isArray(starters) ? starters : (starters.decks ?? starters.starters);
assert(Array.isArray(starterList) && starterList.length === 12, 'release package must contain twelve starter Decks');

for (const marker of ['Capture → Draw → Opening → Movement → Denouement → Cleanup','Pending battle → Terms → Onset → Gambits','Defensive Edge','Tiebreak Roll','Front Line','Begin a Rite — Denouement']) {
  assert(rulebook.includes(marker), `rulebook is missing ${marker}`);
}
for (const obsolete of ['Action Opportunity before movement','Action Opportunity after movement',"Defender's Advantage",'During the Movement step, choose one:\n\n- **Advance:** move one position toward the opponent\'s end.\n- **Hold:** remain in the current position.\n- **Withdraw:**']) {
  assert(!rulebook.includes(obsolete), `rulebook retains obsolete text: ${obsolete}`);
}

for (const heading of ['# At a glance','# Setup and starting Decks','# Turn and Movement','# Battles','# Front Line, Position, and Capture','# Faction and Leader changes','# Returning-player checklist']) {
  assert(returning.includes(heading), `returning-player guide is missing ${heading}`);
}
assert(!returning.includes('Release-candidate source'), 'returning-player guide still identifies itself as candidate');
assert(returning.includes('v0.6.2 is the current canonical playtest release'), 'returning-player guide lacks publication status');

assert(home.includes('Current canonical playtest edition · v0.6.2'), 'homepage does not identify v0.6.2');
assert(home.includes('<dt>128</dt><dd>Playable cards</dd>'), 'homepage card count is not 128');
for (const href of ['v0.6.2/start/','v0.6.2/deckbuilder/','v0.6.2/rulebook/']) assert(home.includes(href), `homepage is missing ${href}`);

assert(widget.includes('version: "v0.6.2"'), 'public Rules Arbiter widget is not v0.6.2');
assert(widget.includes('loadPublishedV062RulesCorpus'), 'widget does not use the published corpus');
assert(workerEntry.includes('worker-v062.js'), 'worker dispatcher does not import the published worker');
assert(workerEntry.includes('url.pathname === "/api/rules"'), 'public /api/rules is not routed explicitly');
assert(workerEntry.includes('/api/v061/rules'), 'historical v0.6.1 Rules Arbiter route is missing');
assert(publishedWorker.includes('const RULES_VERSION = "v0.6.2"'), 'published worker has the wrong version');
assert(publishedWorker.includes('candidate: false'), 'published worker still reports candidate status');
assert(corpus.includes('releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md'), 'published corpus does not cite release sources');
assert(currentContent.includes("CURRENT_RULES_VERSION = 'v0.6.2'"), 'digital default is not v0.6.2');

assert(packageJson.scripts?.['release:v062:build'] === 'node scripts/build-v062-release-runner.mjs', 'missing safe release build runner');
assert(packageJson.scripts?.['release:v062:check'] === 'node scripts/build-v062-release-runner.mjs --check && node scripts/validate-v062-published-release.mjs', 'missing release check script');
assert(String(packageJson.scripts?.test || '').includes('validate-v062-published-release.mjs'), 'main test chain does not run published-release validation');

console.log('Published Gauntlet v0.6.2 release validation passed: 128 cards, 25 Territories, 9 Proposals, 12 starters, 416 scenarios, and synchronized public defaults.');
