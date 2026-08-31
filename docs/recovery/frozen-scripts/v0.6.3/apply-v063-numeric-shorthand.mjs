import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const sourcePath = process.env.V063_CARD_GENERAL_SOURCE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_General_Rules_Normalized_Candidate.json';
const candidatePath = process.env.V063_CARD_SHORTHAND_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_SHORTHAND_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Shorthand_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const candidate = structuredClone(source);

assertPool(baseline);
assertPool(candidate);

const baselineById = new Map(baseline.cards.map((card) => [card.id, card]));
const sourceById = new Map(source.cards.map((card) => [card.id, card]));
const byName = new Map(candidate.cards.map((card) => [card.name, card]));
let shorthandEffects = 0;

const changes = [
  ['Conscription', 'Gambit',
    'When Gambits are revealed, form your Reserve with one additional card. You may choose an additional Tactic during this battle.',
    'When Gambits are revealed: +1 Reserve, +1 Tactic.'],
  ['Invasion', 'Battle',
    'If you are the attacker, form your Reserve with one additional card and you may choose an additional Tactic.',
    'Attacker: +1 Reserve, +1 Tactic.'],
  ['Liberation', 'Battle',
    'If this battle is a Counterattack, form your Reserve with one additional card and you may choose an additional Tactic.',
    'Counterattack: +1 Reserve, +1 Tactic.'],
  ['Tactical Planning', 'Gambit',
    'When Gambits are revealed, form your Reserve with one additional card. This does not increase the number of Tactics you may choose.',
    'When Gambits are revealed: +1 Reserve. Tactic limit unchanged.'],
  ['Resistance', 'Asset',
    'When initiating a Counterattack, form your Reserve with two additional cards.',
    'When initiating a Counterattack: +2 Reserve.'],
  ['Black Covenant', 'Tactic',
    'Gain advantage. Then you may choose an additional Tactic from your Hand.',
    'Gain advantage. +1 Tactic from Hand.'],
  ['Brothers in Arms', 'Activate',
    'When choosing Tactics, if you did not set a Gambit, you may discard this card to choose one Tactic from your Reserve and an additional Tactic from your Hand, or pass.',
    'When choosing Tactics, if you did not set a Gambit, you may discard this card for +1 Tactic from Hand.'],
  ['Brothers in Arms', 'Tactic',
    'When you choose this card as your Tactic, if you did not set a Gambit, you may also choose an additional Tactic from your Hand.',
    'When you choose this card as your Tactic, if you did not set a Gambit: +1 Tactic from Hand.'],
  ['Shock and Awe', 'Battle',
    'When attacking on an enemy-controlled Territory, after Tactics are revealed, you may choose an additional Tactic from your Hand.',
    'When attacking on an enemy-controlled Territory, after Tactics are revealed: +1 Tactic from Hand.'],
  ['Hold the Line', 'Activate',
    'after Tactics are revealed, draw two cards into your Reserve. You may choose one as an additional Tactic.',
    'after Tactics are revealed, +2 Reserve; +1 Tactic from those cards.'],
  ['Hold the Line', 'Battle',
    'after Tactics are revealed, draw two cards into your Reserve. You may choose one as an additional Tactic.',
    'after Tactics are revealed, +2 Reserve; +1 Tactic from those cards.'],
  ['Reinforcements', 'Battle',
    'After Tactics are revealed, draw one additional card into your Reserve. You may choose it as an additional Tactic.',
    'After Tactics are revealed: +1 Reserve; +1 Tactic using that card.'],
  ['Reserve Force', 'Activate',
    'After Tactics are revealed in a battle involving you, you may discard this card to choose the stored card as an additional Tactic.',
    'After Tactics are revealed in a battle involving you, you may discard this card for +1 Tactic using the stored card.'],
  ['Give Chase', 'Action',
    'Form your Reserve with one fewer card for each earlier battle after the first that you fought this turn. This may reduce your Reserve to zero cards.',
    'Reserve −1 for each earlier battle after the first you fought this turn, to a minimum of 0.']
];

for (const [name, label, from, to] of changes) {
  replaceExact(name, label, from, to);
  shorthandEffects += 1;
}

if (shorthandEffects !== 14) {
  throw new Error(`Expected 14 numeric-shorthand effect changes, found ${shorthandEffects}.`);
}

for (const card of candidate.cards) syncLegacyEffectFields(card);

