import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const AUTHORITY_PATH = resolve(ROOT, 'game-data/current-game.json');
const RULEBOOK_PATH = resolve(ROOT, 'rulebook/player-facing/current-rulebook.md');
const DESIGN_PATH = resolve(ROOT, 'docs/v0.7.2-timing-and-capture-cleanup.json');

const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
const readJson = path => readFile(path, 'utf8').then(JSON.parse);

const [authority, design] = await Promise.all([
  readJson(AUTHORITY_PATH),
  readJson(DESIGN_PATH),
]);
let rulebook = await readFile(RULEBOOK_PATH, 'utf8');

assert.equal(design.targetVersion, 'v0.7.2');
assert.equal(design.status, 'approved-design');
assert.equal(authority.schemaVersion, 2);
assert.equal(authority.authority, 'current-game');
assert.ok(
  ['v0.7.1', 'v0.7.2-candidate'].includes(authority.version),
  `Expected v0.7.1 or an idempotent v0.7.2 candidate, found ${authority.version}`,
);

const convenienceField = label => ({
  Action: 'action',
  Asset: 'asset',
  Gambit: 'gambit',
  Tactic: 'tactic',
  'Gambit/Tactic': 'gambit_tactic',
  Mission: 'mission',
  Overlay: 'overlay',
  Terms: 'terms',
  Sanctions: 'sanctions',
  Reaction: 'reaction',
}[label]);

function cardById(id) {
  const card = authority.gameplay.cards.find(candidate => candidate.id === id);
  assert.ok(card, `Missing current card ${id}`);
  return card;
}

function setCardEffect(card, label, text) {
  const effects = card.effects.filter(effect => effect.label === label);
  assert.equal(effects.length, 1, `${card.id} must have exactly one ${label} effect`);
  effects[0].text = text;
  const field = convenienceField(label);
  if (field) card[field] = text;
}

for (const change of design.actionTimingChanges) {
  const card = cardById(change.cardId);
  if (change.textChange !== false) setCardEffect(card, change.effect, change.text);
  card.action_phase = change.actionPhase;
}

