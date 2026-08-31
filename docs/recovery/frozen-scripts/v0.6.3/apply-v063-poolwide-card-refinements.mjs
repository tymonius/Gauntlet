import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = process.env.V063_POOLWIDE_SOURCE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const candidatePath = process.env.V063_POOLWIDE_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const reportPath = process.env.V063_POOLWIDE_REPORT
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Poolwide_Refinement_Density.md';

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const candidate = structuredClone(source);
const beforeById = new Map(candidate.cards.map((card) => [card.id, structuredClone(card)]));
const byName = new Map(candidate.cards.map((card) => [card.name, card]));

let activateHeadingsConverted = 0;
let battleScopePhrasesRemoved = 0;
let overlayPlacementPhrasesNormalized = 0;
let rulesNotesRemoved = 0;

// v0.6.3 uses Asset for all banked-card text. Activate is no longer a separate mode.
for (const card of candidate.cards) {
  const merged = [];
  for (const effect of card.effects ?? []) {
    const next = { ...effect };
    if (next.label === 'Activate') {
      next.label = 'Asset';
      activateHeadingsConverted += 1;
    }
    const existingAsset = next.label === 'Asset'
      ? merged.find((entry) => entry.label === 'Asset')
      : null;
    if (existingAsset) {
      existingAsset.text = `${existingAsset.text.trim()}\n\n${next.text.trim()}`;
    } else {
      merged.push(next);
    }
  }
  card.effects = merged;
}

// Standard v0.6.3 is 1v1. Battle-timed effects on a player's cards do not need
// to repeat that the battle involves that player.
for (const card of candidate.cards) {
  for (const effect of card.effects ?? []) {
    const matches = effect.text.match(/ in a battle involving you/g) ?? [];
    battleScopePhrasesRemoved += matches.length;
    effect.text = effect.text.replaceAll(' in a battle involving you', '');
  }
  if (Array.isArray(card.rules_notes)) {
    card.rules_notes = card.rules_notes.map((note) => {
      const matches = note.match(/ in a battle involving you/g) ?? [];
      battleScopePhrasesRemoved += matches.length;
      return note.replaceAll(' in a battle involving you', '');
    });
  }
}

// Physical Overlay cards identify themselves as this Overlay when placed.
for (const card of candidate.cards) {
  if (!/\bOverlay\b/.test(String(card.card_form ?? ''))) continue;
  for (const effect of card.effects ?? []) {
    const replacements = [
      [/Place this card from your Hand as an Overlay on/g, 'Place this Overlay on'],
      [/place this card from your Hand as an Overlay on/g, 'place this Overlay on'],
      [/Place this card as an Overlay on/g, 'Place this Overlay on'],
      [/place this card as an Overlay on/g, 'place this Overlay on'],
      [/Place this card on that Territory as an Overlay/g, 'Place this Overlay there'],
      [/place this card on that Territory as an Overlay/g, 'place this Overlay there'],
      [/Place this card there as an Overlay/g, 'Place this Overlay there'],
      [/place this card there as an Overlay/g, 'place this Overlay there']
    ];
    for (const [pattern, replacement] of replacements) {
      const matches = effect.text.match(pattern) ?? [];
      overlayPlacementPhrasesNormalized += matches.length;
      effect.text = effect.text.replace(pattern, replacement);
    }
  }
}

// Adopt the settled condition-prefix typography wherever the condition is the
// whole following clause.
replaceText('Invasion', 'Gambit/Tactic', 'Attacker: +1 Reserve, +1 Tactic.', 'Attacker — +1 Reserve, +1 Tactic.');
replaceText('Liberation', 'Gambit/Tactic', 'Counterattack: +1 Reserve, +1 Tactic.', 'Counterattack — +1 Reserve, +1 Tactic.');
replaceText('Resistance', 'Asset', 'When initiating a Counterattack: +2 Reserve.', 'Counterattack — +2 Reserve.');

// Shared copied/repeated-effect rules now carry control, source-card state,
// choices/costs, timing legality, trigger identity, and recursion handling.
replaceText('Treason', 'Asset',
  'Negate it, then apply that printed effect as though you controlled it.',
  'Negate it, then apply that effect.');
replaceText('Treason', 'Gambit/Tactic',
  'Negate it, then apply that printed effect as though you controlled it.',
  'Negate it, then apply that effect.');
