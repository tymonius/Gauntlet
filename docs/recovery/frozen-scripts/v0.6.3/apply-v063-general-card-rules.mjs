import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const sourcePath = process.env.V063_CARD_CONVENTION_SOURCE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Convention_Normalized_Candidate.json';
const candidatePath = process.env.V063_CARD_GENERAL_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_General_Rules_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_GENERAL_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_General_Rules_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const candidate = structuredClone(source);

assertPool(baseline);
assertPool(candidate);

const sourceById = new Map(source.cards.map((card) => [card.id, card]));
const baselineById = new Map(baseline.cards.map((card) => [card.id, card]));
const byName = new Map(candidate.cards.map((card) => [card.name, card]));

const stats = {
  inherent_banking_actions_removed: 0,
  direct_action_disclaimers_removed: 0,
  affirmative_movement_clauses_removed_or_reduced: 0,
  additional_tactic_clauses_reduced: 0,
  sanctions_reduced: 0,
  reveal_priority_clauses_reduced: 0
};

applyInherentBanking();
applyDirectProcedureRule();
applyMovementDefault();
applyAdditionalTacticRule();
applySanctionsRule();
applyRevealInterferenceRule();

for (const card of candidate.cards) syncLegacyEffectFields(card);

assertExpected('inherent banking Actions', stats.inherent_banking_actions_removed, 49);
assertExpected('direct Action disclaimers', stats.direct_action_disclaimers_removed, 9);
assertExpected('affirmative movement clauses', stats.affirmative_movement_clauses_removed_or_reduced, 4);
assertExpected('additional-Tactic clauses', stats.additional_tactic_clauses_reduced, 8);
assertExpected('Sanctions cards', stats.sanctions_reduced, 3);
assertExpected('reveal-priority cards', stats.reveal_priority_clauses_reduced, 8);

candidate.status = 'Development candidate — general card rules centralized';
candidate.normalization = {
  ...(candidate.normalization ?? {}),
  stage: 'general-card-rules-centralized',
  general_rules_source: 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  general_rule_reductions: stats
};

const rows = candidate.cards.map((card) => {
  const original = baselineById.get(card.id);
  const beforeGeneral = sourceById.get(card.id);
  if (!original || !beforeGeneral) throw new Error(`Missing baseline/source card: ${card.id}`);
  const publishedText = cardText(original);
  const conventionText = cardText(beforeGeneral);
  const afterText = cardText(card);
  return {
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    published_words: words(publishedText),
    convention_words: words(conventionText),
    after_words: words(afterText),
    published_chars: publishedText.length,
    convention_chars: conventionText.length,
    after_chars: afterText.length,
    general_char_delta: afterText.length - conventionText.length,
    total_char_delta: afterText.length - publishedText.length,
    changed_by_general_rules: afterText !== conventionText
  };
});

mkdirSync(dirname(candidatePath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows));

function applyInherentBanking() {
  for (const card of candidate.cards) {
    const labels = new Set((card.effects ?? []).map((effect) => effect.label));
    if (!labels.has('Asset') && !labels.has('Activate')) continue;
    const before = card.effects.length;
    card.effects = card.effects.filter((effect) => !(effect.label === 'Action' && effect.text.trim() === 'Bank this card.'));
    stats.inherent_banking_actions_removed += before - card.effects.length;
  }
}

function applyDirectProcedureRule() {
  const phrases = [
    ' without spending another Action',
    ' without spending an Action',
    ' without taking an Action',
    ', without taking additional Actions'
  ];
  for (const card of candidate.cards) {
    for (const effect of card.effects ?? []) {
      for (const phrase of phrases) {
        while (effect.text.includes(phrase)) {
          effect.text = effect.text.replace(phrase, '');
          stats.direct_action_disclaimers_removed += 1;
        }
      }
    }
  }
}

function applyMovementDefault() {
  for (const label of ['Activate', 'Battle']) {
    replaceExact('Countercharge', label, ' This movement may start a battle.', '');
    stats.affirmative_movement_clauses_removed_or_reduced += 1;
  }
  replaceExact('Invasion', 'Action', ' and may create a pending battle.', '.');
  stats.affirmative_movement_clauses_removed_or_reduced += 1;
  replaceExact('Give Chase', 'Action', 'This movement may create a pending battle. If it does,', 'If this movement creates a pending battle,');
  stats.affirmative_movement_clauses_removed_or_reduced += 1;
}

