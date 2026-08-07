import { readFileSync, writeFileSync } from 'node:fs';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const priorPath = process.env.V063_CARD_SHORTHAND_SOURCE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Shorthand_Normalized_Candidate.json';
const candidatePath = process.env.V063_CARD_COMPACT_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_COMPACT_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const prior = JSON.parse(readFileSync(priorPath, 'utf8'));
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));

const byName = new Map(candidate.cards.map((card) => [card.name, card]));
let changed = 0;

const replacements = [
  ['Advance Guard', 'Battle', 'Attacker without a Gambit — Advantage.', 'Attacker without a Gambit — gain advantage.'],
  ['Assassins', 'Battle', 'If the opponent set no Gambit, Opponent: Disadvantage.', 'If the opponent set no Gambit, the opponent gains disadvantage.'],
  ['Black Covenant', 'Tactic', 'Advantage. +1 Tactic from Hand.', 'Gain advantage. +1 Tactic from Hand.'],
  ['Court Martial', 'Battle', 'Opponent: Disadvantage.', 'Opponent gains disadvantage.'],
  ['Dark Omens', 'Battle', 'for Advantage', 'to gain advantage'],
  ['Deep Cover', 'Battle', ', Advantage.', ', gain advantage.'],
  ['Disinformation', 'Gambit', ', Advantage.', ', gain advantage.'],
  ['Entrenchment', 'Battle', 'Defender — Opponent: Disadvantage.', 'Defender — opponent gains disadvantage.'],
  ['Foothold', 'Battle', ', Advantage.', ', gain advantage.'],
  ['Illegal Occupation', 'Battle', 'Counterattack — their banked Assets are inactive during this battle and Advantage.', 'Counterattack — their banked Assets are inactive during this battle; gain advantage.'],
  ['Insurrection', 'Battle', 'Counterattack — Double Advantage. Otherwise, Attacker — Advantage.', 'Counterattack — gain double advantage. Otherwise, Attacker — gain advantage.'],
  ['Palisade Wall', 'Battle', 'If there is no eligible Gambit, Advantage instead.', 'If there is no eligible Gambit, gain advantage instead.'],
  ['Requisition', 'Battle', 'for Advantage', 'to gain advantage'],
  ['Resistance', 'Battle', 'Counterattack — Advantage.', 'Counterattack — gain advantage.'],
  ['Resourcefulness', 'Battle', ', Advantage.', ', gain advantage.'],
  ['Rousing Speech', 'Battle', ', Advantage.', ', gain advantage.'],
  ['Stand Ground', 'Battle', 'Defender — Advantage.', 'Defender — gain advantage.'],
  ['Witchcraft', 'Battle', 'If you cannot choose one, Advantage.', 'If you cannot choose one, gain advantage.']
];

for (const [name, label, from, to] of replacements) {
  const card = byName.get(name);
  if (!card) throw new Error(`Card not found: ${name}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${name}`);
  if (!effect.text.includes(from)) throw new Error(`Expected compact Advantage text not found on ${name} ${label}: ${from}`);
  effect.text = effect.text.replace(from, to);
  changed += 1;
}

if (changed !== 18) throw new Error(`Expected 18 Advantage/Disadvantage wording restorations, found ${changed}.`);

for (const card of candidate.cards) syncLegacyEffectFields(card);

const finalText = candidate.cards.flatMap((card) => (card.effects ?? []).map((effect) => effect.text)).join('\n');
for (const forbidden of ['Opponent: Disadvantage', 'Double Advantage', ' — Advantage.', 'for Advantage']) {
  if (finalText.includes(forbidden)) throw new Error(`Unnatural Advantage shorthand remains: ${forbidden}`);
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  advantage_wording: {
    style: 'natural-language',
    rule: 'Card faces use gain advantage / gain double advantage / gain disadvantage wording while the underlying instance-based stacking rule remains unchanged.',
    effects_restored: changed
  }
};

const baselineById = new Map(baseline.cards.map((card) => [card.id, card]));
const priorById = new Map(prior.cards.map((card) => [card.id, card]));
const rows = candidate.cards.map((card) => {
  const published = baselineById.get(card.id);
  const beforeCompact = priorById.get(card.id);
  if (!published || !beforeCompact) throw new Error(`Missing comparison card: ${card.id}`);
  const publishedText = cardText(published);
  const priorText = cardText(beforeCompact);
  const afterText = cardText(card);
  return {
    name: card.name,
    allegiance: card.allegiance,
    published_words: words(publishedText),
    prior_words: words(priorText),
    after_words: words(afterText),
    published_chars: publishedText.length,
    prior_chars: priorText.length,
    after_chars: afterText.length,
    stage_delta: afterText.length - priorText.length,
    total_delta: afterText.length - publishedText.length
  };
});

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows));

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

function buildReport(rows) {
  const totals = rows.reduce((acc, row) => {
    acc.publishedWords += row.published_words;
    acc.priorWords += row.prior_words;
    acc.afterWords += row.after_words;
    acc.publishedChars += row.published_chars;
    acc.priorChars += row.prior_chars;
    acc.afterChars += row.after_chars;
    return acc;
  }, { publishedWords: 0, priorWords: 0, afterWords: 0, publishedChars: 0, priorChars: 0, afterChars: 0 });

  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 Compact-Shorthand Card Density',
    '',
    `**Published baseline:** \`${baselinePath}\`  `,
    `**Prior shorthand source:** \`${priorPath}\`  `,
    '**Stage:** compact shorthand with natural Advantage/Disadvantage wording before bespoke compression  ',
    `**Cards:** ${rows.length}  `,
    `**Advantage/Disadvantage effects restored to natural wording:** ${changed}`,
    '',
    '## Card-facing convention',
    '',
    '- Use `gain advantage`, `gain double advantage`, and `gain disadvantage` on card faces.',
    '- Advantage remains instance-based and stackable; natural wording does not change the underlying stacking rule.',
    '- Other adopted shorthand remains in force (`+N Card(s)`, `+N Action`, resources, Battle Total, Retreat, Reserve/Tactic, Front Line, condition prefixes, and reroll cleanup).',
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | Prior shorthand | Final pre-bespoke | Total change |',
    '|---|---:|---:|---:|---:|',
    `| Words | ${totals.publishedWords} | ${totals.priorWords} | ${totals.afterWords} | ${totals.afterWords - totals.publishedWords} |`,
    `| Characters | ${totals.publishedChars} | ${totals.priorChars} | ${totals.afterChars} | ${totals.afterChars - totals.publishedChars} |`,
    '',
    '## Densest cards after final shared normalization',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ from published |',
    '|---:|---|---|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.total_delta} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Restored natural Advantage/Disadvantage wording across ${changed} effects.`);
console.log(`Final pre-bespoke words: ${rows.reduce((n, row) => n + row.after_words, 0)}.`);
console.log(`Final pre-bespoke characters: ${rows.reduce((n, row) => n + row.after_chars, 0)}.`);