replaceEffect('Witchcraft', 'Asset',
  'Once per turn, after Tactics are revealed, you may put 1 card from your Hand in your Graveyard to repeat one other Gambit or Tactic effect you control in this battle that can apply now.');
replaceEffect('Witchcraft', 'Gambit/Tactic',
  'After Tactics are revealed, repeat one other Gambit or Tactic effect you control in this battle that can apply now. If none can apply, gain Advantage. In the Aftermath, put this card in your Graveyard.');
removeRulesNotes('Arcane Knowledge');
removeRulesNotes('Heresy');
removeRulesNotes('Rend the Veil');
removeRulesNotes('Resourcefulness');
removeRulesNotes('Treason');
removeRulesNotes('Witchcraft');

// Ending a battle without a winner now has a shared consequence/cleanup rule.
// Armistice retains only its exceptional destinations; normal battle-end rules
// cover unresolved effects, already-applied effects, Reserve, and result status.
replaceEffect('Armistice', 'Gambit/Tactic',
  "When revealed, if this card is not negated, the attacker withdraws and the battle ends without a winner. Put every other Gambit and Tactic still in battle in its owner's Discard Pile, then put this card in its owner's Graveyard.");
for (const name of [
  'Armistice',
  'Safe Conduct',
  'Exfiltration',
  'Accursed Wager',
  'Speculation',
  'No Martyrs',
  'Margin Loan'
]) removeRulesNotes(name);

// Shared replacement, movement, banking, numeric-modifier, and destination
// procedures make these notes redundant.
for (const name of [
  'Confession',
  'Gunboat Diplomacy',
  'Hold the Line',
  'Operational Reassessment',
  'Penance',
  'Reserve Force',
  'Countercharge',
  'Field Command',
  'Resistance',
  'War Crimes',
  'Invasion'
]) removeRulesNotes(name);

// Keep the useful timing clarification but remove the obsolete Battle-mode name.
replaceRulesNote(
  'Unbroken Ranks',
  /The Battle gain/,
  'The Command gain occurs during the Aftermath before an eligible post-victory Order.'
);

// Remove a stray publication footer that entered a card rules-note field.
removeRulesNotesMatching('Manifest Destiny', /All rights reserved/);