function applyAdditionalTacticRule() {
  const changes = [
    ['Black Covenant', 'Tactic', 'Then you may play one eligible card from your Hand face up as an additional Tactic.', 'Then you may choose an additional Tactic from your Hand.'],
    ['Brothers in Arms', 'Activate', 'you may discard this card to choose one Tactic from your Reserve and one eligible card from your Hand as an additional Tactic. Set both face down as your Tactics, or pass.', 'you may discard this card to choose one Tactic from your Reserve and an additional Tactic from your Hand, or pass.'],
    ['Brothers in Arms', 'Tactic', 'you may also choose one eligible card from your Hand as an additional Tactic. Set it face down and reveal both together.', 'you may also choose an additional Tactic from your Hand.'],
    ['Hold the Line', 'Activate', 'You may play one face up as an additional Tactic.', 'You may choose one as an additional Tactic.'],
    ['Hold the Line', 'Battle', 'You may play one face up as an additional Tactic.', 'You may choose one as an additional Tactic.'],
    ['Reinforcements', 'Battle', 'You may play it face up as an additional Tactic.', 'You may choose it as an additional Tactic.'],
    ['Reserve Force', 'Activate', 'you may discard this card to play the stored card face up as an additional Tactic.', 'you may discard this card to choose the stored card as an additional Tactic.'],
    ['Shock and Awe', 'Battle', 'you may play an eligible card from your Hand face up as an additional Tactic.', 'you may choose an additional Tactic from your Hand.']
  ];
  for (const [name, label, from, to] of changes) {
    replaceExact(name, label, from, to);
    stats.additional_tactic_clauses_reduced += 1;
  }
}

function applySanctionsRule() {
  replaceExact('Sanctions: Blockade', 'Text', 'Put this card in its owner\'s Discard Pile after the identified opponent accepts that owner\'s Terms or loses control of this Territory.', 'Put this card in its owner\'s Discard Pile if that opponent loses control of this Territory.');
  replaceExact('Sanctions: Blockade', 'Text', ' Identify that opponent and this card\'s owner.', '');
  replaceExact('Sanctions: Blockade', 'Text', 'identified opponent', 'that opponent', true);
  replaceExact('Sanctions: Blockade', 'Text', 'identified owner', 'you', true);
  stats.sanctions_reduced += 1;

  for (const name of ['Sanctions: Censure', 'Sanctions: Embargo']) {
    replaceExact(name, 'Text', ' Identify that opponent.', '');
    replaceExact(name, 'Text', '\nAfter that opponent accepts your Terms, put this card in its owner\'s Discard Pile.', '');
    stats.sanctions_reduced += 1;
  }
}

function applyRevealInterferenceRule() {
  replaceExact('Armistice', 'Battle', 'When revealed, apply effects that could negate it before other effects at that stage. ', 'When revealed, ');
  stats.reveal_priority_clauses_reduced += 1;

  replaceExact('Capital Punishment', 'Battle', 'When revealed, before other effects at that stage are applied, ', 'When revealed, ');
  stats.reveal_priority_clauses_reduced += 1;

  for (const name of ['Disruption', 'Palisade Wall', 'Sabotage', 'Scouting Report', 'Tyranny']) {
    replaceExact(name, 'Battle', 'When revealed, before other effects at this stage, ', 'When revealed, ');
    stats.reveal_priority_clauses_reduced += 1;
  }

  replaceExact('Assassins', 'Battle', ' If this card is revealed with Gambits, apply this before other Gambit effects.', '');
  stats.reveal_priority_clauses_reduced += 1;
}

