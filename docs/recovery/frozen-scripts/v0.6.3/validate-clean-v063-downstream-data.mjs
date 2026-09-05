import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { V063_STARTER_CATALOG } from '../v0.6.3/data/starter-decks-candidate.js';
import { buildOutputs } from './build-clean-v063-downstream-data.mjs';

const root = process.cwd();
const targetRoot = 'artifacts/reconstruction/clean-v0.6.3/downstream';
const canonicalPath = `${targetRoot}/canonical-data.json`;
const starterPath = `${targetRoot}/starter-decks.json`;
const manifestPath = `${targetRoot}/manifest.json`;
const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const lifecyclePath = 'config/release-lifecycle.json';
const planPath = 'config/reconstruction-version-plan.json';
const auditPath = 'docs/Gauntlet_v0.6.3_Starter_Deck_Finalization.md';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const structuredAuthorityPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
const forbiddenInOutputs = [
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',
  'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json',
];

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const effectText = (card, label) => card.effects?.find((effect) => effect.label === label)?.text;

const expected = buildOutputs({ write: false });
for (const [file, text] of expected) {
  assert(fs.existsSync(path.join(root, file)), `Missing committed generated output ${file}.`);
  assert.equal(read(file), text, `Committed generated output drifted: ${file}.`);
}

const canonical = readJson(canonicalPath);
const starters = readJson(starterPath);
const manifest = readJson(manifestPath);
const certification = readJson(certificationPath);
const lifecycle = readJson(lifecyclePath);
const plan = readJson(planPath);
const audit = read(auditPath);

assert.equal(canonical.version, 'clean-v0.6.3-downstream');
assert.match(canonical.status, /not published/i);
assert.equal(canonical.publication_unlocked, false);
assert.equal(canonical.authority_set_id, authoritySetId);
assert.equal(canonical.structured_authority?.path, structuredAuthorityPath);
assert.equal(canonical.structured_authority?.sha256, sha256(read(structuredAuthorityPath)));
assert.equal(canonical.structured_authority?.role, 'complete_machine_readable_authority');
assert.equal(canonical.cards.length, 128);
assert.equal(canonical.territories.length, 25);
assert.equal(canonical.factions.length, 6);
assert.equal(canonical.factions.reduce((sum, faction) => sum + (faction.leaders?.length ?? 0), 0), 12);

const counts = canonical.cards.reduce((map, card) => {
  map[card.allegiance] = (map[card.allegiance] ?? 0) + 1;
  return map;
}, {});
assert.deepEqual(counts, {
  Mystics: 13,
  Inquisition: 13,
  Neutral: 50,
  Intelligence: 13,
  Military: 13,
  Financiers: 13,
  Diplomats: 13,
});

const cardsById = new Map(canonical.cards.map((card) => [card.id, card]));
const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
const territoriesById = new Map(canonical.territories.map((territory) => [territory.id, territory]));
assert.equal(cardsById.get('neutral-reserves')?.name, 'Second Line');
assert.equal(territoriesById.get('territory-smuggler-s-pass')?.name, "Smuggler's Run");
assert(!canonical.cards.some((card) => card.name === 'Reserves'));
assert(!canonical.territories.some((territory) => territory.name === "Smuggler's Pass"));