// The #405 canonical finalized-text tracker is the editorial authority for
// these cards. This final build stage mirrors its currently finalized entries
// so later shared-normalization stages cannot overwrite accepted bespoke text.
const FINALIZED = {
  'Protracted Siege': [
    ['Asset', 'When the opponent would capture a Territory you control, put this card in your Graveyard to prevent that capture.'],
    ['Gambit/Tactic', 'In the Aftermath, if you lose while defending a Territory you control, place this Overlay there.'],
    ['Overlay', 'When the opponent would capture this Territory, prevent that capture, then put this card in your Graveyard. If the opposing Player Token leaves first, put this card in your Graveyard.']
  ],
  'Margin Loan': [
    ['Action', 'Bank this card with a card from your Hand or Treasury bound face up beneath it as collateral. Gain Capital equal to its value +2. +1 Action.'],
    ['Asset', "After income on your next turn, choose:\n\nRepay — Pay Capital equal to the collateral's value +3. Return collateral to your Hand; discard this card.\n\nDefault — Put both in your Graveyard.\n\nIf this card leaves play with collateral, Default."],
    ['Gambit/Tactic', 'Before dice are rolled, you may bind a card from your Hand or Treasury face up beneath this card as collateral. If you do, gain Capital equal to its value and you may Subsidize. In the Aftermath, if you win, return collateral to your Hand; otherwise put both in your Graveyard.']
  ],
  'Shock and Awe': [
    ['Asset', 'During Onset when attacking on an enemy-controlled Territory, you may put this card in your Graveyard to apply its Gambit or Tactic effect.'],
    ['Gambit/Tactic', 'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — You cannot otherwise move, advance your Front Line, or use an Order after the following effect: choose one:\n\nBreakthrough — If the opponent can Retreat +1, they do; then you advance one Position.\n\nConsolidate — Advance Front Line 1, if able; Command = 2.\n\nIn the Aftermath, put the extra Tactic and this card in your Graveyard.']
  ],
  'Leveraged Buyout': [
    ['Action', 'Buy one Deed using any cards from your Hand or Treasury as collateral.'],
    ['Gambit/Tactic', "In the Aftermath, before battle cards are cleared, if you won, you may buy this Territory's Deed using any of your other Gambits, Tactics, or Reserve cards as collateral.\n\nEach collateral card contributes its value toward the cost. Action collateral goes to your Graveyard after the purchase; battle collateral goes there when battle cards are cleared. Collateral may pay the entire cost."]
  ],
  'Bombardment': [
    ['Placement', 'The first enemy-controlled Territory ahead of you without an Overlay.'],
    ['Overlay', "This Territory's printed effect is inactive. When you attack here: Win — turn this Overlay into Ruins. Lose — put it in your Graveyard. If you capture this Territory without a battle, turn this Overlay into Ruins."],
    ['Gambit/Tactic', 'When attacking on an enemy-controlled Territory, place this Overlay face up there.']
  ],
  'Reserve Force': [
    ['Action', 'Bank this card; Bind a Tactic from your Hand to it face down.'],
    ['Asset', 'After Tactics are revealed, you may discard this card and play the bound card as a Tactic. Put it in your Graveyard in the Aftermath. If this card leaves play with a bound card, put that card in your Graveyard.'],
    ['Gambit/Tactic', 'After Tactics are revealed, you may replace this card with up to two eligible cards from your Hand, face up. If replaced, put this card in your Graveyard; otherwise discard it in the Aftermath.']
  ],
  'Fog of War': [
    ['Placement', 'Any Territory.'],
    ['Overlay', "In the next battle here, this Territory's controller sets their Gambit and chooses their Tactics after the opponent. Discard this Overlay after that battle."],
    ['Gambit/Tactic', 'After Tactics are revealed, if your opponent has both a Gambit and a Tactic, they return either one Gambit or all Tactics to their sources.'],
    ['Mission', 'Win a battle against an opponent who had both a Gambit and a Tactic in that battle.']
  ],
  'Demilitarized Zone': [
    ['Terms', "After your Terms are accepted and the Proposal's Accepted effect applies, you may place this Overlay on the contested Territory. Each player there withdraws. Neither player may enter there this turn."],
    ['Overlay', 'To enter here while unoccupied, discard 1. When this Territory would be captured, discard this Overlay instead. At the start of your turn before Capture, if you are here: Discard 1 or withdraw. After the next battle here, discard this Overlay.']
  ],
  'Necromancy': [
    ['Action', 'Choose one:\n\n- Place this card face down beneath your Draw Pile; +1 Card, +1 Action.\n- Apply the effect below, then put this card in your Graveyard.'],
    ['Gambit/Tactic', 'In the Aftermath, after Gambits enter your Graveyard, apply the effect below.\n\nChoose up to three non-Necromancy cards in your Graveyard. Put all cards in your Hand in your Graveyard, then return the chosen cards to your Hand.']
  ],
  'Capital Gains': [
    ['Action', 'Bind this card to a card in your Treasury. After income on your next turn, return that card to your Hand, gain Capital equal to its value, and discard this card. Before then, if you lose a battle, discard both; if that card leaves your Treasury, discard this card.'],
    ['Gambit/Tactic', 'In the Aftermath, if you win, choose one other Gambit, Tactic, or Reserve card. Place it face up in your Treasury instead.']
  ],
  'Manifest Destiny': [
    ['Action', 'Put all other cards in your Hand and at least one banked Asset, totaling a minimum of three cards, in your Graveyard. Add this card to your end of the Gauntlet as a blank Territory you control.'],
    ['Gambit/Tactic', 'In the Aftermath, if you win as the attacker, insert this card into the Gauntlet at your Front Line as a blank Territory you control.']
  ],
  'Sleeper Network': [
    ['Action', 'Bank this card with 1 card from your Hand bound face down.'],
    ['Asset', 'At the end of each later turn, you may bind 1 card from your Hand face down, up to the number of Territories you control.\n\nDuring Opening or Denouement, as an Action, put this card in your Graveyard and reveal its bound cards. Play each bound card you can for its Action effect, in any order; discard the rest.\n\nIf this card is Removed, reveal its bound cards first. Play 1 immediately for its Action effect; discard the rest.']
  ],
  'Give Chase': [
    ['Action', 'During Denouement, if you won a battle you initiated this turn, advance 1 Position. Then put this card in your Graveyard.'],
    ['Gambit/Tactic', 'Following the Aftermath, if you won as the attacker, you may advance 1 Position. Put this card in your Graveyard.\n\nIf an advance from this card starts a battle, you cannot set a Gambit or use Orders in it. In that battle, −1 Reserve for each battle you already fought this turn beyond the first, to a minimum of 0.']
  ]
};

