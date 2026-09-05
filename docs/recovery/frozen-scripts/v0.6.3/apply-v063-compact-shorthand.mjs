import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const sourcePath = process.env.V063_CARD_SHORTHAND_SOURCE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Shorthand_Normalized_Candidate.json';
const candidatePath = process.env.V063_CARD_COMPACT_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_COMPACT_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const candidate = structuredClone(source);

assertPool(baseline);
assertPool(candidate);

const baselineById = new Map(baseline.cards.map((card) => [card.id, card]));
const sourceById = new Map(source.cards.map((card) => [card.id, card]));
const byName = new Map(candidate.cards.map((card) => [card.name, card]));
const touchedEffects = new Set();
const stats = {
  sanctions_repairs: 0,
  card_draw: 0,
  additional_actions: 0,
  fixed_resource_gains: 0,
  battle_total: 0,
  retreat: 0,
  advantage_disadvantage: 0,
  role_outcome_prefixes: 0,
  resource_set: 0,
  front_line: 0,
  reroll_default: 0
};

// Repair the malformed Blockade phrasing produced by the earlier Sanctions reducer.
replaceExact('Sanctions: Blockade', 'Text', 'the that opponent', 'that opponent', 'sanctions_repairs');
replaceExact('Sanctions: Blockade', 'Text', 'the you gains 1 Influence', '+1 Influence', 'sanctions_repairs');

// +N Card(s). Preserve optional composite draws when shorthand would obscure optionality.
replaceAll(/\bto draw one card\b/g, 'for +1 Card', 'card_draw');
replaceAll(/\bto draw two cards\b/g, 'for +2 Cards', 'card_draw');
replaceAll(/\byou draw one card\b/gi, '+1 Card', 'card_draw');
replaceAll(/\bThe opponent draws one card\b/g, 'Opponent: +1 Card', 'card_draw');
replaceAll(/\bDraw three cards\b/g, '+3 Cards', 'card_draw');
replaceAll(/\bDraw two cards\b/g, '+2 Cards', 'card_draw');
replaceAll(/\bDraw one card\b/g, '+1 Card', 'card_draw');
replaceAll(/\bthen draw two cards\b/g, 'then +2 Cards', 'card_draw');
replaceAll(/\bthen draw one card\b/g, 'then +1 Card', 'card_draw');
replaceAll(/\band draw one card\b/g, 'and +1 Card', 'card_draw');
replaceAll(/, draw two cards\b/g, ', +2 Cards', 'card_draw');
replaceAll(/, draw one card\b/g, ', +1 Card', 'card_draw');
replaceAll(/\bdraw one card before\b/g, '+1 Card before', 'card_draw');
replaceExact('Trade Concessions', 'Accepted', 'Then put this card in your Discard Pile and +1 Card.', 'Then put this card in your Discard Pile; +1 Card.', 'card_draw');

// +N Action uses the current phase unless another phase is stated.
replaceAll(/After this Action resolves, you may take one additional Action during this phase\./g, '+1 Action.', 'additional_actions');
replaceAll(/Then you may take one additional Action this phase\./g, '+1 Action.', 'additional_actions');
replaceExact('Liberation', 'Asset', 'During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.', 'During your Denouement that turn: +1 Action.', 'additional_actions');
replaceExact('Reinforcements', 'Activate', 'During Opening or Denouement, you may discard this card to take one additional Action during that phase.', 'During Opening or Denouement, discard this card: +1 Action.', 'additional_actions');

// Positive fixed resource gains. Costs/losses remain verbal.
replaceAll(/\b(?:you |they )?gain ([1234]) (Capital|Influence|Command|Conviction)\b/gi, '+$1 $2', 'fixed_resource_gains');
replaceExact('Unbroken Ranks', 'Activate', 'you may discard this card to +1 Command.', 'you may discard this card: +1 Command.', 'fixed_resource_gains');

// Battle total shorthand.
replaceAll(/\badd \+([12]) to your battle total\b/gi, '+$1 Battle Total', 'battle_total');

