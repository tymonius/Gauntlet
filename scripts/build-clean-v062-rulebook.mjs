import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = 'releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md';
const SHARED_PATH = 'docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md';
const FACTION_ROOT = 'artifacts/reconstruction/clean-v0.6.2/faction-guides';
const OUTPUT_DIR = 'artifacts/reconstruction/clean-v0.6.2/rulebook';
const OUTPUT_PATH = `${OUTPUT_DIR}/Gauntlet_v0.6.2_Rulebook.md`;
const MANIFEST_PATH = `${OUTPUT_DIR}/authority-manifest.json`;

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const baseline = read(BASELINE_PATH);
const shared = read(SHARED_PATH);

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing start marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return text.slice(start, end).trimEnd();
}

function baselineChapter(number, nextNumber) {
  return between(baseline, `# ${number}. `, `# ${nextNumber}. `).replace(/\n---\s*$/, '').trimEnd();
}

function sharedSection(number) {
  const startRe = new RegExp(`^# ${number}\\. `, 'm');
  const match = startRe.exec(shared);
  if (!match) throw new Error(`Missing shared-rules section ${number}`);
  const nextRe = new RegExp(`^# ${number + 1}\\. `, 'm');
  nextRe.lastIndex = match.index + match[0].length;
  const tail = shared.slice(match.index + match[0].length);
  const next = nextRe.exec(tail);
  const end = next ? match.index + match[0].length + next.index : shared.length;
  return shared.slice(match.index, end).replace(/\n---\s*$/, '').trimEnd();
}

