import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_TEXT_CANDIDATE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json';
const sourcePath = process.env.V063_POOLWIDE_SOURCE
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_POOLWIDE_REPORT
  ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Poolwide_Refinement_Density.md';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

// v0.6.3 title renames. Keep stable IDs so saved Decks and structured
// references continue to resolve across the release boundary.
renameCandidateTitle("Smuggler's Pass", "Smuggler's Run");
const renamedSmugglersRun = (candidate.territories ?? []).find((territory) => territory.id === 'territory-smuggler-s-pass');
if (!renamedSmugglersRun || renamedSmugglersRun.name !== "Smuggler's Run") {
  throw new Error("Smuggler's Run Territory rename did not resolve on the stable territory-smuggler-s-pass ID.");
}

renameCardTitleById('neutral-reserves', 'Reserves', 'Second Line');
const renamedSecondLine = (candidate.cards ?? []).find((card) => card.id === 'neutral-reserves');
if (!renamedSecondLine || renamedSecondLine.name !== 'Second Line') {
  throw new Error('Second Line card rename did not resolve on the stable neutral-reserves ID.');
}

const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));
const beforeById = new Map((source.cards ?? []).map((card) => [card.id, card]));

// Final residual-outlier pass approved after the post-audit density review.
// Keep these edits immediately before compatibility synchronization so the
// final candidate, density report, mirrors, and live #405 tracker see the same text.
setEffects('Shock and Awe', [
  ['Asset', 'During Onset, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.'],
  ['Gambit/Tactic', 'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand. Lose — Retreat +1. Win — Choose one:\nBreakthrough — Opponent: Retreat +1, if able; then you advance one Position.\nConsolidate — Advance Front Line 1, if able; Command = 2.\n\nAfterward, you cannot move, advance your Front Line, or use an Order as a result of this victory.\nIn the Aftermath, put both cards in your Graveyard.']
]);

setEffects('Margin Loan', [
  ['Action', 'Bank this card; bind 1 card from your Hand or Treasury to it face up as collateral. Gain Capital equal to its value +2. +1 Action.'],
  ['Asset', "After income, you may choose:\nRepay — Pay Capital equal to the collateral's value +3; return it to your Hand and discard this card.\nDefault — Put both cards in your Graveyard.\nWhile this remains banked, you may not draw at the start of your turn.\nIf this card is Removed, Default."],
  ['Gambit/Tactic', 'Before dice are rolled, you may bind 1 card from your Hand or Treasury to this card face up as collateral to gain Capital equal to its value; you may then Subsidize. In the Aftermath: Win — return collateral to your Hand. Otherwise — Default.']
]);