for (const [name, effects] of Object.entries(FINALIZED)) {
  const card = byName.get(name);
  if (!card) throw new Error(`Finalized card not found: ${name}`);
  card.effects = effects.map(([label, text]) => ({ label, text }));
  delete card.rules_notes;
}

for (const card of candidate.cards) syncLegacyEffectFields(card);

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  poolwide_refinement: {
    activate_headings_converted: activateHeadingsConverted,
    battle_scope_phrases_removed: battleScopePhrasesRemoved,
    overlay_placement_phrases_normalized: overlayPlacementPhrasesNormalized,
    rules_notes_removed: rulesNotesRemoved,
    finalized_cards_applied: Object.keys(FINALIZED).length,
    canonical_finalized_tracker: 'https://github.com/tymonius/Gauntlet/issues/405#issuecomment-5221286097'
  }
};

validate();
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());

function effect(cardName, label) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const match = (card.effects ?? []).find((entry) => entry.label === label);
  if (!match) throw new Error(`Effect ${label} not found on ${cardName}`);
  return match;
}

function replaceText(cardName, label, from, to) {
  const target = effect(cardName, label);
  if (!target.text.includes(from)) {
    throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  }
  target.text = target.text.replace(from, to);
}

function replaceEffect(cardName, label, text) {
  effect(cardName, label).text = text;
}

function removeRulesNotes(cardName) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  if (Array.isArray(card.rules_notes)) rulesNotesRemoved += card.rules_notes.length;
  delete card.rules_notes;
}

function removeRulesNotesMatching(cardName, pattern) {
  const card = byName.get(cardName);
  if (!card || !Array.isArray(card.rules_notes)) return;
  const kept = card.rules_notes.filter((note) => {
    if (!pattern.test(note)) return true;
    rulesNotesRemoved += 1;
    return false;
  });
  if (kept.length) card.rules_notes = kept;
  else delete card.rules_notes;
}

function replaceRulesNote(cardName, pattern, replacement) {
  const card = byName.get(cardName);
  if (!card || !Array.isArray(card.rules_notes)) return;
  card.rules_notes = card.rules_notes.map((note) => pattern.test(note) ? replacement : note);
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((entry) => [entry.label, entry.text]));
  const mappings = {
    action: 'Action',
    gambit_tactic: 'Gambit/Tactic',
    gambit: 'Gambit',
    tactic: 'Tactic',
    asset: 'Asset',
    overlay: 'Overlay',
    placement: 'Placement',
    terms: 'Terms',
    accepted: 'Accepted',
    refused: 'Refused',
    mission: 'Mission',
    aftermath: 'Aftermath',
    text: 'Text'
  };
  for (const [key, label] of Object.entries(mappings)) {
    if (labels.has(label)) card[key] = labels.get(label);
    else if (Object.hasOwn(card, key)) delete card[key];
  }
  for (const obsolete of ['activate', 'battle', 'use']) {
    if (Object.hasOwn(card, obsolete)) delete card[obsolete];
  }
}

function playerFacingStrings(card) {
  return [
    ...(card.effects ?? []).flatMap((entry) => [entry.label, entry.text]),
    ...(card.rules_notes ?? [])
  ];
}

