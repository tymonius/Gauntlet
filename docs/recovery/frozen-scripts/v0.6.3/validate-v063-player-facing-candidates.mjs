import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'artifacts/v0.6.3/player-facing');
const read = (name) => fs.readFileSync(path.join(directory, name), 'utf8').replace(/\r\n/g, '\n');

const rulebook = read('Gauntlet_v0.6.3_Rulebook_Candidate.md');
const firstGame = read('Gauntlet_v0.6.3_First_Game_Guide_Candidate.md');
const reference = read('Gauntlet_v0.6.3_Reference_Guide_Candidate.md');
const returning = read('Gauntlet_v0.6.3_Returning_Player_Changes_Candidate.md');
const all = [rulebook, firstGame, reference, returning];
const cardCandidate = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json'), 'utf8'));
const cards = new Map(cardCandidate.cards.map((card) => [card.name, card]));

function assertSequentialTopLevelSections(name, text) {
  const numbers = [...text.matchAll(/^# (\d+)\. /gm)].map((match) => Number(match[1]));
  const expected = Array.from({ length: numbers.length }, (_, index) => index + 1);
  assert.deepEqual(numbers, expected, `${name} top-level numbered sections must be sequential from 1 without duplicates or gaps`);
}

function effectQuote(card) {
  return card.effects.map(({ label, text }) => {
    const lines = String(text).split('\n');
    let output = `> **${label}:** ${lines[0]}`;
    for (const line of lines.slice(1)) output += line ? `\n> ${line}` : '\n>';
    return output;
  }).join('\n>\n');
}

function headingBody(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^(#{1,6}) ${escaped}$`, 'm').exec(text);
  assert(match, `Missing Rulebook card heading: ${heading}`);
  const level = match[1].length;
  const start = match.index + match[0].length;
  const next = new RegExp(`^#{1,${level}} .+$`, 'gm');
  next.lastIndex = start;
  const nextMatch = next.exec(text);
  return text.slice(start, nextMatch ? nextMatch.index : text.length);
}

for (const [name, text] of [
  ['Rulebook', rulebook],
  ['First Game Guide', firstGame],
  ['Reference Guide', reference],
  ['Returning Player Changes', returning],
]) {
  assert(text.includes('v0.6.3') || text.includes('Version 0.6.3'), `${name} is not labeled v0.6.3`);
  assert(!/^(#{1,6} .+)\n\n\1$/m.test(text), `${name} contains a duplicated adjacent heading`);
}

assertSequentialTopLevelSections('Rulebook', rulebook);
assertSequentialTopLevelSections('First Game Guide', firstGame);

const requiredRulebook = [
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards',
  "You run the Gauntlet and win immediately by either capturing the Territory at your opponent's end or winning your opponent's Last Stand.",
  'separate legal movement sequence',
  "DON'T FORGET THE BOARD",
  'Territory. Assets. Then Gambits.',
  '**Gambit/Tactic:**',
  'inherent Bank Action',
  'bank one card from Hand using its inherent **Bank** Action if it has an Asset effect',
  'Asset Removal',
  'Reveal-stage interference',
  'Applying and repeating another effect',
];
for (const marker of requiredRulebook) {
  assert(rulebook.includes(marker), `Rulebook missing v0.6.3 marker: ${marker}`);
}

const requiredFirstGame = [
  '# 2. Setup for v0.6.3',
  'Draw four cards, discard one face up, and keep three',
  'There are two normal victory routes',
  'Before you commit cards to a battle, look beyond your Hand.',
  'bank a card from Hand using its inherent Bank Action if it has an Asset effect',
];
for (const marker of requiredFirstGame) {
  assert(firstGame.includes(marker), `First Game Guide missing v0.6.3 marker: ${marker}`);
}

const requiredReference = [
  '# Setup',
  '# Run the Gauntlet',
  'separate legal movement sequence',
  '**Gambit/Tactic**',
  'inherent Bank Action',
  'bank one card from Hand using its inherent **Bank** Action if it has an Asset effect',
];
for (const marker of requiredReference) {
  assert(reference.includes(marker), `Reference Guide missing v0.6.3 marker: ${marker}`);
}

const requiredReturning = [
  'Opening selection happens before Territory arrangement.',
  'Running the Gauntlet has two equal normal routes.',
  'Battle is no longer a card-effect heading.',
  'Asset is the only banked-card heading.',
  'The complete 128-card pool received a production-size text audit.',
  'Protracted Siege',
];
for (const marker of requiredReturning) {
  assert(returning.includes(marker), `Returning-player guide missing v0.6.3 marker: ${marker}`);
}

for (const text of [rulebook, firstGame, reference]) {
  assert(!text.includes('Playable Deck'), 'Active v0.6.3 player-facing candidate still uses Playable Deck');
  assert(!text.includes('**Battle:**'), 'Active v0.6.3 player-facing candidate still prints a Battle effect heading');
  assert(!text.includes('normal way to win is to run the Gauntlet and win the final Last Stand battle'), 'Last-Stand-only victory wording remains');
  assert(!text.includes('Place each token immediately before the Territory'), 'Obsolete token-before-Gauntlet setup remains');
  assert(!text.includes('Each player draws three cards.'), 'Obsolete random three-card opening remains');
}

// Exact card text duplicated in the inherited Rulebook must be generated from
// the same final candidate as the card faces. These were the 17 migration
// blocks that still contained pre-#551 wording during the manual audit.
for (const [heading, cardName] of [
  ['Military — Invasion', 'Invasion'],
  ['Diplomats — Détente', 'Détente'],
  ['Financiers — Compound Interest', 'Compound Interest'],
  ['Intelligence — Extraordinary Rendition', 'Extraordinary Rendition'],
  ["Mystics — Nature's Altar", "Nature's Altar"],
  ['Inquisition — Martyrdom', 'Martyrdom'],
  ['Black Covenant', 'Black Covenant'],
  ['Battlefield Promotion', 'Battlefield Promotion'],
  ['Encampment', 'Encampment'],
  ['Give Chase', 'Give Chase'],
  ['Hold the Line', 'Hold the Line'],
  ['Shock and Awe', 'Shock and Awe'],
  ['Good Faith', 'Good Faith'],
  ['Gunboat Diplomacy', 'Gunboat Diplomacy'],
  ['Safe Conduct', 'Safe Conduct'],
  ['Demilitarized Zone', 'Demilitarized Zone'],
  ['Foreclosure', 'Foreclosure'],
]) {
  const card = cards.get(cardName);
  assert(card, `Final v0.6.3 candidate is missing ${cardName}`);
  assert(
    headingBody(rulebook, heading).includes(effectQuote(card)),
    `Rulebook card excerpt for ${cardName} does not exactly match the final v0.6.3 card candidate`
  );
}

for (const obsolete of [
  'This does not change the Rite\'s beginning cost, requirements, or completion condition.',
  'When you lose a battle while Martyrdom is in your Hand',
  'Form your Reserve with one fewer card for each earlier battle after the first',
  'Replace **during opening effects** with **during Onset**.',
  'Replace Consolidate with:',
]) {
  assert(!rulebook.includes(obsolete), `Pre-final card migration prose survives in Rulebook: ${obsolete}`);
}

// Governance/returning-player prose may name retired terms when explaining the migration.
assert(returning.includes('`Playable Deck` is retired'), 'Returning-player guide should explicitly explain the retired Playable Deck term');
assert(returning.includes('old **Battle** and **Activate** headings are retired'), 'Returning-player guide should explain retired card headings');

// The First Game teaching text and Rulebook memory cue must remain deliberately distinct.
const teachingLead = 'Before you commit cards to a battle, look beyond your Hand.';
assert(firstGame.includes(teachingLead), 'First Game Guide lacks explanatory battle-habit teaching');
assert(!rulebook.includes(teachingLead), 'Rulebook improperly duplicates the First Game battle-habit paragraph');
assert(rulebook.includes("DON'T FORGET THE BOARD"), 'Rulebook lacks the terse battle-habit callout');
assert(!firstGame.includes("DON'T FORGET THE BOARD"), 'First Game Guide improperly duplicates the Rulebook callout');

const combined = all.join('\n');
assert(!/\bActivate:\b/.test(combined), 'Retired Activate heading survives in generated player-facing candidates');

console.log('v0.6.3 player-facing candidate validation passed: setup, victory, Deck terminology, Bank Actions, exact Rulebook card excerpts, card headings/general procedures, sequential sections, and distinct battle teaching are propagated.');