setEffects('Leveraged Buyout', [
  ['Action', 'Buy one Deed using any cards from your Hand or Treasury as collateral.'],
  ['Gambit/Tactic', "In the Aftermath, before battle cards are cleared, if you won, you may buy this Territory's Deed using any of your other Gambits, Tactics, or Reserve cards as collateral. Each collateral card contributes its value toward the cost. Action collateral goes to your Graveyard after the purchase; battle collateral goes there when battle cards are cleared. Collateral may pay the entire cost."]
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

// Approved late v0.6.3 corrections from the starter-exclusion review.
// Armistice upkeep must occur even when another effect suppresses the normal
// Draw. Contingency Plan is general insurance against the defined involuntary
// Asset Removal event and is stronger in battle while behind on Territories.
replaceEffectText(
  'Armistice',
  'Asset',
  'Neither player can start a battle. After your normal Draw, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.',
  'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.'
);
replaceEffectText(
  'Contingency Plan',
  'Asset',
  'If this card is Removed because your Asset limit decreased, +1 Card.',
  'If this card is Removed, +1 Card.'
);
replaceEffectText(
  'Contingency Plan',
  'Gambit/Tactic',
  'If your opponent controls more Territories than you, +1 Battle Total.',
  'If your opponent controls more Territories than you, +2 Battle Total.'
);

// Card-size formatting uses single line breaks for choices/list items and
// reserves blank lines for genuinely separate paragraphs. Remove inherited
// paragraph gaps that do not carry semantic structure on the long-card faces.
replaceEffectText(
  'Trade Concessions',
  'Accepted',
  'The opponent chooses one available option:\n\n- +2 Cards.\n- Bank one eligible card from Hand. Then put this card in your Discard Pile; +1 Card.',
  'The opponent chooses one available option:\n- +2 Cards.\n- Bank one eligible card from Hand. Then put this card in your Discard Pile; +1 Card.'
);
replaceEffectText(
  'Nonbinding Resolution',
  'Accepted',
  'If the Proposal is unratified, the opponent chooses one before ratification:\n\n- Ratify it normally.\n- Leave it unratified; +2 Influence. After the accepted Terms conclude, put this card in your Discard Pile, then +1 Card.',
  'If the Proposal is unratified, the opponent chooses one before ratification:\n- Ratify it normally.\n- Leave it unratified; +2 Influence. After the accepted Terms conclude, put this card in your Discard Pile, then +1 Card.'
);

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
  title_renames: [
    ...((candidate.normalization ?? {}).title_renames ?? []).filter((entry) => !['territory-smuggler-s-pass', 'neutral-reserves'].includes(entry?.stable_id)),
    {
      stable_id: 'territory-smuggler-s-pass',
      from: "Smuggler's Pass",
      to: "Smuggler's Run",
      effective_version: 'v0.6.3'
    },
    {
      stable_id: 'neutral-reserves',
      from: 'Reserves',
      to: 'Second Line',
      effective_version: 'v0.6.3'
    }
  ],
  residual_outlier_revisions: {
    revised_cards: ['Shock and Awe', 'Margin Loan', 'Leveraged Buyout', 'Martyrdom', 'Rearguard', 'Sleeper Network'],
    newly_finalized_cards: ['Martyrdom', 'Rearguard'],
    finalized_cards_after_pass: 21,
    margin_loan_persistent_debt: true,
    leveraged_buyout_tracker_spacing_synced: true,
    sleeper_network_one_card_per_turn_cadence_preserved: true,
    sleeper_network_dynamic_bound_card_maximum_preserved: true,
    compact_choice_line_breaks_applied: ['Shock and Awe', 'Margin Loan', 'Trade Concessions', 'Nonbinding Resolution'],
    long_card_blank_line_cleanup_applied: ['Leveraged Buyout']
  },
  excluded_starter_balance_corrections: {
    armistice_upkeep_uses_opening_timing: true,
    contingency_plan_triggers_on_any_removal: true,
    contingency_plan_battle_total: 2,
    manifest_destiny_normal_deed_preserved: true
  },
  final_mirror_sync: {
    synchronized_fields: synchronizedFields,
    source_of_truth: 'cards[].effects[]'
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());
console.log(`Applied v0.6.3 title renames, final residual-outlier revisions, excluded-starter corrections, and synchronized ${synchronizedFields} final card compatibility field(s) to effects[].`);

function renameCandidateTitle(from, to) {
  replaceStrings(candidate, from, to);
}

function renameCardTitleById(stableId, from, to) {
  const card = (candidate.cards ?? []).find((entry) => entry.id === stableId);
  if (!card) throw new Error(`Card not found for title rename: ${stableId}.`);
  if (card.name !== from) throw new Error(`Expected ${stableId} to be titled ${from}; found ${card.name}.`);
  card.name = to;
  replaceExactStrings(candidate.starter_decks, from, to);
}

function replaceStrings(value, from, to) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (typeof entry === 'string') value[index] = entry.replaceAll(from, to);
      else replaceStrings(entry, from, to);
    }
    return;
  }

  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') value[key] = entry.replaceAll(from, to);
    else replaceStrings(entry, from, to);
  }
}

function replaceExactStrings(value, from, to) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (entry === from) value[index] = to;
      else replaceExactStrings(entry, from, to);
    }
    return;
  }

  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === from) value[key] = to;
    else replaceExactStrings(entry, from, to);
  }
}

function setEffects(cardName, effects) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  card.effects = effects.map(([label, text]) => ({ label, text }));
  delete card.rules_notes;
}

function replaceEffectText(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}.`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}.`);
  if (effect.text !== from) throw new Error(`Unexpected current text on ${cardName} ${label}.`);
  effect.text = to;
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

  const armistice = byName.get('Armistice');
  const contingency = byName.get('Contingency Plan');
  const manifest = byName.get('Manifest Destiny');
  if (armistice?.cost !== 4) throw new Error('Armistice cost drifted while correcting upkeep timing.');
  if (contingency?.cost !== 1) throw new Error('Contingency Plan cost drifted during its correction.');
  if (manifest?.cost !== 5) throw new Error('Manifest Destiny cost drifted while preserving its Deed interaction.');
  if (armistice?.asset !== 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.') {
    throw new Error('Armistice upkeep must occur at the start of Opening even when the normal Draw is suppressed.');
  }
  if (contingency?.asset !== 'If this card is Removed, +1 Card.') {
    throw new Error('Contingency Plan must trigger from any defined Asset Removal.');
  }
  if (contingency?.gambit_tactic !== 'If your opponent controls more Territories than you, +2 Battle Total.') {
    throw new Error('Contingency Plan must grant +2 Battle Total while behind on Territories.');
  }
  if (!manifest?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.')) {
    throw new Error('Manifest Destiny must retain its normal Deed when it enters the Gauntlet.');
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