function validate() {
  if (candidate.cards.length !== 128) throw new Error(`Expected 128 cards, found ${candidate.cards.length}.`);
  if (activateHeadingsConverted !== 34) throw new Error(`Expected 34 Activate headings, converted ${activateHeadingsConverted}.`);
  if (battleScopePhrasesRemoved !== 9) throw new Error(`Expected 9 redundant battle-scope phrases, removed ${battleScopePhrasesRemoved}.`);
  if (overlayPlacementPhrasesNormalized !== 14) throw new Error(`Expected 14 Overlay-placement phrases, normalized ${overlayPlacementPhrasesNormalized}.`);

  const labels = candidate.cards.flatMap((card) => (card.effects ?? []).map((entry) => entry.label));
  if (labels.includes('Activate')) throw new Error('Activate effect heading remains.');
  if (labels.includes('Battle')) throw new Error('Battle effect heading remains.');
  if (labels.filter((label) => label === 'Gambit/Tactic').length !== 106) {
    throw new Error('Unexpected Gambit/Tactic heading count after poolwide refinement.');
  }

  const playerFacing = candidate.cards.flatMap(playerFacingStrings).join('\n');
  const forbidden = [
    /\bbattle involving you\b/i,
    /\bBattle effects?\b/,
    /Gambit\/Tactic effect/,
    /\bActivate:/,
    /\bAsset(?:s)? you control\b/,
    /\bAsset(?:s)? they control\b/,
    /\bPlayable Deck\b/,
    /as though you played it/i,
    /as though you controlled it/i,
    /normal destinations?/i,
    /normal role destinations?/i,
    /All rights reserved/i,
    /place this card(?: from your Hand)? as an Overlay/i,
    /\+\d+ Front Line/
  ];
  for (const pattern of forbidden) {
    if (pattern.test(playerFacing)) throw new Error(`Forbidden v0.6.3 card-language residual remains: ${pattern}`);
  }

  for (const card of candidate.cards) {
    if (Object.hasOwn(card, 'activate')) throw new Error(`Legacy activate field remains on ${card.name}.`);
    if (Object.hasOwn(card, 'battle')) throw new Error(`Legacy battle field remains on ${card.name}.`);
  }

  for (const [name, expected] of Object.entries(FINALIZED)) {
    const card = byName.get(name);
    const actual = (card.effects ?? []).map((entry) => [entry.label, entry.text]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Finalized #405 text drifted for ${name}.`);
    }
  }
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((entry) => `${entry.label}: ${entry.text}`).join(' ');
}

function buildReport() {
  const rows = candidate.cards.map((card) => {
    const before = beforeById.get(card.id);
    const beforeText = cardText(before);
    const afterText = cardText(card);
    return {
      name: card.name,
      allegiance: card.allegiance,
      beforeWords: words(beforeText),
      afterWords: words(afterText),
      beforeChars: beforeText.length,
      afterChars: afterText.length
    };
  });
  const totals = rows.reduce((acc, row) => {
    acc.beforeWords += row.beforeWords;
    acc.afterWords += row.afterWords;
    acc.beforeChars += row.beforeChars;
    acc.afterChars += row.afterChars;
    return acc;
  }, { beforeWords: 0, afterWords: 0, beforeChars: 0, afterChars: 0 });
  const ranked = [...rows].sort((a, b) => b.afterChars - a.afterChars || b.afterWords - a.afterWords || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 Pool-Wide Refinement Pass',
    '',
    `**Source:** \`${sourcePath}\`  `,
    `**Final candidate:** \`${candidatePath}\`  `,
    `**Cards:** ${rows.length}  `,
    `**Activate headings converted to Asset:** ${activateHeadingsConverted}  `,
    `**Redundant “battle involving you” phrases removed:** ${battleScopePhrasesRemoved}  `,
    `**Overlay placement phrases normalized:** ${overlayPlacementPhrasesNormalized}  `,
    `**Redundant/stale Rules Notes removed:** ${rulesNotesRemoved}  `,
    `**Finalized #405 cards applied:** ${Object.keys(FINALIZED).length}`,
    '',
    '## Aggregate density',
    '',
    '| Measure | Before pass | After pass | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${totals.beforeWords} | ${totals.afterWords} | ${totals.afterWords - totals.beforeWords} |`,
    `| Characters | ${totals.beforeChars} | ${totals.afterChars} | ${totals.afterChars - totals.beforeChars} |`,
    '',
    '## Densest cards after pool-wide refinement',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ chars |',
    '|---:|---|---|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.afterWords} | ${row.afterChars} | ${row.afterChars - row.beforeChars} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Pool-wide v0.6.3 refinement complete: ${activateHeadingsConverted} Activate headings, ${battleScopePhrasesRemoved} battle-scope phrases, ${overlayPlacementPhrasesNormalized} Overlay placements, ${Object.keys(FINALIZED).length} finalized cards.`);