candidate.status = 'Development candidate — general rules and numeric shorthand normalized';
candidate.normalization = {
  ...(candidate.normalization ?? {}),
  stage: 'numeric-shorthand-normalized',
  numeric_shorthand: {
    reserve: '+N Reserve adds N cards to the Reserve at the stated timing; during Reserve formation it modifies the normal Reserve size.',
    tactic: '+N Tactic permits N additional Tactics; the default source is Reserve and a different source is printed only when it overrides that default.',
    negative_reserve: '−N Reserve reduces the Reserve by N at the stated timing, subject to any printed minimum.'
  },
  shorthand_effects_changed: shorthandEffects
};

const rows = candidate.cards.map((card) => {
  const original = baselineById.get(card.id);
  const beforeShorthand = sourceById.get(card.id);
  if (!original || !beforeShorthand) throw new Error(`Missing baseline/source card: ${card.id}`);
  const publishedText = cardText(original);
  const generalText = cardText(beforeShorthand);
  const afterText = cardText(card);
  return {
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    published_words: words(publishedText),
    general_words: words(generalText),
    after_words: words(afterText),
    published_chars: publishedText.length,
    general_chars: generalText.length,
    after_chars: afterText.length,
    shorthand_char_delta: afterText.length - generalText.length,
    total_char_delta: afterText.length - publishedText.length,
    changed_by_shorthand: afterText !== generalText
  };
});

mkdirSync(dirname(candidatePath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows));

function replaceExact(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}`);
  if (!effect.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  effect.text = effect.text.replace(from, to);
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
    acc.generalWords += row.general_words;
    acc.afterWords += row.after_words;
    acc.publishedChars += row.published_chars;
    acc.generalChars += row.general_chars;
    acc.afterChars += row.after_chars;
    if (row.changed_by_shorthand) acc.changed += 1;
    return acc;
  }, { publishedWords: 0, generalWords: 0, afterWords: 0, publishedChars: 0, generalChars: 0, afterChars: 0, changed: 0 });

  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 Numeric-Shorthand Card Density',
    '',
    `**Published baseline:** \`${baselinePath}\`  `,
    `**General-rule source:** \`${sourcePath}\`  `,
    '**Stage:** Reserve/Tactic numeric shorthand after general-rule centralization  ',
    `**Cards:** ${rows.length}  `,
    `**Effects changed by numeric shorthand:** ${shorthandEffects}  `,
    `**Cards changed by numeric shorthand:** ${totals.changed}`,
    '',
    '## Shorthand semantics',
    '',
    '- `+N Reserve` adds N cards to the Reserve at the stated timing; during Reserve formation it increases the normal Reserve size by N.',
    '- `−N Reserve` reduces the Reserve by N at the stated timing, subject to any printed minimum.',
    '- `+N Tactic` permits N additional Tactics. **Reserve is the default source.** Print `from Hand`, `from those cards`, `using that card`, or another source only when the effect overrides the default.',
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | After general rules | After shorthand | Shorthand change | Total change |',
    '|---|---:|---:|---:|---:|---:|',
    `| Words | ${totals.publishedWords} | ${totals.generalWords} | ${totals.afterWords} | ${totals.afterWords - totals.generalWords} | ${totals.afterWords - totals.publishedWords} |`,
    `| Characters | ${totals.publishedChars} | ${totals.generalChars} | ${totals.afterChars} | ${totals.afterChars - totals.generalChars} | ${totals.afterChars - totals.publishedChars} |`,
    '',
    '## Densest cards after numeric shorthand',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ from general rules | Δ from published |',
    '|---:|---|---|---:|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.shorthand_char_delta} | ${row.total_char_delta} |`),
    '',
    '## Complete 128-card measurement',
    '',
    '| Card | Allegiance | Published chars | General-rule chars | Shorthand chars | Shorthand Δ | Total Δ |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...[...rows].sort((a, b) => a.allegiance.localeCompare(b.allegiance) || a.name.localeCompare(b.name)).map((row) => `| ${row.name} | ${row.allegiance} | ${row.published_chars} | ${row.general_chars} | ${row.after_chars} | ${row.shorthand_char_delta} | ${row.total_char_delta} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Numeric shorthand applied to ${rows.filter((row) => row.changed_by_shorthand).length} cards across ${shorthandEffects} effects.`);
console.log(`General rules → shorthand words: ${rows.reduce((n, row) => n + row.general_words, 0)} → ${rows.reduce((n, row) => n + row.after_words, 0)}.`);
console.log(`General rules → shorthand characters: ${rows.reduce((n, row) => n + row.general_chars, 0)} → ${rows.reduce((n, row) => n + row.after_chars, 0)}.`);
console.log(`Wrote ${candidatePath}`);
console.log(`Wrote ${reportPath}`);
