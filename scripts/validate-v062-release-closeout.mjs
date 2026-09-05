import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`v0.6.2 release closeout validation failed: ${message}`);
  process.exit(1);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const manifest = JSON.parse(read('v0.6.2/release-manifest.json'));
const changes = read('docs/Gauntlet_v0.6.2_Returning_Player_Changes.md');
const checklist = read('docs/Gauntlet_v0.6.2_Release_Closeout_Checklist.md');
const matrix = read('docs/Gauntlet_v0.6.2_Release_Closeout_Test_Matrix.md');
const factionsSource = read('legacy/digital-engine-migration/v0.6.2/factions.ts');
const cardsSource = read('legacy/digital-engine-migration/v0.6.2/cards.ts');
const packageJson = JSON.parse(read('package.json'));

assert(manifest.version === 'v0.6.2', `manifest version is ${String(manifest.version)}`);
assert(manifest.candidateVersion === 'v0.6.2-candidate', 'manifest candidate version is incorrect');
assert(manifest.previousVersion === 'v0.6.1', 'manifest previous version is not v0.6.1');

const candidateState = manifest.status === 'release-candidate' && manifest.published === false;
const publishedState = manifest.status === 'published' && manifest.published === true;
assert(candidateState || publishedState, 'manifest must be a coherent release-candidate or published state');

if (candidateState) {
  assert(JSON.stringify(manifest.propagationPullRequests) === JSON.stringify([493, 496, 500, 502, 505]), 'candidate propagation PR record is incomplete');
  assert(manifest.scenarioCounts?.total === 368, `candidate manifest expected 368 Wave A-E scenarios, received ${String(manifest.scenarioCounts?.total)}`);
  assert(Object.values(manifest.publicDefaults || {}).every((value) => value === 'v0.6.1'), 'all public defaults must remain v0.6.1 before cutover');
} else {
  assert(JSON.stringify(manifest.propagationPullRequests) === JSON.stringify([493, 496, 500, 502, 505, 507]), 'published propagation and closeout PR record is incomplete');
  assert(manifest.scenarioCounts?.closeout === 48, 'published manifest must include 48 closeout scenarios');
  assert(manifest.scenarioCounts?.total === 416, `published manifest expected 416 total scenarios, received ${String(manifest.scenarioCounts?.total)}`);
  assert(Object.values(manifest.publicDefaults || {}).every((value) => value === 'v0.6.2'), 'all public defaults must be v0.6.2 after cutover');
  assert(Boolean(manifest.publicationDate), 'published manifest is missing its publication date');
  assert(manifest.historicalAccess?.releasePackage === 'releases/v0.6.1/', 'published manifest does not preserve the v0.6.1 package');
  assert(manifest.historicalAccess?.rulesArbiter === '/api/v061/rules', 'published manifest does not preserve the v0.6.1 Rules Arbiter route');
}

for (const unresolvedPrefix of [
  'Military alternate victory',
  'Peace Treaty threshold',
  'Leader Ability taxonomy beyond adopted wording',
  'Unadopted balance experiments',
]) {
  assert(manifest.unresolved?.some((item) => item.startsWith(unresolvedPrefix)), `manifest does not preserve unresolved item: ${unresolvedPrefix}`);
}

const scenarioIds = [...matrix.matchAll(/\bRC-(\d{3})\b/g)].map((match) => match[0]);
const uniqueScenarioIds = new Set(scenarioIds);
assert(uniqueScenarioIds.size === 48, `expected 48 unique closeout scenarios, received ${uniqueScenarioIds.size}`);
for (let index = 1; index <= 48; index += 1) {
  const id = `RC-${String(index).padStart(3, '0')}`;
  assert(uniqueScenarioIds.has(id), `missing closeout scenario ${id}`);
}

for (const heading of [
  '# At a glance',
  '# Setup and starting Decks',
  '# Turn and Movement',
  '# Battles',
  '# Front Line, Position, and Capture',
  '# Faction and Leader changes',
  '# Cards, Territories, and Proposals',
  '# What did not change',
  '# Returning-player checklist',
  '# Intentionally unresolved during closeout',
]) {
  assert(changes.includes(heading), `returning-player source is missing ${heading}`);
}

for (const label of ['Mechanical change', 'Terminology change', 'Clarification', 'Test revision']) {
  assert(changes.includes(`**[${label}]**`), `returning-player source does not distinguish ${label}`);
}

for (const term of [
  'Capture → Draw → Opening → Movement → Denouement → Cleanup',
  'Advance, Hold, and Fall Back',
  'Pending battle → Terms → Onset → Gambits',
  'Defensive Edge',
  'Tiebreak Roll',
  'Front Line',
  'Position',
  'retreat',
  'withdrawal',
]) {
  assert(changes.includes(term), `returning-player source is missing required shared-rule term: ${term}`);
}

for (const card of [
  'Landslide',
  'Invasion',
  'Détente',
  'Compound Interest',
  'Extraordinary Rendition',
  "Nature's Altar",
  'Martyrdom',
]) {
  assert(changes.includes(card), `returning-player source is missing ${card}`);
}

for (const faction of ['Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition']) {
  assert(changes.includes(`## ${faction}`), `returning-player source is missing ${faction}`);
}

assert(changes.includes('30-card, 60-value Deck'), 'returning-player source does not preserve starter construction size/value');
assert(changes.includes('Capture before Draw'), 'returning-player checklist does not call out Capture before Draw');
assert(!/\bWave [A-E]\b/.test(changes), 'returning-player source contains implementation-wave language');

assert(factionsSource.includes("begin_rite: ['denouement']"), 'default Begin a Rite timing is not Denouement');
assert(!factionsSource.includes("begin_rite: ['opening']"), "Nature's Altar exception leaked into default Rite timing");
assert(cardsSource.includes("input.phase === 'opening'"), "Nature's Altar does not preserve its special Opening permission");

for (const required of [
  'Final source reconciliation',
  'Returning-player documentation',
  'Publishable package',
  'Public cutover',
  'Final validation',
  'Closeout record',
]) {
  assert(checklist.includes(required), `closeout checklist is missing ${required}`);
}

assert(packageJson.scripts?.['test:v062-release-closeout'] === 'node scripts/validate-v062-release-closeout.mjs', 'missing dedicated release-closeout test command');
assert(String(packageJson.scripts?.test || '').includes('validate-v062-release-closeout.mjs'), 'main test chain does not run the release-closeout validator');
for (const earlierValidator of [
  'validate-v062-shared-rules.mjs',
  'validate-v062-faction-components.mjs',
  'validate-v062-starters-onboarding.mjs',
  'validate-v062-live-propagation.mjs',
  'validate-v062-arbiter-digital.mjs',
  'validate-v062-card-execution.mjs',
]) {
  assert(String(packageJson.scripts?.test || '').includes(earlierValidator), `main test chain dropped ${earlierValidator}`);
}

console.log(`v0.6.2 release closeout validation passed: 48 scenarios, ${publishedState ? 'published' : 'release-candidate'} manifest, returning-player source, and Rite-timing parity.`);