// Advantage / disadvantage instructions.
replaceAll(/\bto gain advantage\b/gi, 'for Advantage', 'advantage_disadvantage');
replaceAll(/\byou gain advantage\b/gi, 'Advantage', 'advantage_disadvantage');
replaceAll(/\bgain double advantage\b/gi, 'Double Advantage', 'advantage_disadvantage');
replaceAll(/\bgain advantage\b/gi, 'Advantage', 'advantage_disadvantage');
replaceAll(/\bgive them disadvantage during this battle\b/gi, 'Opponent: Disadvantage', 'advantage_disadvantage');
replaceAll(/\bthe opponent gains disadvantage during this battle\b/gi, 'Opponent: Disadvantage', 'advantage_disadvantage');

// Role/outcome prefixes where the condition is the entire scope of the following clause.
replaceAll(/\bIf you are the attacker,\s*/g, 'Attacker — ', 'role_outcome_prefixes');
replaceAll(/\bIf you are the defender,\s*/g, 'Defender — ', 'role_outcome_prefixes');
replaceAll(/\bIf this battle is a Counterattack,\s*/g, 'Counterattack — ', 'role_outcome_prefixes');
replaceAll(/\bIn the Aftermath, if you won,\s*/g, 'In the Aftermath: Win — ', 'role_outcome_prefixes');
replaceAll(/\bIf you lose,\s*/g, 'Lose — ', 'role_outcome_prefixes');
replaceAll(/Otherwise, if you are the attacker,\s*/g, 'Otherwise, Attacker — ', 'role_outcome_prefixes');
replaceExact('Shock and Awe', 'Battle', 'If you win, choose one:', 'Win — choose one:', 'role_outcome_prefixes');
replaceExact('Advance Guard', 'Battle', 'If you are the attacker and did not set a Gambit, Advantage.', 'Attacker without a Gambit — Advantage.', 'role_outcome_prefixes');

// Retreat +N modifies the identified retreat; bespoke Breakthrough ordering remains explicit.
replaceExact('Court Martial', 'Activate', 'you may discard this card to make them retreat one additional position, if able.', 'you may discard this card: Retreat +1, if able.', 'retreat');
replaceExact('Court Martial', 'Battle', 'If they lose, after their normal retreat they retreat one additional position, if able.', 'If they lose, after their normal retreat: Retreat +1, if able.', 'retreat');
replaceExact('Landslide', 'Overlay', 'When a player retreats onto this Territory, they retreat one additional Position, if able.', 'When a player retreats onto this Territory: Retreat +1, if able.', 'retreat');
replaceExact('No Martyrs', 'Activate', 'If the opponent loses, they cannot benefit from effects they control triggered by that loss or resulting retreat, and they retreat one additional position.', 'Opponent loses — they cannot benefit from effects they control triggered by that loss or resulting retreat; Retreat +1.', 'retreat');
replaceExact('No Martyrs', 'Battle', 'If the opponent loses, they cannot benefit from effects they control triggered by that loss or resulting retreat, and they retreat one additional position.', 'Opponent loses — they cannot benefit from effects they control triggered by that loss or resulting retreat; Retreat +1.', 'retreat');
replaceExact('Shock and Awe', 'Battle', 'retreat one additional Position.', 'Retreat +1.', 'retreat');
replaceExact('War Crimes', 'Activate', "put all opposing Tactics from that battle in their owner's Graveyard instead of their Discard Pile and make the opponent retreat one additional position.", "put all opposing Tactics from that battle in their owner's Graveyard instead of their Discard Pile; Opponent: Retreat +1.", 'retreat');

// Set-value shorthand.
replaceAll(/\bset your Command to 2\b/gi, 'Command = 2', 'resource_set');
replaceAll(/\bset your Conviction to 4\b/gi, 'Conviction = 4', 'resource_set');
replaceAll(/Conviction = 4 and put this card/g, 'Conviction = 4; put this card', 'resource_set');

// Front Line shorthand uses a verb, not +N notation.
replaceAll(/\badvance your Front Line by one Territory\b/gi, 'advance Front Line 1', 'front_line');
replaceAll(/(?<=\. )advance Front Line 1/g, 'Advance Front Line 1', 'front_line');
replaceAll(/(?<=— )advance Front Line 1/g, 'Advance Front Line 1', 'front_line');

