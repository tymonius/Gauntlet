import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

function section(text, start, end = null) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing source marker: ${start}`);
  const endIndex = end ? text.indexOf(end, startIndex + start.length) : -1;
  return text.slice(startIndex, endIndex >= 0 ? endIndex : undefined).trim();
}

function replaceOnce(text, from, to, label = from) {
  const index = text.indexOf(from);
  if (index < 0) throw new Error(`Could not replace ${label}`);
  return text.slice(0, index) + to + text.slice(index + from.length);
}

function replaceBetween(text, start, end, replacement) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Could not replace section ${start} ... ${end}`);
  return text.slice(0, startIndex) + replacement.trim() + '\n\n' + text.slice(endIndex + end.length);
}

function write(relativePath, content) {
  const target = path.join(root, relativePath);
  const normalized = content.replace(/\s+$/, '') + '\n';
  if (check) {
    if (!fs.existsSync(target) || read(relativePath) !== normalized) {
      throw new Error(`Stale generated player-facing candidate: ${relativePath}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, normalized, 'utf8');
}

const shared = read('docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md');
const generalCards = read('docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md');
const baseRulebook = read('releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md');
const baseFirstGame = read('releases/v0.6.2/Gauntlet_v0.6.2_First_Game_Guide.md');
const baseReference = read('releases/v0.6.2/Gauntlet_v0.6.2_Reference_Guide.md');

const setupSource = section(shared, '# 1. Setup', '# 2. Running the Gauntlet');
const setupChapter = setupSource.replace('# 1. Setup', '# 3. Setup');

const cardModeText = `## Printed card effects

A card may have several printed effects. The way it is used determines which effect applies.

- **Action:** play from Hand by taking an Action during Opening or Denouement unless the card names another legal timing.
- **Asset:** while banked, apply or use the Asset effect at its stated timing. A card with an Asset effect has an inherent Bank Action unless it prints a special banking procedure.
- **Gambit:** set from Hand during a battle.
- **Tactic:** choose from Reserve during a battle.
- **Gambit/Tactic:** the same printed effect is available when the card is committed as either a Gambit or a Tactic.

Only the printed effect being used applies unless a rule says otherwise. A Gambit, Tactic, or Gambit/Tactic effect with no later printed timing applies at that role's normal reveal stage.

Faction cards may contain other headings. Those headings use the procedure stated in the relevant faction rules and do not make a card eligible as a Gambit or Tactic unless it also has a Gambit, Tactic, or Gambit/Tactic effect.`;

const generalCardBody = section(generalCards, '### Gambit and Tactic effect headings')
  .replace(/^## (\d+\.)/gm, '### $1')
  .replace(/^### (?!\d+\.)/gm, '#### ');

let rulebook = baseRulebook
  .replace('**Version 0.6.2 — Second Playtest Revision**\n\n**Published:** August 5, 2026', '**Version 0.6.3 — Player-Facing Candidate**\n\n**Status:** Active next-release candidate; v0.6.2 remains the published playtest edition')
  .replace('Players advance toward one another, fight battles, occupy opposing Territories, advance contiguous Front Lines, develop Assets, and pursue faction-specific plans. The normal way to win is to run the Gauntlet and win the final Last Stand battle.', 'Players advance toward one another, fight battles, occupy opposing Territories, advance contiguous Front Lines, develop Assets, and pursue faction-specific plans. You run the Gauntlet and win immediately by either capturing the Territory at your opponent\'s end or winning your opponent\'s Last Stand.')
  .replace('The separate Complete Card Reference contains the effective text of all 128 playable card titles and all 25 Territories.', 'The v0.6.3 Complete Card Reference candidate contains the effective text of all 128 playable card titles; Territory text remains inherited from v0.6.2 unless a v0.6.3 source expressly replaces it.')
  .replace('For a first game, use two prepared or recommended Decks. Each player needs one complete Deck, one Player Token, and a six-sided die. The two players\' three-Territory sets join to form the six-position Gauntlet.', 'For a first game, use two prepared or recommended Decks. Each player chooses one faction and Leader, brings one constructed Deck and three Territories, and needs one Player Token and a six-sided die. The two players\' three-Territory sets join to form the six-position Gauntlet.')
  .replace(`Each player needs:\n\n- one complete **Deck**;\n- one **Player Token**; and\n- one six-sided die.\n\nThe players may share a die.\n\nA complete Deck contains:\n\n- one faction;\n- one Leader Card from that faction;\n- one Playable Deck;\n- three different Territory Cards; and\n- any components required by that faction or Leader.`, `Each player needs:\n\n- one faction;\n- one Leader Card from that faction;\n- one constructed **Deck** of ordinary playable cards;\n- three different Territory Cards;\n- any components required by that faction or Leader;\n- one **Player Token**; and\n- one six-sided die.\n\nThe players may share a die.`)
  .replace('The exact construction requirements for a custom Deck appear in Chapter 11.', 'The exact construction requirements for a custom Deck appear in Part III.')
  .replace('The face-down pile formed from the Playable Deck. Draw cards from its top.', 'The face-down pile formed by shuffling the Deck after applicable setup modifications. Draw cards from its top.');

rulebook = replaceBetween(rulebook, '## Printed card effects', '## Play area and zones', `${cardModeText}\n\n## Play area and zones`);
rulebook = replaceBetween(rulebook, '# 3. Setup', '# Part II — Shared Game Rules', `${setupChapter}\n\n---\n\n# Part II — Shared Game Rules`);

const battleHabit = `> **DON'T FORGET THE BOARD**  
> Territory. Assets. Then Gambits.

This is a memory cue, not another battle step or timing window. Review the contested Territory and your Asset Bank before committing battle cards, but use each effect only at its printed legal timing.`;

rulebook = replaceOnce(
  rulebook,
  'Terms are not part of this sequence because they resolve before the battle reaches Onset.\n\n## Determine the Outcome',
  `Terms are not part of this sequence because they resolve before the battle reaches Onset.\n\n${battleHabit}\n\n## Determine the Outcome`,
  'battle-habit insertion'
);

const finalTerritory = `### Final Territory and Last Stand

Capturing the Territory at the opponent's end immediately runs the Gauntlet and wins the game. This applies to any legal capture, including normal Capture and effects that legally advance the Front Line to include that Territory.

A player may also run the Gauntlet by winning the opponent's Last Stand. After a battle forces the opponent beyond their own end, the attacker may initiate that Last Stand with a **separate legal movement sequence** that Advances beyond the opponent's end. The attacker does not need to control or have captured the final Territory first.

The movement sequence that created the preceding battle is already over; unused movement from it cannot carry directly into the Last Stand.`;
rulebook = replaceBetween(rulebook, '### Final Territory and Last Stand', '\n---\n\n# 10. Withdrawal and Retreat', `${finalTerritory}\n\n---\n\n# 10. Withdrawal and Retreat`);

rulebook = rulebook
  .replaceAll('Playable Deck', 'Deck')
  .replaceAll('**Battle:**', '**Gambit/Tactic:**')
  .replaceAll('Battle mode', 'Gambit/Tactic mode')
  .replaceAll('Tactic or Battle effect', 'Tactic or Gambit/Tactic effect')
  .replaceAll('Gambit, Tactic, or Battle effect', 'Gambit, Tactic, or Gambit/Tactic effect')
  .replaceAll('| Action, Battle, Overlay |', '| Action, Gambit/Tactic, Overlay |')
  .replaceAll('| Action, Battle |', '| Action, Gambit/Tactic |');

rulebook = rulebook
  .replace('### Build the Deck\n\nA Deck must contain:', '### Build the Deck\n\nA Deck must contain:')
  .replace('- Territories do not count toward the 30-card minimum or 60-value maximum.', '- Territories do not count toward the Deck\'s 30-card minimum or 60-value maximum.');

// Retain the inherited shared-timing, replacement, reveal, and negation rules,
// but use the v0.6.3 general-card source for procedures it now centralizes.
rulebook = replaceBetween(
  rulebook,
  '### Multiple and additional Gambits or Tactics',
  '### Replacements and revisions',
  '### Replacements and revisions'
);
rulebook = replaceBetween(
  rulebook,
  '### Copied effects',
  '\n---\n\n# 12. Overlays and Other Shared Card Rules',
  `${generalCardBody}\n\n---\n\n# 12. Overlays and Other Shared Card Rules`
);

rulebook = `<!-- Generated. Sources: published v0.6.2 Rulebook + adopted v0.6.3 shared/general-card rules. -->\n${rulebook}`;

let firstGame = baseFirstGame
  .replace('# Gauntlet v0.6.2 First Game and Tableside Guide', '# Gauntlet v0.6.3 First Game and Tableside Guide')
  .replace('**Status:** Published player aid  \n**Version:** v0.6.2', '**Status:** Active player-facing candidate  \n**Version:** v0.6.3')
  .replaceAll('Playable Deck', 'Deck')
  .replaceAll('Battle mode', 'Gambit/Tactic mode');

firstGame = firstGame.replace(/^# ([2-9])\. /gm, (_, n) => `# ${Number(n) + 1}. `);
const setupGuide = `# 2. Setup for v0.6.3

1. Prepare faction and Leader components that can add cards to or remove cards from the Deck.
2. Shuffle the remaining Deck to form the Draw Pile.
3. Draw four cards, discard one face up, and keep three as the opening Hand.
4. With that Hand and opening discard known, secretly arrange your three Territories.
5. Join and reveal both Territory lines to form the Gauntlet.
6. Place each Player Token on the Territory at that player's own end. This is not movement and does not count as entering.
7. Only after both players finish opening selection and Territory arrangement, roll for first player.

## Running the Gauntlet

There are two normal victory routes: **capture the Territory at your opponent's end** or **win your opponent's Last Stand**. Either runs the Gauntlet and wins immediately. A separate legal movement sequence can initiate a Last Stand after the opponent is forced beyond their end; prior capture of the final Territory is not required.`;
firstGame = replaceOnce(firstGame, '\n---\n\n# 3. Shared tableside turn reference', `\n---\n\n${setupGuide}\n\n---\n\n# 3. Shared tableside turn reference`, 'First Game setup insertion');
firstGame = replaceOnce(
  firstGame,
  '### Onset\n\nResolve effects used during Onset before Gambits are set.',
  `### Onset\n\nResolve effects used during Onset before Gambits are set.\n\n> **Before you commit cards to a battle, look beyond your Hand. Read the contested Territory and scan your Asset Bank. Those effects are easy to overlook once Gambits, Reserves, and Tactics begin, and some may matter at different points in the battle. Check when each effect can be used before you act.**`,
  'First Game battle habit'
);

let reference = baseReference
  .replace('# Gauntlet v0.6.2 Reference Guide', '# Gauntlet v0.6.3 Reference Guide')
  .replace('**Status:** Published compact reference  \n**Version:** v0.6.2', '**Status:** Active compact-reference candidate  \n**Version:** v0.6.3')
  .replaceAll('Playable Deck', 'Deck');
const referenceSetup = `# Setup

> **Faction setup → Draw 4 / discard 1 / keep 3 → arrange Territories → form and reveal Gauntlet → place tokens → roll first player**

- Shuffle the remaining Deck to form the Draw Pile after faction setup.
- Arrange Territories with the opening Hand and face-up opening discard known.
- Each token starts on the Territory at its player's own end; setup placement is neither movement nor entering.
- Roll for first player only after both players complete opening selection and Territory arrangement.

---

# Run the Gauntlet

Win immediately by either:

- capturing the Territory at your opponent's end; or
- winning your opponent's Last Stand.

After forcing the opponent beyond their end, a **separate legal movement sequence** may Advance beyond the Gauntlet and initiate the Last Stand. You do not need to control the final Territory first.

---`;
reference = replaceOnce(reference, '# Your Turn', `${referenceSetup}\n\n# Your Turn`, 'Reference setup/victory');
reference = reference.replace('- Deep position alone does not capture the opponent\'s final Territory or open the Last Stand.', '- Deep Position alone does not capture the final Territory. Last Stand access instead requires a new legal Advance beyond the opponent\'s end after that opponent is beyond the Gauntlet.');
reference = replaceOnce(reference, '# Actions', `# Card use reminder\n\nCards may print **Action**, **Asset**, **Gambit**, **Tactic**, or **Gambit/Tactic** effects. A card with an Asset effect has an inherent Bank Action unless it prints a special banking procedure.\n\n# Actions`, 'Reference card modes');

const returning = `# What Changed in Gauntlet v0.6.3

**Status:** Active returning-player candidate  
**Baseline:** Published v0.6.2  
**Release tracker:** [#528](https://github.com/tymonius/Gauntlet/issues/528)

This handout explains the v0.6.3 changes that materially affect table play or how cards are read. v0.6.2 remains the published playtest edition until v0.6.3 is fully propagated and released.

# At a glance

1. **Setup now starts you on the Gauntlet.** Your token begins on the Territory at your own end; setup placement is not movement and does not count as entering.
2. **Opening selection happens before Territory arrangement.** Draw four, discard one face up, keep three, then arrange your Territories with that information known. Roll for first player last.
3. **Running the Gauntlet has two equal normal routes.** Capture the opponent's final Territory or win their Last Stand.
4. **A separate movement sequence can force a Last Stand before final-Territory capture.** Prior control of the final Territory is not required.
5. **Deck means the constructed ordinary-card set.** Draw Pile means the shuffled in-play pile. The term \`Playable Deck\` is retired in v0.6.3 player-facing text.
6. **Battle is no longer a card-effect heading.** Dual-role cards print **Gambit/Tactic**.
7. **Asset is the only banked-card heading.** The former Activate heading is retired, and cards with Asset effects normally have an inherent Bank Action.
8. **Repeated card procedures have moved into shared rules.** Cards are shorter because standard banking, directly permitted card use, effect-granted movement, additional Tactics, Sanctions, Asset Removal, Bind cleanup, reveal interference, copied/repeated effects, and battles ending without a winner are now governed centrally.
9. **Routine numeric effects use compact shorthand.** Examples include \`+1 Card\`, \`+1 Action\`, \`+1 Tactic\`, \`Retreat +1\`, \`Command = 2\`, and \`Advance Front Line 1\`.
10. **The complete 128-card pool received a production-size text audit.** All 128 v0.6.3 candidate cards pass the normal production fitter without emergency text fitting.

# Setup

Prepare faction components that can modify the Deck first. Shuffle the remaining Deck to form the Draw Pile, draw four, discard one face up, and keep three. Then secretly arrange your three Territories. Form and reveal the Gauntlet, place each Player Token on the Territory at that player's own end, and roll for first player only after both players have completed opening selection and Territory arrangement.

Your opening Hand and opening discard may inform Territory order. Initiative may not.

# Running the Gauntlet

You immediately run the Gauntlet and win when you either capture the Territory at your opponent's end or win your opponent's Last Stand.

A legal immediate-capture effect can win on the final Territory. After a battle forces the opponent beyond their own end, an effect that grants a separate legal movement sequence can let you Advance beyond the Gauntlet and initiate the Last Stand immediately, even if the final Territory still faces the opponent.

# Reading cards

## Effect headings

- **Action** — play from Hand by taking an Action at a legal phase or timing.
- **Asset** — banked-card effect; the card normally has an inherent Bank Action.
- **Gambit** — available only as a Gambit.
- **Tactic** — available only as a Tactic.
- **Gambit/Tactic** — the same effect is available in either role.

The old **Battle** and **Activate** headings are retired in v0.6.3.

## Shared procedures now omitted from cards

Expect shorter text where shared rules already establish the routine procedure. This includes default Asset banking, directly permitted card procedures not costing another Action, movement granted outside an existing sequence beginning a new movement sequence, additional-Tactic handling, Sanction expiration, default Bind cleanup, reveal-stage interference, rerolls using the new result, applying/repeating another effect, and cleanup when a battle ends without a winner.

Specific exceptions remain printed on the card.

# Battle habit

Before committing battle cards, check the contested Territory and your Asset Bank. This is a recommended play habit, not another battle step or timing window.

# Card-text revision

The v0.6.3 card pass applies the new shared language across all 128 cards and then uses bespoke compression only where needed. **Protracted Siege** includes an expressly adopted mechanics revision: its banked Asset can directly prevent capture, while its Gambit/Tactic mode creates the delayed Overlay. Other wording changes remain governed by their finalized v0.6.3 card text and shared rules.

# What remains familiar

The six factions, twelve Leaders, turn sequence, Gambit/Reserve/Tactic battle structure, Front Line concept, faction resources, and faction-specific victory systems remain based on v0.6.2 except where a v0.6.3 source expressly changes them. Specific cards and components still override general rules when they directly address the situation.
`;

write('artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Rulebook_Candidate.md', rulebook);
write('artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_First_Game_Guide_Candidate.md', firstGame);
write('artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Reference_Guide_Candidate.md', reference);
write('artifacts/v0.6.3/player-facing/Gauntlet_v0.6.3_Returning_Player_Changes_Candidate.md', returning);

console.log('Generated v0.6.3 player-facing Rulebook, First Game, Reference, and returning-player candidates.');