function replaceExact(cardName, label, from, to, replaceAll = false) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}`);
  if (!effect.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  effect.text = replaceAll ? effect.text.split(from).join(to) : effect.text.replace(from, to);
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((effect) => [String(effect.label).toLowerCase(), effect.text]));
  for (const key of ['action', 'battle', 'gambit', 'tactic', 'asset', 'activate', 'overlay']) {
    if (labels.has(key)) card[key] = labels.get(key);
    else if (Object.hasOwn(card, key)) delete card[key];
  }
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((effect) => `${effect.label ?? ''}: ${effect.text ?? ''}`.trim()).join(' ');
}

function assertExpected(label, actual, expected) {
  if (actual !== expected) throw new Error(`Expected ${expected} ${label} changes, found ${actual}. Review the pool before changing this assertion.`);
}

function assertPool(data) {
  if (!Array.isArray(data.cards)) throw new Error('Data has no cards array.');
  if (data.cards.length !== 128) throw new Error(`Expected 128 cards, found ${data.cards.length}.`);
  const counts = data.cards.reduce((map, card) => map.set(card.allegiance, (map.get(card.allegiance) ?? 0) + 1), new Map());
  const expected = new Map([['Neutral', 50], ['Military', 13], ['Diplomats', 13], ['Financiers', 13], ['Intelligence', 13], ['Mystics', 13], ['Inquisition', 13]]);
  for (const [allegiance, count] of expected) {
    if (counts.get(allegiance) !== count) throw new Error(`Expected ${count} ${allegiance} cards, found ${counts.get(allegiance) ?? 0}.`);
  }
}

function buildReport(rows) {
  const totals = rows.reduce((acc, row) => {
    acc.publishedWords += row.published_words;
    acc.conventionWords += row.convention_words;
    acc.afterWords += row.after_words;
    acc.publishedChars += row.published_chars;
    acc.conventionChars += row.convention_chars;
    acc.afterChars += row.after_chars;
    if (row.changed_by_general_rules) acc.changed += 1;
    return acc;
  }, { publishedWords: 0, conventionWords: 0, afterWords: 0, publishedChars: 0, conventionChars: 0, afterChars: 0, changed: 0 });

  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 General-Rules Card Density',
    '',
    `**Published baseline:** \`${baselinePath}\`  `,
    `**Convention-normalized source:** \`${sourcePath}\`  `,
    '**Stage:** repeated procedures centralized as general rules before bespoke card compression  ',
    `**Cards:** ${rows.length}  `,
    `**Cards changed by general-rule centralization:** ${totals.changed}`,
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | After conventions | After general rules | General-rule change | Total change |',
    '|---|---:|---:|---:|---:|---:|',
    `| Words | ${totals.publishedWords} | ${totals.conventionWords} | ${totals.afterWords} | ${totals.afterWords - totals.conventionWords} | ${totals.afterWords - totals.publishedWords} |`,
    `| Characters | ${totals.publishedChars} | ${totals.conventionChars} | ${totals.afterChars} | ${totals.afterChars - totals.conventionChars} | ${totals.afterChars - totals.publishedChars} |`,
    '',
    '## General-rule reductions',
    '',
    '| Rule | Applied reductions |',
    '|---|---:|',
    `| Inherent banking Action | ${stats.inherent_banking_actions_removed} |`,
    `| Directly permitted card procedures | ${stats.direct_action_disclaimers_removed} |`,
    `| Effect-granted movement default | ${stats.affirmative_movement_clauses_removed_or_reduced} |`,
    `| Additional-Tactic shared rule | ${stats.additional_tactic_clauses_reduced} |`,
    `| Sanctions default | ${stats.sanctions_reduced} cards |`,
    `| Reveal-stage interference | ${stats.reveal_priority_clauses_reduced} cards |`,
    '',
    '## Densest cards after general-rule centralization',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ from conventions | Δ from published |',
    '|---:|---|---|---:|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.general_char_delta} | ${row.total_char_delta} |`),
    '',
    '## Complete 128-card measurement',
    '',
    '| Card | Allegiance | Published chars | Convention chars | General-rule chars | General Δ | Total Δ |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...[...rows].sort((a, b) => a.allegiance.localeCompare(b.allegiance) || a.name.localeCompare(b.name)).map((row) => `| ${row.name} | ${row.allegiance} | ${row.published_chars} | ${row.convention_chars} | ${row.after_chars} | ${row.general_char_delta} | ${row.total_char_delta} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`General card rules applied to ${rows.filter((row) => row.changed_by_general_rules).length} cards.`);
console.log(`Published → general-rules words: ${rows.reduce((n, row) => n + row.published_words, 0)} → ${rows.reduce((n, row) => n + row.after_words, 0)}.`);
console.log(`Published → general-rules characters: ${rows.reduce((n, row) => n + row.published_chars, 0)} → ${rows.reduce((n, row) => n + row.after_chars, 0)}.`);
console.log(`Wrote ${candidatePath}`);
console.log(`Wrote ${reportPath}`);
