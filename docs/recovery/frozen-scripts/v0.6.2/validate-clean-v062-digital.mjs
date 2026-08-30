import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const AUTHORITY_SET_ID = '563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b';
const ROOT = 'artifacts/reconstruction/clean-v0.6.2/digital';
const IMPLEMENTATION_ROOT = 'src/reconstruction/clean-v062';
const AUTHORITY_MANIFEST = 'artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const parse = (path) => JSON.parse(read(path));
const sha256 = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

const authority = parse(AUTHORITY_MANIFEST);
const manifest = parse(`${ROOT}/manifest.json`);
const lifecycle = parse('config/release-lifecycle.json');
const reconstructionPlan = parse('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');
const sourceBoundary = read(`${ROOT}/source-boundary.md`);
const rules = read(`${IMPLEMENTATION_ROOT}/rules.ts`);
const cards = read(`${IMPLEMENTATION_ROOT}/cards.ts`);
const factions = read(`${IMPLEMENTATION_ROOT}/factions.ts`);
const implementation = [rules, cards, factions].join('\n');

assert.equal(authority.target, 'clean-v0.6.2');
assert.equal(authority.authority_set_id, AUTHORITY_SET_ID, 'clean v0.6.2 authority-set ID drifted');
assert.equal(manifest.target, 'clean-v0.6.2-digital-base');
assert.equal(manifest.authority_set_id, AUTHORITY_SET_ID);
assert.equal(manifest.content_adapter_included, false);
assert.equal(manifest.current_digital_pointer_modified, false);
assert.equal(manifest.publication_unlocked, false);

const authorityEntries = new Map(authority.authority_files.map((entry) => [entry.path, entry]));
for (const entry of Object.values(manifest.certified_authority_files)) {
  const certified = authorityEntries.get(entry.path);
  assert(certified, `Digital manifest references a file outside the certified authority set: ${entry.path}`);
  assert.equal(certified.sha256, entry.sha256, `Authority manifest hash disagreement: ${entry.path}`);
  assert.equal(sha256(entry.path), entry.sha256, `Certified authority file drifted: ${entry.path}`);
}
assert.equal(Object.keys(manifest.certified_authority_files).length, 7);
assert.equal(authorityEntries.size, 7);

assert.equal(lifecycle.current_release, 'v0.6.1', 'v0.6.1 must remain current/public');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(reconstructionPlan.publication_unlocked, false, 'reconstruction publication must remain locked');
assert(currentPointer.includes("export * from './v061';"), 'current digital pointer must remain v0.6.1');
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"), 'current digital version must remain v0.6.1');

const rulebookPath = manifest.certified_authority_files.rulebook.path;
const rulebook = read(rulebookPath);
for (const marker of [
  'Capture → Draw → Opening → Movement → Denouement → Cleanup',
  'Normal Capture advances the Front Line by no more than one Territory per turn',
  'Capturing the opponent\'s final Territory is necessary but does not by itself win the game in v0.6.2.',
  'When a player loses while at the final Territory at their end, they retreat beyond the Territory column.',
  'The opponent\'s final Territory must be added to that Front Line before the attacker may begin the normal Last Stand sequence.',
  'If an active battle ends by withdrawal at any time after Onset, carry out the withdrawal and complete the remaining non-result steps of the Aftermath.'
]) {
  assert(rulebook.includes(marker), `Clean v0.6.2 Rulebook missing required digital rule marker: ${marker}`);
}

const sourceMarkers = [
  [manifest.certified_authority_files.military.path, '## Invasion', '**Action — Opening:** During your Movement this turn, you may advance up to two additional Positions'],
  [manifest.certified_authority_files.diplomat.path, '## Détente', 'already ratified when you offered it'],
  [manifest.certified_authority_files.financier.path, '## Compound Interest', 'Place it face up in your Treasury or put it in your Discard Pile.'],
  [manifest.certified_authority_files.intelligence.path, '## Extraordinary Rendition', 'Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able.'],
  [manifest.certified_authority_files.mystics.path, "## Nature's Altar", 'A Rite begun this way may complete during that turn if you control this Territory when its completion condition and timing are satisfied.'],
  [manifest.certified_authority_files.inquisition.path, '## Martyrdom', 'After battle cards are cleared, set your Conviction to 4 and put Martyrdom in your Graveyard.'],
];
for (const [path, heading, marker] of sourceMarkers) {
  const text = read(path);
  assert(text.includes(heading), `${path} missing required card heading ${heading}`);
  assert(text.includes(marker), `${path} missing required authority marker for ${heading}: ${marker}`);
}