const armistice = cardsByName.get('Armistice');
const contingency = cardsByName.get('Contingency Plan');
const manifestDestiny = cardsByName.get('Manifest Destiny');
assert.equal(effectText(armistice, 'Asset'), "Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.");
assert.equal(effectText(contingency, 'Asset'), 'If this card is Removed, +1 Card.');
assert.equal(effectText(contingency, 'Gambit/Tactic'), 'If your opponent controls more Territories than you, +2 Battle Total.');
assert(manifestDestiny?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.'));
assert.equal(cardsByName.get('Extraordinary Rendition')?.card_form, 'Asset');
assert.equal(effectText(cardsByName.get('Détente'), 'Action'), 'Bank this card. You may have only one banked Détente.');
assert.equal(cardsByName.get('Protracted Siege')?.card_form, 'Territory Overlay');

assert.equal(starters.version, 'clean-v0.6.3-downstream');
assert.match(starters.status, /not published/i);
assert.equal(starters.authority_set_id, authoritySetId);
assert.equal(starters.approval?.pr, 573);
assert.equal(starters.approval?.merge_commit, 'e13cd423bacc4c965aad9f8ed622100bef88d48f');
assert.equal(starters.decks.length, 12);
assert.deepEqual(starters.decks, V063_STARTER_CATALOG.decks, 'PR #573 starter compositions or strategy metadata drifted during reconstruction.');
assert.deepEqual(canonical.starter_decks, starters, 'Canonical downstream data must embed the exact validated starter catalog.');

const factionsById = new Map(canonical.factions.map((faction) => [faction.id, faction]));
const territoriesByName = new Map(canonical.territories.map((territory) => [territory.name, territory]));
const seenPairs = new Set();
const usedTitles = new Set();
for (const deck of starters.decks) {
  const faction = factionsById.get(deck.factionId);
  assert(faction, `${deck.name}: unknown faction.`);
  const pair = `${deck.factionId}/${deck.leaderId}`;
  assert(!seenPairs.has(pair), `${deck.name}: duplicate faction/Leader pair.`);
  seenPairs.add(pair);
  assert(faction.leaders.some((leader) => slug(leader.name) === deck.leaderId), `${deck.name}: invalid Leader.`);
  let count = 0;
  let value = 0;
  for (const item of deck.cards) {
    const card = cardsByName.get(item.name);
    assert(card, `${deck.name}: unknown card ${item.name}.`);
    assert(card.allegiance === 'Neutral' || slug(card.allegiance) === deck.factionId, `${deck.name}: illegal ${item.name}.`);
    assert(!(card.unique && item.quantity > 1), `${deck.name}: duplicated Unique ${item.name}.`);
    count += item.quantity;
    value += item.quantity * card.cost;
    usedTitles.add(item.name);
  }
  assert.equal(count, 30, `${deck.name}: expected 30 cards.`);
  assert.equal(value, 60, `${deck.name}: expected 60 Deckbuilding Value.`);
  assert.equal(deck.territories.length, 3);
  assert.equal(new Set(deck.territories).size, 3);
  assert(deck.territories.every((name) => territoriesByName.has(name)), `${deck.name}: unknown Territory.`);
  assert(deck.territories.filter((name) => territoriesByName.get(name)?.arena).length <= 1, `${deck.name}: more than one Arena.`);
}
assert.equal(seenPairs.size, 12);
assert.equal(usedTitles.size, 110);

assert.equal(manifest.target, 'clean-v0.6.3-downstream');
assert.equal(manifest.status, 'downstream_candidate_pending_merge_review');
assert.equal(manifest.authority_set_id, authoritySetId);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
assert.equal(manifest.starter_approval?.pr, 573);
assert.equal(manifest.structured_authority?.path, structuredAuthorityPath);
assert.equal(manifest.structured_authority?.role, 'complete_machine_readable_authority');
for (const entry of manifest.outputs) {
  const text = read(entry.path);
  assert.equal(sha256(text), entry.sha256, `Manifest SHA drifted: ${entry.path}`);
  assert.equal(Buffer.byteLength(text, 'utf8'), entry.bytes, `Manifest byte count drifted: ${entry.path}`);
  assert.equal(text.split('\n').length, entry.lines, `Manifest line count drifted: ${entry.path}`);
}

const canonicalText = read(canonicalPath);
const starterText = read(starterPath);
for (const forbidden of forbiddenInOutputs) {
  assert(!canonicalText.includes(forbidden), `Forbidden withdrawn authority reference in canonical output: ${forbidden}`);
  assert(!starterText.includes(forbidden), `Forbidden withdrawn authority reference in starter output: ${forbidden}`);
}

assert.equal(certification.target, 'clean-v0.6.3-complete');
assert.equal(certification.status, 'certified_on_manual_merge');
assert.equal(certification.authority_set_id, authoritySetId);
assert.equal(plan.publication_unlocked, false);
assert.equal(plan.targets?.['clean-v0.6.3']?.status, 'authority_certified');
assert.equal(plan.targets?.['clean-v0.6.3']?.downstream_regeneration_unlocked, true);
assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');

assert(audit.includes('110 of 128 playable titles (85.9%)'), 'PR #573 finalization audit coverage marker drifted.');
assert(audit.includes('No further theory-only starter changes should be made for v0.6.3.'), 'PR #573 theory-only lock marker drifted.');
assert(audit.includes('Teaching simplicity and card-pool coverage are not optimization targets.'), 'PR #573 optimization objective marker drifted.');

console.log(`Clean v0.6.3 downstream data validated against certified authority set ${authoritySetId}: 128 cards, 25 Territories, six factions/12 Leaders, and 12 legal PR #573 starter Decks at 30 cards / 60 value.`);