function updateNamedAbilityText(name, text) {
  let count = 0;
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (
      value.name === name
      && typeof value.text === 'string'
      && (value.classification === 'Leader Ability' || value.descriptor || value.cost)
    ) {
      value.text = text;
      count += 1;
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(authority);
  assert.ok(count >= 2, `Expected duplicated ${name} Leader Ability authority; updated ${count}`);
  return count;
}

let fortifyText;
let hostileTakeoverText;
let diplomaticRecognition;

for (const change of design.captureTerminologyChanges) {
  if (change.cardId) {
    const card = cardById(change.cardId);
    if (change.replacement) {
      const effects = card.effects.filter(effect => effect.label === change.effect);
      assert.equal(effects.length, 1, `${card.id} must have exactly one ${change.effect} effect`);
      const current = effects[0].text;
      assert.match(current, /Consolidate — [^\n]+/u, `${card.id} is missing the Consolidate clause`);
      const updated = current.replace(/Consolidate — [^\n]+/u, change.replacement);
      assert.notEqual(updated, current, `${card.id} Consolidate clause did not change`);
      effects[0].text = updated;
      const field = convenienceField(change.effect);
      if (field) card[field] = updated;
    } else {
      setCardEffect(card, change.effect, change.text);
    }
    continue;
  }

  if (change.authorityTarget === 'military.commandant.orders.fortify') {
    fortifyText = change.text;
    updateNamedAbilityText(change.name, change.text);
    continue;
  }

  if (change.authorityTarget === 'financiers.executive.hostileTakeover') {
    hostileTakeoverText = change.text;
    updateNamedAbilityText(change.name, change.text);
    continue;
  }

  if (change.proposalId === 'diplomatic-recognition') {
    diplomaticRecognition = change;
    let updated = 0;
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (value.id === change.proposalId && typeof value.accepted === 'string' && typeof value.refused === 'string') {
        const compact = /^Diplomat:/u.test(value.accepted) || /^If the Diplomat wins:/u.test(value.refused);
        value.accepted = compact ? change.compactAccepted : change.accepted;
        value.refused = compact ? change.compactRefused : change.refused;
        updated += 1;
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(authority);
    assert.ok(updated >= 2, `Expected full and compact Diplomatic Recognition authority; updated ${updated}`);
    continue;
  }

  throw new Error(`Unhandled v0.7.2 capture terminology change: ${JSON.stringify(change)}`);
}

assert.ok(fortifyText, 'Approved Fortify correction was not applied');
assert.ok(hostileTakeoverText, 'Approved Hostile Takeover correction was not applied');
assert.ok(diplomaticRecognition, 'Approved Diplomatic Recognition correction was not applied');

authority.version = 'v0.7.2-candidate';
authority.displayVersion = 'v0.7.2 Candidate';
authority.status = 'release-candidate';
authority.provenance.currentDevelopmentInputs = {
  ...(authority.provenance.currentDevelopmentInputs || {}),
  v072TimingAndCaptureCleanup: '/docs/v0.7.2-timing-and-capture-cleanup.json',
};

const versionFrom = '**Version 0.7.1**';
const versionTo = '**Version 0.7.2 Candidate**';
if (rulebook.includes(versionFrom)) rulebook = rulebook.replace(versionFrom, versionTo);
assert.ok(rulebook.includes(versionTo), 'Rulebook candidate version identity is missing');

const exactReplacements = [
  [
    '> **Fortify — 2 Command · No Action · Aftermath · Win while occupying enemy Territory:** Advance your Front Line by one Territory, if able.',
    `> **Fortify — 2 Command · No Action · Aftermath · Win while occupying enemy Territory:** ${fortifyText}`,
  ],
  [
    "> **Hostile Takeover — 1 Action · Denouement · After winning as attacker:** While occupying that enemy Territory, buy or buy out its Deed. Treat yourself as occupier for cost. If successful, advance your Front Line by one Territory, if able.",
    `> **Hostile Takeover — 1 Action · Denouement · After winning as attacker:** ${hostileTakeoverText}`,
  ],
  [
    '> **Accepted:** Diplomat: Advance Front Line 1, if able. Accepting player withdraws, then +2 Cards.',
    `> **Accepted:** ${diplomaticRecognition.compactAccepted}`,
  ],
  [
    '> **Refused:** If the Diplomat wins: Advance Front Line 1 during the Aftermath, if able. No Influence for imposing this Proposal.',
    `> **Refused:** ${diplomaticRecognition.compactRefused}`,
  ],
];

for (const [from, to] of exactReplacements) {
  if (rulebook.includes(from)) rulebook = rulebook.replace(from, to);
  assert.ok(rulebook.includes(to), `Rulebook replacement missing: ${to}`);
}

const chapter8Marker = 'A token may be several Territories beyond its Front Line without granting control of the intervening or occupied Territories.\n\n';
const captureClarification = [
  '**Capture and Front Line advancement are different operations.** Capture changes control of the specified Territory. If a direct capture would violate the contiguous Front Line or another rule prevents it, an “if able” instruction does not change control.',
  '',
  '**Advance Front Line** changes control of the next opposing Territory immediately beyond that player’s Front Line. It does not mean “capture the Territory occupied by the player” unless that Territory is itself the next opposing Territory beyond the Front Line.',
  '',
].join('\n');
if (!rulebook.includes(captureClarification)) {
  assert.ok(rulebook.includes(chapter8Marker), 'Chapter 8 insertion marker is missing');
  rulebook = rulebook.replace(chapter8Marker, chapter8Marker + captureClarification);
}

// Candidate integration invariants from the approved design slate.
for (const change of design.actionTimingChanges) {
  const card = cardById(change.cardId);
  assert.equal(card.action_phase, change.actionPhase);
  if (change.textChange !== false) {
    assert.equal(card.action, change.text);
    assert.equal(card.effects.find(effect => effect.label === change.effect)?.text, change.text);
  }
}
for (const change of design.captureTerminologyChanges.filter(change => change.cardId && !change.replacement)) {
  const card = cardById(change.cardId);
  const field = convenienceField(change.effect);
  assert.equal(card.effects.find(effect => effect.label === change.effect)?.text, change.text);
  if (field) assert.equal(card[field], change.text);
}
assert.match(cardById('military-shock-and-awe').gambit_tactic, /Consolidate — Capture that Territory, if able; Command = 2\./u);
assert.match(rulebook, /Capture and Front Line advancement are different operations\./u);
assert.doesNotMatch(rulebook, /\*\*Version 0\.7\.1\*\*/u);

await Promise.all([
  writeFile(AUTHORITY_PATH, jsonText(authority)),
  writeFile(RULEBOOK_PATH, rulebook.replace(/\r\n/g, '\n')),
]);

console.log('Promoted current authority and Rulebook to v0.7.2-candidate.');
console.log(`Applied ${design.actionTimingChanges.length} Action timing changes and ${design.captureTerminologyChanges.length} Capture/Front Line changes.`);