// Rerolls use the new result by default.
replaceExact('Circle of Bones', 'Overlay', 'reroll and use the new result', 'reroll', 'reroll_default');
replaceExact("Fate's Toll", 'Battle', ' You must use the new result.', '', 'reroll_default');
replaceExact('Valor', 'Battle', ' You must use the new result.', '', 'reroll_default');

for (const card of candidate.cards) syncLegacyEffectFields(card);

validateFinalText();

candidate.status = 'Development candidate — compact shorthand normalized before bespoke compression';
candidate.normalization = {
  ...(candidate.normalization ?? {}),
  stage: 'compact-shorthand-normalized',
  compact_shorthand: {
    cards: '+N Card(s) draws N cards from your Draw Pile into your Hand unless another player or destination is stated.',
    actions: '+N Action grants N additional Actions in the current phase unless another phase is stated.',
    resources: '+N Capital / Influence / Command / Conviction gains that amount; costs and losses remain verbal.',
    battle_total: '+N Battle Total adds N to your battle total.',
    retreat: 'Retreat +N increases the identified retreat by N Positions.',
    advantage: 'Advantage / Double Advantage / Disadvantage are direct instructions.',
    set_value: 'Resource = N sets that resource to N.',
    front_line: 'Advance Front Line N advances the Front Line by N Territories.',
    prefixes: 'Attacker — / Defender — / Counterattack — / Win — / Lose — scope the following clause.',
    rerolls: 'A reroll replaces the result it rerolls; the new result is used unless an effect says otherwise.'
  },
  compact_shorthand_stats: stats,
  compact_shorthand_effects_changed: touchedEffects.size
};

const rows = candidate.cards.map((card) => {
  const original = baselineById.get(card.id);
  const beforeCompact = sourceById.get(card.id);
  if (!original || !beforeCompact) throw new Error(`Missing baseline/source card: ${card.id}`);
  const publishedText = cardText(original);
  const shorthandText = cardText(beforeCompact);
  const afterText = cardText(card);
  return {
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    published_words: words(publishedText),
    shorthand_words: words(shorthandText),
    after_words: words(afterText),
    published_chars: publishedText.length,
    shorthand_chars: shorthandText.length,
    after_chars: afterText.length,
    compact_char_delta: afterText.length - shorthandText.length,
    total_char_delta: afterText.length - publishedText.length,
    changed_by_compact: afterText !== shorthandText
  };
});

mkdirSync(dirname(candidatePath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows));

