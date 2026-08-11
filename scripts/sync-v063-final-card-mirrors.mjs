import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const sourcePath = process.env.V063_POOLWIDE_SOURCE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_POOLWIDE_REPORT
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Poolwide_Refinement_Density.md';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));
const beforeById = new Map((source.cards ?? []).map((card) => [card.id, card]));

// Final residual-outlier pass approved after the post-audit density review.
// Keep these edits immediately before compatibility synchronization so the
// final candidate, density report, mirrors, and live #405 tracker see the same text.
setEffects('Shock and Awe', [
  ['Asset', 'During Onset, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.'],
  ['Gambit/Tactic', 'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — Choose one:\n\nBreakthrough — Opponent: Retreat +1, if able; then you advance one Position.\n\nConsolidate — Advance Front Line 1, if able; Command = 2.\n\nAfterward, you cannot move, advance your Front Line, or use an Order as a result of this victory.\n\nIn the Aftermath, put both cards in your Graveyard.']
]);

setEffects('Margin Loan', [
  ['Action', 'Bank this card; bind 1 card from your Hand or Treasury to it face up as collateral. Gain Capital equal to its value +2. +1 Action.'],
  ['Asset', "After income on your next turn, choose:\n\nRepay — Pay Capital equal to the collateral's value +3; return it to your Hand and discard this card.\n\nDefault — Put both cards in your Graveyard.\n\nIf this card is Removed, Default."],
  ['Gambit/Tactic', 'Before dice are rolled, you may bind 1 card from your Hand or Treasury to this card face up as collateral to gain Capital equal to its value; you may then Subsidize. In the Aftermath: Win — return collateral to your Hand. Otherwise — Default.']
]);

setEffects('Martyrdom', [
  ['Aftermath', "In the Aftermath before battle cards are cleared, if you lost and this card is in your Hand, you may play it. If you do, put cards remaining in the opponent's Reserve in their Graveyard instead of their Discard Pile. After battle cards are cleared, Conviction = 4; put this card in your Graveyard."]
]);

setEffects('Rearguard', [
  ['Asset', "After you lose and retreat, when the opponent would use an Order or card effect to enter your Position that turn, you may discard this card to prevent that movement. No Command is spent; return any card used to its owner's Hand. That Order or card cannot be used again that turn."],
  ['Gambit/Tactic', 'In the Aftermath, if you lose and retreat, bank this card.']
]);

setEffects('Sleeper Network', [
  ['Action', 'Bank this card with 1 card from your Hand bound face down.'],
  ['Asset', 'At the end of each later turn, you may bind 1 card from your Hand face down. Maximum: number of Territories you control.\n\nAs an Action, put this card in your Graveyard and reveal its bound cards. Play each bound card you can for its Action effect; discard the rest.\n\nIf this card is Removed, reveal its bound cards; immediately play 1 for its Action effect and discard the rest.']
]);

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

let synchronizedFields = 0;

for (const card of candidate.cards ?? []) {
  const effects = new Map((card.effects ?? []).map((entry) => [entry.label, entry.text]));

  for (const [field, label] of Object.entries(mappings)) {
    if (effects.has(label)) {
      if (card[field] !== effects.get(label)) synchronizedFields += 1;
      card[field] = effects.get(label);
    } else if (Object.hasOwn(card, field)) {
      delete card[field];
      synchronizedFields += 1;
    }
  }

  for (const obsolete of ['activate', 'battle', 'use']) {
    if (Object.hasOwn(card, obsolete)) {
      delete card[obsolete];
      synchronizedFields += 1;
    }
  }
}

validate();

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  residual_outlier_revisions: {
    revised_cards: ['Shock and Awe', 'Margin Loan', 'Martyrdom', 'Rearguard', 'Sleeper Network'],
    newly_finalized_cards: ['Martyrdom', 'Rearguard'],
    finalized_cards_after_pass: 21,
    sleeper_network_one_card_per_turn_cadence_preserved: true,
    sleeper_network_dynamic_bound_card_maximum_preserved: true
  },
  final_mirror_sync: {
    synchronized_fields: synchronizedFields,
    source_of_truth: 'cards[].effects[]'
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());
console.log(`Applied final residual-outlier revisions and synchronized ${synchronizedFields} final card compatibility field(s) to effects[].`);

function setEffects(cardName, effects) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  card.effects = effects.map(([label, text]) => ({ label, text }));
  delete card.rules_notes;
}

function validate() {
  for (const card of candidate.cards ?? []) {
    const effects = new Map((card.effects ?? []).map((entry) => [entry.label, entry.text]));

    for (const [field, label] of Object.entries(mappings)) {
      if (effects.has(label) && card[field] !== effects.get(label)) {
        throw new Error(`${card.name} ${field} does not match its ${label} effect.`);
      }
      if (!effects.has(label) && Object.hasOwn(card, field)) {
        throw new Error(`${card.name} has stale compatibility field ${field}.`);
      }
    }

    for (const obsolete of ['activate', 'battle', 'use']) {
      if (Object.hasOwn(card, obsolete)) throw new Error(`${card.name} retains obsolete field ${obsolete}.`);
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
  const rows = (candidate.cards ?? []).map((card) => {
    const before = beforeById.get(card.id);
    if (!before) throw new Error(`Source card missing from density comparison: ${card.name}.`);
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
    '# Gauntlet v0.6.3 Final Pool-Wide Refinement',
    '',
    `**Source:** \`${sourcePath}\`  `,
    `**Final candidate:** \`${candidatePath}\`  `,
    `**Cards:** ${rows.length}`,
    '**Finalized bespoke cards:** 21',
    '',
    '## Aggregate density',
    '',
    '| Measure | Before final pool-wide pass | Final candidate | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${totals.beforeWords} | ${totals.afterWords} | ${totals.afterWords - totals.beforeWords} |`,
    `| Characters | ${totals.beforeChars} | ${totals.afterChars} | ${totals.afterChars - totals.beforeChars} |`,
    '',
    '## Densest cards in the final candidate',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ chars |',
    '|---:|---|---|---:|---:|---:|',
    ...ranked.slice(0, 40).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.afterWords} | ${row.afterChars} | ${row.afterChars - row.beforeChars} |`),
    ''
  ].join('\n')}\n`;
}