function replaceTopHeading(text, heading) {
  return text.replace(/^# [^\n]+/, heading);
}

function demoteHeadings(text, levels = 1) {
  return text.replace(/^(#{1,5}) /gm, (m, hashes) => `${'#'.repeat(Math.min(6, hashes.length + levels))} `);
}

function normalizeBaselineVocabulary(text) {
  return text
    .replaceAll("Defender's Advantage", 'Defensive Edge')
    .replaceAll('Action Opportunities', 'Action phases')
    .replaceAll('Action Opportunity', 'Action phase');
}

const intro = `# GAUNTLET

## Official Rulebook

**Version 0.6.2 — Clean Reconstruction Candidate**

> **Authority candidate, not current/public rules.** This document is reconstructed from the definitive v0.6.1 Rulebook, the approved v0.6.2 shared-rule decisions, and the six clean v0.6.2 faction authorities approved through PR #609. The withdrawn v0.6.2 Rulebook and combined faction guide are historical evidence only and are not drafting skeletons.

---

# Welcome to Gauntlet

Gauntlet is a two-player tactical card-and-territory game. Each player builds a Deck, chooses one of six factions and one of that faction's Leaders, and contributes three Territories to a shared six-Territory battlefield called the **Gauntlet**.

Players advance toward one another, fight battles, occupy and capture opposing Territories, develop Assets, and pursue faction-specific plans. The normal way to win remains cumulative: cross the battlefield, advance your contiguous Front Line through the opponent's final Territory, then win the Last Stand beyond the Gauntlet.

# How to Use This Rulebook

The rulebook is organized to teach the game in the order a new player needs it.

- **Part I — Learn to Play** explains the shared game from components through victory.
- **Part II — Complete Shared Rules** contains deck construction and technical interaction rules.
- **Part III — Factions** explains the six factions, their Leaders, components, procedures, and alternate victories.
- **Part IV — Reference** provides compact turn and battle sequences, a glossary, and the copyright and playtest-use notice.

Major chapters use two layers. **How it works** teaches the ordinary rule in direct language. **Complete rules** gives exact timing, exceptions, and edge cases. Read the How it works layer first when learning; use Complete rules to answer precise questions.

# Game at a Glance

Each player begins just outside their end of a six-Territory battlefield. On your turn, capture if eligible, draw a card, take one Action during either Opening or Denouement, and Advance, Hold, or Fall Back during Movement. Entering the opponent's position creates a pending battle.

Before that battle begins, applicable Diplomat Terms resolve. If the pending battle continues, Onset begins the battle. Each player may risk one card from Hand as a Gambit, then draws a temporary three-card Reserve and may choose one card as a Tactic. Card effects and dice determine the winner. The loser retreats, and the winner takes or keeps the contested position.

Winning an attack does not normally capture a Territory immediately. Your controlled Territories form a contiguous **Front Line** from your own end. During your Capture step, if your token is on or beyond the next opposing Territory past that Front Line, advance the Front Line by one Territory. This makes deep Occupation possible without creating non-contiguous control.

# How to Win

The normal victory is to **run the Gauntlet**:

1. advance across the Territory column;
2. push the opponent beyond their final Territory;
3. advance your Front Line until you control that final Territory;
4. advance beyond the Gauntlet to begin a Last Stand battle; and
5. win that battle.

Capturing the opponent's final Territory is necessary but does not by itself win the game in v0.6.2. Every faction can win by completing the full sequence above. Some factions also have an alternate victory condition described in Part III.

# Golden Rules

- When two rules or effects genuinely conflict, follow the more specific one. If both can apply, use normal timing and order instead; specificity does not undo an effect that has already been applied.
- **May** means an effect is optional. **Must** means it is required.
- Follow instructions in the order written.
- Complete as much of an instruction as possible unless the missing part is a required cost, requirement, or target.
`;

let chapter1 = baselineChapter(1, 2);
let chapter2 = baselineChapter(2, 3)
  .replace('- **Action:** normally play from Hand by spending 1 Action during an Action Opportunity.', '- **Action:** normally play from Hand by taking an Action during Opening or Denouement.')
  .replace('### Actions and Action Opportunities\n\nAn **Action** is a spendable allowance. The active player normally has 1 Action each turn.\n\nAn **Action Opportunity** is a timing window when the active player may spend an Action. A normal turn has one before movement and one after movement. No more than 1 Action may be spent during the same Action Opportunity. Chapter 4 explains the available choices and effects that grant additional Actions or Action Opportunities.', `### Actions and Action phases

An **Action** is a spendable allowance. The active player normally has 1 Action each turn.

**Opening** and **Denouement** are the two normal Action phases. A player normally takes no more than one Action in either phase and no more than one Action total during the turn. Additional Actions increase the turn total but do not create another phase or permit multiple Actions in one phase unless an effect says so directly. Chapter 5 contains the complete Action rules.`);
chapter2 = normalizeBaselineVocabulary(chapter2);

const chapter3 = `# 3. Setup

## How it works

Shuffle your Playable Deck and draw four cards. Choose three as your opening Hand and place the fourth face down beneath the Draw Pile. With that opening Hand known, secretly arrange your three Territories, join them to your opponent's three, and reveal the Gauntlet. Prepare faction components, place each token just before its own-end Territory, then determine the first player.

The fourth opening card is not discarded, revealed, played, or triggered. Territory arrangement therefore happens with meaningful information while preserving that card inside the Draw Pile.

## Complete rules

Prepare the game in this order:

1. **Prepare the Draw Pile.** Shuffle the Playable Deck and place it face down. Leave room for the Discard Pile and Graveyard.
2. **Select opening Hands.** Each player draws four cards. Choose three to keep as the opening Hand. Place the fourth card face down beneath the Draw Pile. This is not a discard, play, reveal, or card effect, and it triggers nothing.
3. **Arrange Territories.** After selecting the opening Hand, secretly arrange the three Territory Cards in a line facing their owner.
4. **Form the Gauntlet.** Join both Territory lines to create one six-Territory column.
5. **Reveal Territories.** Reveal all six simultaneously. They remain face up unless an effect says otherwise.
6. **Prepare faction components.** Place Leaders, trackers, references, and supplemental components according to their rules.
7. **Place Player Tokens.** Place each token immediately before the Territory at that player's end. Setup placement is not movement or entry.
8. **Determine first player.** Each player rolls one die. Higher result goes first; reroll ties. If the shared active-player marker is in use, give it to the first player.

### Recommended play areas

Each player should maintain distinct areas for:

- Draw Pile;
- Discard Pile;
- Graveyard;
- Hand;
- Asset Bank;
- Leader and supplemental components;
- Reserve;
- Gambit; and
- Tactic.

Cards in different zones must remain visibly separate even when space is limited.`;

const chapter4 = replaceTopHeading(sharedSection(1), '# 4. Your Turn');

const assetRules = `### Assets and the Asset Bank

A card is an Asset only when an effect banks it in the Asset Bank.

On card text, **Bank this card** means place it face up in your Asset Bank. An **Asset** heading contains continuous or automatic text that applies while the card is banked. A **Use** heading contains an optional ability of a banked Asset.

A player's Asset limit equals the number of Territories they control.

- A Territory where you are the occupier but do not control it does not increase the limit.
- If the limit falls below the number of Assets controlled, immediately discard Assets until within the limit.
- Every banked Asset counts toward the limit unless a rule says otherwise.
- Using an Asset does not take an Action unless expressly stated otherwise.
- If using an Asset requires it to be discarded, put it in its owner's Discard Pile unless stated otherwise.

Overlays are persistent Territory cards rather than Assets and follow Chapter 12.`;

let chapter5 = replaceTopHeading(sharedSection(2), '# 5. Actions, Faction Actions, Faction Abilities, and Assets');
chapter5 = `${chapter5}\n\n${assetRules}`;

const chapter6 = replaceTopHeading(sharedSection(3), '# 6. Movement and Position');

function subsectionFromShared(number, heading) {
  const body = demoteHeadings(sharedSection(number), 1);
  return body.replace(/^## [^\n]+/, `## ${heading}`);
}

const pendingBattleRules = subsectionFromShared(4, 'Pending Battles, Terms, and Onset');
const battleSequenceRules = subsectionFromShared(5, 'Battle Sequence and Outcome');

const baselineBattle = baselineChapter(7, 8);
let aftermath = between(baselineBattle, '## The Aftermath', '## Withdrawal and Retreat');
aftermath = aftermath
  .replace('After the dice determine a winner, proceed to the Aftermath. The loser retreats, the winner takes or keeps the contested position, and any additional retreat or capture effects occur. Then clear the battle cards as described below.', 'After the battle outcome is determined, proceed to the Aftermath. If the battle has a winner, the loser retreats, the winner takes or keeps the contested position, and any additional retreat or Front Line effects occur. If an active battle ends by withdrawal, use the no-winner procedure below. Then clear the battle cards as described below.')
  .replace('1. Determine the battle result.', '1. Determine the battle result, or record that the battle ended without a winner.')
  .replace('4. Carry out normal retreat and determine whether the winner becomes the occupier, including replacements.', '4. If there is a winner, carry out normal retreat and determine whether the winner becomes the occupier, including replacements.')
  .replace('5. Carry out additional retreats and apply final-position effects.', '5. Carry out additional retreats, withdrawals, and final-position effects as applicable.');
aftermath = normalizeBaselineVocabulary(aftermath);

const withdrawalRules = subsectionFromShared(7, 'Withdrawal and Retreat');
const chapter7 = `# 7. Battles\n\n${pendingBattleRules}\n\n${battleSequenceRules}\n\n${aftermath}\n\n${withdrawalRules}`;

let chapter8 = replaceTopHeading(sharedSection(6), '# 8. Front Line, Occupation, and Capture');
chapter8 += `\n\n### Occupation\n\n**Occupation** is the state in which a player's token is on an opposing Territory that player does not control. A player in Occupation is the **occupier**. Deep Occupation does not itself change control; control advances through the Front Line rules above.\n\n### Counterattack\n\nA **Counterattack** is a battle initiated by the controller of a Territory against an opponent who is the occupier of that Territory. Because normal Capture advances the Front Line during the occupier's Capture step, the controller normally has the intervening turn to initiate a Counterattack and drive the occupier away.`;

let chapter9 = baselineChapter(9, 10);
chapter9 = chapter9
  .replaceAll("Defender's Advantage", 'Defensive Edge')
  .replace('If the winner is still the occupier of the final Territory at the start of their next turn, they capture it during the Capture step.', 'During later Capture steps, advance the winner\'s Front Line normally. The opponent\'s final Territory must be added to that Front Line before the attacker may begin the normal Last Stand sequence.')
  .replace('After capturing the opponent\'s final Territory, a player may advance beyond the Gauntlet during movement.', 'After the opponent\'s final Territory has been added to the attacker\'s Front Line, that player may advance beyond the Gauntlet during Movement.')
  .replace('If the attacker wins, they have run the Gauntlet and immediately win the game.', 'If the attacker wins, after having first brought the opponent\'s final Territory into their Front Line, they have run the Gauntlet and immediately win the game.');

let chapter10 = baselineChapter(10, 11);
let chapter11 = baselineChapter(11, 12)
  .replace('- When a card, Leader, faction, Territory, or supplemental-component rule conflicts with a general rule, follow the specific rule.', '- When two rules or effects genuinely conflict, follow the more specific one. If both can apply, use normal timing and order instead; specificity does not undo an effect that has already been applied.');
let chapter12 = between(baseline, '# 12. Overlays and Other Shared Card Rules', '# Part III — Factions').replace(/\n---\s*$/, '').trimEnd();
chapter10 = normalizeBaselineVocabulary(chapter10);
chapter11 = normalizeBaselineVocabulary(chapter11);
chapter12 = normalizeBaselineVocabulary(chapter12);

const factionPreamble = `# Part III — Factions

## How Factions Work

Each Deck belongs to one faction and uses one of that faction's two Leaders. The faction determines which faction cards may be included, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific Actions, abilities, and procedures are available.

A **Faction Action** is a faction-specific option chosen when taking an Action. Its faction rules state whether it is legal during Opening, Denouement, or either phase. A **Faction Ability** occurs at its stated timing and does not take an Action unless it expressly says otherwise. These are distinct rule categories.

Every faction may still win by running the Gauntlet. Some factions also have an alternate victory condition. An alternate victory applies only when its complete faction rules are satisfied.

Read the shared Learn to Play rules first. Then read the chapter for the faction and Leader used in the game. Players do not need to learn every other faction before their first game, but both players should be able to inspect all public faction rules and components in use.

## Faction Components

Faction packages use Leader Cards, reference cards, trackers, double-sided progress cards, shared supplies, or other public components. The relevant faction chapter identifies its exact package and starting state.

Reference cards summarize procedures but do not replace the Rulebook or the clean faction authority. If shortened reference text omits a detail, follow the complete authority text.

### General use

- Keep every supplemental component face up and visible unless its own rules say otherwise.
- Begin each tracker at the faction's stated starting value and update it immediately whenever that value changes.
- For a sliding tracker, place the indicated Leader or Reference Card over the tracker. Fully cover the tracker at 0, then slide the covering card until its bottom edge aligns with the current value.
- A counter, dial, written record, or other substitute may be used when it shows the same public information clearly and unambiguously.
- A reference card is a reminder, not a separate rules authority.
- A double-sided supplemental card changes state only when its governing rule tells you to flip it. Keep any cards attached to a supplemental component with it so both players can identify the relationship.
- Supplemental components have no card value and are not eligible as Gambits, Tactics, costs, or other playable cards unless a rule explicitly says otherwise.
- Each player supplies and controls their own faction package unless a faction rule identifies a shared supply. In a mirror match, keep the two players' components separated and oriented toward their owners.

<!-- GENERATED CLEAN V0.6.2 FACTION CONTENT START -->`;

const factions = [
  { chapter: 13, slug: 'military', label: 'Military', file: 'Gauntlet_v0.6.2_Military_Faction_Guide.md' },
  { chapter: 14, slug: 'diplomat', label: 'Diplomats', file: 'Gauntlet_v0.6.2_Diplomat_Faction_Guide.md' },
  { chapter: 15, slug: 'financier', label: 'Financiers', file: 'Gauntlet_v0.6.2_Financier_Faction_Guide.md' },
  { chapter: 16, slug: 'intelligence', label: 'Intelligence', file: 'Gauntlet_v0.6.2_Intelligence_Faction_Guide.md' },
  { chapter: 17, slug: 'mystics', label: 'Mystics', file: 'Gauntlet_v0.6.2_Mystics_Faction_Guide.md' },
  { chapter: 18, slug: 'inquisition', label: 'Inquisition', file: 'Gauntlet_v0.6.2_Inquisition_Faction_Guide.md' },
];

function factionChapter({ chapter, slug, label, file }) {
  const guide = read(`${FACTION_ROOT}/${slug}/${file}`);
  const start = guide.search(/^# 1\. /m);
  const canonical = guide.search(/^# \d+\. Canonical /m);
  if (start < 0 || canonical < 0 || canonical <= start) {
    throw new Error(`Cannot isolate authority sections for ${label}`);
  }
  const body = guide.slice(start, canonical).trimEnd();
  const lines = body.split('\n');
  const rendered = [];
  let firstTop = true;
  for (const line of lines) {
    const top = /^# \d+\. (.+)$/.exec(line);
    if (top) {
      if (firstTop) {
        rendered.push(`# ${chapter}. ${label}`);
        firstTop = false;
      } else {
        rendered.push(`## ${top[1]}`);
      }
      continue;
    }
    if (line.startsWith('### ')) {
      rendered.push(`#${line}`);
      continue;
    }
    if (line.startsWith('## ')) {
      rendered.push(`#${line}`);
      continue;
    }
    rendered.push(line);
  }
  return rendered.join('\n').trimEnd();
}

const factionContent = factions.map(factionChapter).join('\n\n---\n\n');

const reference = `# Part IV — Reference

---

# Quick Turn Reference

1. **Capture:** advance the active player's Front Line by at most one Territory if the normal Capture requirement is met; apply after-Capture effects and victory checks.
2. **Draw:** draw one card.
3. **Opening:** take the turn's Action here if desired and legal.
4. **Movement:** Advance, Hold, or Fall Back; resolve any pending battle immediately.
5. **Denouement:** take the turn's Action here if it was not already taken, unless another rule permits an additional Action.
6. **Cleanup:** apply end-of-turn effects, discard down to three cards, expire unused turn permissions, and pass the active-player marker if used.

---

# Quick Battle Reference

1. Entering the opponent's position creates a **pending battle**.
2. Resolve applicable **Terms** before the battle begins.
3. If the pending battle continues, **Onset** begins the battle.
4. Set Gambits.
5. Set Hands aside and form Reserves.
6. Reveal Gambits.
7. Choose Tactics.
8. Reveal Tactics.
9. Apply pre-dice effects and determine the Outcome.
10. A defender with **Defensive Edge** wins tied battle totals; otherwise make a straight, unmodified **Tiebreak Roll**.
11. Proceed to the Aftermath. Gambits normally go to Graveyards; Tactics and remaining Reserve cards normally go to Discard Piles.

---

# Glossary

**Action:** A spendable allowance. A player normally takes 1 Action total each turn.

**Opening:** The Action phase before Movement.

**Denouement:** The Action phase after Movement and any battle caused by it.

**Faction Action:** A faction-specific option chosen when taking an Action. Its rules state its legal phase.

**Faction Ability:** A faction-specific effect used or triggered at its stated timing. It does not take an Action unless it expressly says otherwise.

**Aftermath:** The closing part of an active battle, including result or no-winner handling, retreat or withdrawal, Occupation, battle-card clearing, and follow-up effects.

**Asset:** A persistent card banked face up in the Asset Bank.

**Control:** Authority over a Territory for rules purposes, shown by the direction the Territory faces and constrained by the Front Line rules.

**Counterattack:** A battle initiated by the controller of a Territory against the occupier of that Territory.

**Defensive Edge:** A tie-breaking rule. When the defender has Defensive Edge, the defender wins tied battle totals.

**Fall Back:** The ordinary Movement choice that moves one position toward your own end. Fall Back is neither retreat nor withdrawal.

**Front Line:** The complete unbroken sequence of Territories a player controls beginning at their own end of the Gauntlet.

**Gambit:** An optional battle card set from Hand. It normally goes to the Graveyard during the Aftermath.

**Last Stand:** The battle beyond the opponent's final Territory in the cumulative normal Run-the-Gauntlet victory sequence.

**Occupation:** The state in which a player's token is on an opposing Territory that player does not control.

**Occupier:** A player in Occupation.

**Onset:** The formal opening stage of an active battle. A pending battle becomes a battle during Onset.

**Pending battle:** The state after attacker, defender, contested position, and attacker's previous position are established but before Onset. Terms resolve here.

**Position:** A Territory or off-board space where a Player Token may be placed.

**Reserve:** The temporary private cards drawn for one battle. Reserve is separate from Hand.

**Retreat:** Forced displacement after losing a battle. Retreat is not ordinary movement or withdrawal.

**Tactic:** An optional battle card chosen from Reserve. It normally goes to the Discard Pile during the Aftermath.

**Tiebreak Roll:** A separate sudden-death roll used when a tied battle total is not otherwise resolved. Each player rolls one unmodified die; reroll further ties.

**Withdrawal:** Leaving a pending or active battle without determining a winner. Withdrawal is not Fall Back or retreat.

---

# Copyright and Playtest Use

Gauntlet is an unpublished playtest project.

Copyright © 2026 Tymon Scott. All rights reserved.

Repository and release materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.`;

const rulebook = [
  intro.trimEnd(),
  '---\n\n# Part I — Learn to Play',
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  '---\n\n# Part II — Complete Shared Rules',
  chapter10,
  chapter11,
  chapter12,
  '---',
  factionPreamble,
  factionContent,
  '<!-- GENERATED CLEAN V0.6.2 FACTION CONTENT END -->',
  '---',
  reference,
].join('\n\n---\n\n').replace(/\n{4,}/g, '\n\n\n');

fs.mkdirSync(path.join(ROOT, OUTPUT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT_PATH), `${rulebook.trimEnd()}\n`);

const manifest = {
  schema_version: 1,
  status: 'authority_candidate_pending_human_semantic_approval',
  target: 'clean-v0.6.2',
  authority_base: 'v0.6.1',
  baseline_rulebook: BASELINE_PATH,
  shared_rule_evidence: SHARED_PATH,
  approved_faction_authority_pr: 609,
  faction_authority_root: FACTION_ROOT,
  governing_plan: 'config/reconstruction-version-plan.json',
  forbidden_authority_sources: [
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md',
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  ],
  output: OUTPUT_PATH,
  publication_unlocked: false,
  clean_v063_unlocked: false,
};
fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);

console.log('Built clean v0.6.2 self-contained Rulebook candidate from v0.6.1 authority plus approved v0.6.2 inputs.');