function replaceExact(cardName, label, from, to, statKey) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}`);
  if (!effect.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  effect.text = effect.text.replace(from, to);
  stats[statKey] += 1;
  touchedEffects.add(`${card.id}:${label}`);
}

function replaceAll(pattern, replacement, statKey) {
  for (const card of candidate.cards) {
    for (const effect of card.effects ?? []) {
      const before = effect.text;
      let count = 0;
      effect.text = before.replace(pattern, (...args) => {
        count += 1;
        if (typeof replacement === 'function') return replacement(...args);
        return replacement.replace(/\$(\d+)/g, (_, n) => args[Number(n)] ?? '');
      });
      if (count) {
        stats[statKey] += count;
        touchedEffects.add(`${card.id}:${effect.label}`);
      }
    }
  }
}

function validateFinalText() {
  const allText = candidate.cards.flatMap((card) => (card.effects ?? []).map((effect) => effect.text)).join('\n');
  for (const bad of ['the that opponent', 'the you gains', 'add +1 to your battle total', 'add +2 to your battle total', 'set your Command to 2', 'set your Conviction to 4', 'advance your Front Line by one Territory', 'You must use the new result.']) {
    if (allText.includes(bad)) throw new Error(`Compact shorthand residual remains: ${bad}`);
  }
  if (/\b(?:you |they )?gain [1-4] (?:Capital|Influence|Command|Conviction)\b/i.test(allText)) {
    throw new Error('A fixed positive resource gain remains outside shorthand.');
  }
  // One optional composite draw remains intentionally verbal on Rousing Speech.
  const drawResiduals = [...allText.matchAll(/\bdraw (?:one|two|three) cards?\b/gi)].map((m) => m[0]);
  if (drawResiduals.length !== 1 || !byName.get('Rousing Speech').effects.some((e) => e.text.includes('you may draw one card, then discard one card'))) {
    throw new Error(`Unexpected fixed draw residuals: ${drawResiduals.join(', ')}`);
  }
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
    acc.shorthandWords += row.shorthand_words;
    acc.afterWords += row.after_words;
    acc.publishedChars += row.published_chars;
    acc.shorthandChars += row.shorthand_chars;
    acc.afterChars += row.after_chars;
    if (row.changed_by_compact) acc.changed += 1;
    return acc;
  }, { publishedWords: 0, shorthandWords: 0, afterWords: 0, publishedChars: 0, shorthandChars: 0, afterChars: 0, changed: 0 });

  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));

  return `${[
    '# Gauntlet v0.6.3 Compact-Shorthand Card Density',
    '',
    `**Published baseline:** \`${baselinePath}\`  `,
    `**Prior shorthand source:** \`${sourcePath}\`  `,
    '**Stage:** extended routine shorthand and general reroll default before bespoke card compression  ',
    `**Cards:** ${rows.length}  `,
    `**Effects changed at this stage:** ${touchedEffects.size}`,
    '',
    '## Adopted shorthand',
    '',
    '- `+N Card(s)` — draw N cards from your Draw Pile into your Hand unless another player/destination is stated.',
    '- `+N Action` — N additional Actions in the current phase unless another phase is stated.',
    '- `+N Capital / Influence / Command / Conviction` — gain that amount. Costs and losses remain verbal.',
    '- `+N Battle Total` — add N to your battle total.',
    '- `Retreat +N` — increase the identified retreat by N Positions.',
    '- `Advantage`, `Double Advantage`, `Disadvantage` — direct instructions.',
    '- `Resource = N` — set that resource to N.',
    '- `Advance Front Line N` — advance the Front Line by N Territories.',
    '- `Attacker —`, `Defender —`, `Counterattack —`, `Win —`, `Lose —` — condition prefixes for the following clause.',
    '- Rerolls use the new result unless an effect expressly says otherwise.',
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | Prior shorthand | Compact shorthand | This-stage change | Total change |',
    '|---|---:|---:|---:|---:|---:|',
    `| Words | ${totals.publishedWords} | ${totals.shorthandWords} | ${totals.afterWords} | ${totals.afterWords - totals.shorthandWords} | ${totals.afterWords - totals.publishedWords} |`,
    `| Characters | ${totals.publishedChars} | ${totals.shorthandChars} | ${totals.afterChars} | ${totals.afterChars - totals.shorthandChars} | ${totals.afterChars - totals.publishedChars} |`,
    '',
    '## This-stage reductions',
    '',
    '| Convention | Replacements |',
    '|---|---:|',
    ...Object.entries(stats).map(([key, value]) => `| ${key.replaceAll('_', ' ')} | ${value} |`),
    '',
    '## Densest cards after compact shorthand',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ from prior shorthand | Δ from published |',
    '|---:|---|---|---:|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.compact_char_delta} | ${row.total_char_delta} |`),
    '',
    '## Complete 128-card measurement',
    '',
    '| Card | Allegiance | Published chars | Prior shorthand chars | Compact chars | Compact Δ | Total Δ |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...[...rows].sort((a, b) => a.allegiance.localeCompare(b.allegiance) || a.name.localeCompare(b.name)).map((row) => `| ${row.name} | ${row.allegiance} | ${row.published_chars} | ${row.shorthand_chars} | ${row.after_chars} | ${row.compact_char_delta} | ${row.total_char_delta} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Compact shorthand applied to ${rows.filter((row) => row.changed_by_compact).length} cards across ${touchedEffects.size} effects.`);
console.log(`Prior shorthand → compact words: ${rows.reduce((n, row) => n + row.shorthand_words, 0)} → ${rows.reduce((n, row) => n + row.after_words, 0)}.`);
console.log(`Prior shorthand → compact characters: ${rows.reduce((n, row) => n + row.shorthand_chars, 0)} → ${rows.reduce((n, row) => n + row.after_chars, 0)}.`);
console.log(`Wrote ${candidatePath}`);
console.log(`Wrote ${reportPath}`);
