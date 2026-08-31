import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const ROOT = 'artifacts/reconstruction/clean-v0.6.3/digital';
const IMPLEMENTATION_ROOT = 'src/reconstruction/clean-v063';
const AUTHORITY_SET = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const AUTHORITY_SET_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const parse = (path) => JSON.parse(read(path));
const sha256 = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

const authority = parse(AUTHORITY_SET);
const manifest = parse(`${ROOT}/manifest.json`);
const lifecycle = parse('config/release-lifecycle.json');
const plan = parse('config/reconstruction-version-plan.json');
const currentPointer = read('src/content/current.ts');

assert.equal(authority.target, 'clean-v0.6.3-complete');
assert.equal(authority.authority_set_id, AUTHORITY_SET_ID);
assert.equal(manifest.complete_authority_set_id, AUTHORITY_SET_ID);
assert.equal(manifest.base_merge_commit, '1b084d7ce728b1df1d48985f30a5b452653a7622');
assert.equal(manifest.current_digital_pointer_modified, false);
assert.equal(manifest.publication_unlocked, false);

const authorityByPath = new Map(authority.authority_files.map((entry) => [entry.path, entry]));
for (const entry of Object.values(manifest.authority_files)) {
  const certified = authorityByPath.get(entry.path);
  assert(certified, `Digital manifest references non-authority file: ${entry.path}`);
  assert.equal(certified.sha256, entry.sha256, `Manifest hash differs from certified authority-set hash: ${entry.path}`);
  assert.equal(sha256(entry.path), entry.sha256, `Authority file drifted: ${entry.path}`);
}

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(plan.publication_unlocked, false);
assert(currentPointer.includes("export * from './v061';"));
assert(currentPointer.includes("CURRENT_RULES_VERSION = 'v0.6.1'"));

const rulebook = read(manifest.authority_files.rulebook.path);
for (const marker of [
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'Territory arrangement occurs after the player has chosen the opening discard and knows the three-card opening Hand.',
  'These are independent routes. A Last Stand does not require control of the final Territory first',
  'A card with an **Asset** effect has an inherent banking Action:',
  'does not count as taking an Action unless the effect expressly says it does;',
  '**Reserve is the default Tactic source.**',
  "Unless an effect gives a different instruction, when a card leaves play, cards bound to it are put in their owners' Discard Piles.",
  'resolve reveal-stage interference before ordinary effects at that stage;',
]) {
  assert(rulebook.includes(marker), `Clean v0.6.3 Rulebook missing required digital marker: ${marker}`);
}

const canonical = parse(manifest.authority_files.canonical_structured_data.path);
assert.equal(canonical.target, 'clean-v0.6.3-canonical-structured-authority');
assert.equal(canonical.publication_unlocked, false);
assert.equal(canonical.gameplay.cards.length, 128);
assert.equal(canonical.gameplay.territories.length, 25);
assert.equal(canonical.gameplay.factions.length, 6);
const deck = canonical.gameplay.deck_construction;
assert.deepEqual([deck.opening_draw, deck.opening_discard, deck.opening_hand], [4, 1, 3]);
assert.equal(deck.opening_discard_face_up, true);
assert.equal(deck.territory_arrangement_after_opening_selection, true);
assert.equal(deck.first_player_after_territory_arrangement, true);
const lastStand = canonical.gameplay.battlefield.last_stand;
assert.equal(lastStand.final_territory_control_required, false);
assert.equal(lastStand.final_territory_capture_required, false);
assert.equal(lastStand.separate_movement_sequence_required, true);

const byId = new Map(canonical.gameplay.cards.map((card) => [card.id, card]));
const territoryById = new Map(canonical.gameplay.territories.map((territory) => [territory.id, territory]));
assert.equal(byId.get('neutral-reserves')?.name, 'Second Line');
assert.equal(territoryById.get('territory-smuggler-s-pass')?.name, "Smuggler's Run");
const effect = (id, label) => byId.get(id)?.effects?.find((item) => item.label === label)?.text ?? '';
assert(effect('financiers-margin-loan', 'Asset').includes('While this remains banked, you may not draw at the start of your turn.'));
assert.equal(effect('neutral-armistice', 'Asset'), 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.');
assert.equal(effect('neutral-contingency-plan', 'Asset'), 'If this card is Removed, +1 Card.');
assert.equal(effect('neutral-contingency-plan', 'Gambit/Tactic'), 'If your opponent controls more Territories than you, +2 Battle Total.');
assert(byId.get('neutral-manifest-destiny')?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.'));

const implementation = [
  read(`${IMPLEMENTATION_ROOT}/content.ts`),
  read(`${IMPLEMENTATION_ROOT}/rules.ts`),
  read(`${IMPLEMENTATION_ROOT}/cards.ts`),
].join('\n');
assert(implementation.includes("from '../clean-v062/rules'"), 'Clean v0.6.3 rules must inherit the reconstructed clean v0.6.2 executable base.');
assert(implementation.includes("from '../clean-v062/cards'"), 'Clean v0.6.3 cards must inherit the reconstructed clean v0.6.2 executable base.');
assert(implementation.includes("complete-authority/canonical-structured-data.json"), 'Clean v0.6.3 content must bind directly to complete authority structured data.');
for (const forbidden of [
  "from '../v062/", "from '../v063/", 'src/v062/', 'src/v063/', 'src/content/v063',
  'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
  'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json',
]) {
  assert(!implementation.includes(forbidden), `Clean v0.6.3 implementation contains forbidden historical source: ${forbidden}`);
}

for (const marker of ['createInitialV063FrontLineState', 'victoryAfterFrontLineAdvance', 'canInitiateV063LastStand', 'createV063LastStandBattle', 'beginEffectGrantedMovement']) {
  assert(read(`${IMPLEMENTATION_ROOT}/rules.ts`).includes(marker), `Missing v0.6.3 rules implementation marker: ${marker}`);
}
for (const marker of ['hasInherentBankAction', 'additionalTacticPermission', 'defaultBoundCardDiscardWhenHostLeavesPlay', 'orderRevealStageEffects', 'resolveMarginLoanAfterIncome']) {
  assert(read(`${IMPLEMENTATION_ROOT}/cards.ts`).includes(marker), `Missing v0.6.3 card implementation marker: ${marker}`);
}

const changed = changedFiles();
const required = [
  '.github/workflows/build-clean-v063-digital.yml',
  `${ROOT}/manifest.json`, `${ROOT}/source-boundary.md`, `${ROOT}/validation-status.md`,
  'scripts/validate-clean-v063-digital.mjs',
  `${IMPLEMENTATION_ROOT}/content.ts`, `${IMPLEMENTATION_ROOT}/rules.ts`, `${IMPLEMENTATION_ROOT}/rules.test.ts`,
  `${IMPLEMENTATION_ROOT}/cards.ts`, `${IMPLEMENTATION_ROOT}/cards.test.ts`,
].sort();
assert.deepEqual([...changed].sort(), required, 'Clean v0.6.3 digital diff escaped its exact 10-file boundary.');

console.log(`Clean v0.6.3 digital validated: ${changed.length}-file isolated diff; complete authority set ${AUTHORITY_SET_ID}; current v0.6.1 pointer unchanged.`);

function changedFiles() {
  const args = process.env.GITHUB_BASE_REF ? ['diff', '--name-only', 'HEAD^1', 'HEAD'] : ['diff', '--name-only', 'HEAD~1', 'HEAD'];
  return execFileSync('git', args, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}