const landslideEvidence = manifest.supplemental_decision_evidence?.find((entry) => entry.issue === 481);
assert(landslideEvidence, 'Landslide must trace to accepted issue #481 decision evidence');
assert.equal(landslideEvidence.url, 'https://github.com/tymonius/Gauntlet/issues/481');
assert(landslideEvidence.scope.includes('Landslide'));
assert(sourceBoundary.includes('Landslide only'));
assert(sourceBoundary.includes('issue #481'));

for (const forbidden of [
  "../v062/",
  "../v063/",
  'src/v062/',
  'src/v063/',
  'src/content/v062',
  'src/content/v063',
  'releases/v0.6.2/',
  'v0.6.2/data/'
]) {
  assert(!implementation.includes(forbidden), `Clean digital implementation imports forbidden historical source: ${forbidden}`);
}

for (const marker of [
  'createInitialFrontLineState',
  'transfersFromOpponent',
  'outsideOwnEnd',
  'canInitiateLastStand',
  'createLastStandBattle',
  'victoryFromResolvedLastStand'
]) {
  assert(rules.includes(marker), `Clean shared rules missing required implementation marker: ${marker}`);
}
for (const marker of [
  'resolveLandslideRetreatChain',
  'resolveCompoundInterest',
  'extraordinaryRenditionDiscardOrder',
  'canCompleteAltarRiteThisTurn',
  'playMartyrdomBeforeBattleCardsClear',
  'clearBattleCardsWithMartyrdom'
]) {
  assert(cards.includes(marker), `Clean card layer missing required implementation marker: ${marker}`);
}
for (const marker of [
  'FINANCIER_STARTING_CAPITAL = 2',
  'after_capture_effects_before_draw',
  'guardiansRequiredValue',
  'twoPhasePermissionActive',
  'activatesTwoPhasePermission: false'
]) {
  assert(factions.includes(marker), `Clean faction layer missing required implementation marker: ${marker}`);
}

const changed = changedFiles();
const allowedPrefixes = [
  `${IMPLEMENTATION_ROOT}/`,
  `${ROOT}/`,
  'scripts/validate-clean-v062-digital.mjs',
  '.github/workflows/build-clean-v062-digital.yml',
];
const unexpected = changed.filter((path) => !allowedPrefixes.some((allowed) =>
  allowed.endsWith('/') ? path.startsWith(allowed) : path === allowed
));
assert.deepEqual(unexpected, [], `Clean v0.6.2 digital diff escaped reconstruction boundary: ${unexpected.join(', ')}`);

const requiredChanged = [
  `${IMPLEMENTATION_ROOT}/rules.ts`,
  `${IMPLEMENTATION_ROOT}/rules.test.ts`,
  `${IMPLEMENTATION_ROOT}/cards.ts`,
  `${IMPLEMENTATION_ROOT}/cards.test.ts`,
  `${IMPLEMENTATION_ROOT}/factions.ts`,
  `${IMPLEMENTATION_ROOT}/factions.test.ts`,
  `${ROOT}/manifest.json`,
  `${ROOT}/source-boundary.md`,
  `${ROOT}/validation-status.md`,
  'scripts/validate-clean-v062-digital.mjs',
  '.github/workflows/build-clean-v062-digital.yml',
];
for (const path of requiredChanged) {
  assert(changed.includes(path), `Expected clean v0.6.2 digital file missing from diff: ${path}`);
}
assert.equal(changed.length, requiredChanged.length, 'Clean v0.6.2 digital diff contains an unexplained file');

console.log(
  `Clean v0.6.2 digital base validated: ${changed.length}-file isolated diff; seven certified authority hashes exact; ` +
  'Landslide explicitly traced to accepted #481 evidence; current v0.6.1 pointer unchanged.'
);

function changedFiles() {
  try {
    const args = process.env.GITHUB_BASE_REF
      ? ['diff', '--name-only', 'HEAD^1', 'HEAD']
      : ['diff', '--name-only', 'HEAD~1', 'HEAD'];
    return execFileSync('git', args, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch (error) {
    console.error('Could not determine clean v0.6.2 digital diff boundary', error);
    process.exit(1);
  }
}
