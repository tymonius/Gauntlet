import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = process.env.V063_CARD_SOURCE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const candidatePath = process.env.V063_CARD_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Language_Candidate.json';
const reportPath = process.env.V063_CARD_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Language_Density.md';

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function compactWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([.!?])\s{2,}/g, '$1 ')
    .trim();
}

const transforms = [
  {
    id: 'deck-term',
    description: 'Playable Deck → Deck',
    apply: (text) => text.replace(/\bPlayable Deck\b/g, 'Deck')
  },
  {
    id: 'aftermath-lead',
    description: 'During the Aftermath of the/a battle → In the Aftermath',
    apply: (text) => text
      .replace(/\bDuring the Aftermath of (?:the|a) battle,\s*/g, 'In the Aftermath, ')
      .replace(/\bDuring the Aftermath,\s*/g, 'In the Aftermath, ')
  },
  {
    id: 'bank-self',
    description: 'Long self-banking boilerplate → Bank this card',
    apply: (text) => text
      .replace(/\bBank this card in your Asset Bank as an Asset\b/g, 'Bank this card')
      .replace(/\bBank this card in your Asset Bank\b/g, 'Bank this card')
      .replace(/\bPlace this card face up in your Asset Bank as an Asset\b/g, 'Bank this card')
      .replace(/\bPlace this card in your Asset Bank as an Asset\b/g, 'Bank this card')
  },
  {
    id: 'effect-taken',
    description: 'whose effect has not yet been applied → that has not taken effect',
    apply: (text) => text
      .replace(/\bwhose effect has not yet been applied\b/g, 'that has not taken effect')
      .replace(/\bwhose effect has not yet taken effect\b/g, 'that has not taken effect')
  },
  {
    id: 'additional-tactic-article',
    description: 'one additional Tactic → an additional Tactic',
    apply: (text) => text.replace(/\bone additional Tactic\b/g, 'an additional Tactic')
  },
  {
    id: 'additional-tactic-source',
    description: 'Remove redundant Reserve source from standard additional-Tactic choice',
    apply: (text) => text
      .replace(/\bYou may choose an additional Tactic from your Reserve\b/g, 'You may choose an additional Tactic')
      .replace(/\bchoose an additional Tactic from your Reserve\b/g, 'choose an additional Tactic')
  },
  {
    id: 'replacement-faceup',
    description: 'played face up replacement wording → face up',
    apply: (text) => text
      .replace(/\breplace this card with one eligible card from your Hand, played face up\b/g, 'replace this card with an eligible card from your Hand, face up')
      .replace(/\breplace this card with one eligible card from your Reserve, played face up\b/g, 'replace this card with an eligible card from your Reserve, face up')
      .replace(/\breplace this card with an eligible card from your Hand, played face up\b/g, 'replace this card with an eligible card from your Hand, face up')
      .replace(/\breplace this card with an eligible card from your Reserve, played face up\b/g, 'replace this card with an eligible card from your Reserve, face up')
  },
  {
    id: 'copied-effect',
    description: 'Direct copied-effect wording',
    apply: (text) => text.replace(
      /Choose one card in (your Graveyard|your Discard Pile|the opponent's Graveyard|the opponent's Discard Pile) with a (Action|Battle|Gambit|Tactic) effect that can be applied now\. Apply that effect as though you played it\./g,
      (_, zone, effect) => `Apply the ${effect} effect of one card in ${zone} that can apply now.`
    ).replace(/\bLeave the chosen card in\b/g, 'Leave that card in')
  },
  {
    id: 'can-apply-now',
    description: 'can be applied now → can apply now',
    apply: (text) => text.replace(/\bcan be applied now\b/g, 'can apply now')
  }
];

const residualChecks = [
  ['if-you-do', /\bIf you do\b/],
  ['destination-language', /\b(?:normal )?destination(?: step| trigger)?\b/i],
  ['as-though-played', /\bas though you played it\b/i],
  ['additional-tactic-longform', /additional Tactic.*(?:Tactic|Battle) effect.*(?:apply|applied)/i],
  ['replacement-longform', /replace .*eligible.*(?:same role|timing|effect)/i],
  ['asset-bank-boilerplate', /(?:bank|place) this card .*Asset Bank/i],
  ['aftermath-longform', /During the Aftermath/i],
  ['self-title-repeat', null],
  ['use-label', null]
];

function normalizeText(text) {
  let current = text;
  const applied = [];
  for (const transform of transforms) {
    const next = transform.apply(current);
    if (next !== current) applied.push(transform.id);
    current = next;
  }
  return { text: compactWhitespace(current), applied };
}

function replaceDeckTermDeep(value) {
  if (typeof value === 'string') return value.replace(/\bPlayable Deck\b/g, 'Deck');
  if (Array.isArray(value)) return value.map(replaceDeckTermDeep);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceDeckTermDeep(child)]));
}

function cardText(card) {
  return (card.effects ?? []).map((effect) => `${effect.label ?? ''}: ${effect.text ?? ''}`.trim()).join(' ');
}

function flagsFor(card) {
  const text = cardText(card);
  const flags = [];
  for (const [id, pattern] of residualChecks) {
    if (id === 'self-title-repeat') {
      const escaped = card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (text.match(new RegExp(`\\b${escaped}\\b`, 'g')) ?? []).length;
      if (count > 0) flags.push(`${id}:${count}`);
    } else if (id === 'use-label') {
      if ((card.effects ?? []).some((effect) => /^Use$/i.test(effect.label ?? ''))) flags.push(id);
    } else if (pattern.test(text)) {
      flags.push(id);
    }
  }
  return flags;
}

function normalizeCard(card) {
  const next = structuredClone(card);
  const applied = new Set();

  if (Array.isArray(next.effects)) {
    next.effects = next.effects.map((effect) => {
      const copy = { ...effect };
      if (typeof copy.text === 'string') {
        const result = normalizeText(copy.text);
        copy.text = result.text;
        result.applied.forEach((id) => applied.add(id));
      }
      return copy;
    });
  }

  for (const key of ['action', 'battle', 'gambit', 'tactic', 'asset', 'activate', 'overlay']) {
    if (typeof next[key] === 'string') {
      const result = normalizeText(next[key]);
      next[key] = result.text;
      result.applied.forEach((id) => applied.add(id));
    }
  }

  return { card: next, applied: [...applied] };
}

assertPool(source);
let candidate = replaceDeckTermDeep(structuredClone(source));
candidate.version = 'v0.6.3-candidate';
candidate.name = 'Card Language Normalization Candidate';
candidate.date = new Date().toISOString().slice(0, 10);
candidate.status = 'Development candidate — convention normalization only';
candidate.normalization = {
  baseline: sourcePath,
  purpose: 'Apply approved shared wording conventions across the complete 128-card pool before density-based bespoke editing.',
  terminology: { constructed_card_set: 'Deck', in_play_shuffled_pile: 'Draw Pile' },
  transforms: transforms.map(({ id, description }) => ({ id, description }))
};

if (candidate.deck_construction?.minimum_playable_cards != null) {
  candidate.deck_construction.minimum_cards = candidate.deck_construction.minimum_playable_cards;
  delete candidate.deck_construction.minimum_playable_cards;
}

const rows = [];
candidate.cards = source.cards.map((original) => {
  const beforeText = cardText(original);
  const { card: normalizedCard, applied } = normalizeCard(original);
  const card = replaceDeckTermDeep(normalizedCard);
  const afterText = cardText(card);
  const flags = flagsFor(card);
  rows.push({
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    before_words: words(beforeText),
    after_words: words(afterText),
    word_delta: words(afterText) - words(beforeText),
    before_chars: beforeText.length,
    after_chars: afterText.length,
    char_delta: afterText.length - beforeText.length,
    changed: beforeText !== afterText,
    transforms: applied,
    residual_flags: flags
  });
  return card;
});

assertPool(candidate);

mkdirSync(dirname(candidatePath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows, sourcePath));

function assertPool(data) {
  if (!Array.isArray(data.cards)) throw new Error('Canonical data has no cards array.');
  if (data.cards.length !== 128) throw new Error(`Expected 128 cards, found ${data.cards.length}.`);
  const counts = data.cards.reduce((map, card) => map.set(card.allegiance, (map.get(card.allegiance) ?? 0) + 1), new Map());
  const expected = new Map([['Neutral', 50], ['Military', 13], ['Diplomats', 13], ['Financiers', 13], ['Intelligence', 13], ['Mystics', 13], ['Inquisition', 13]]);
  for (const [allegiance, count] of expected) {
    if (counts.get(allegiance) !== count) throw new Error(`Expected ${count} ${allegiance} cards, found ${counts.get(allegiance) ?? 0}.`);
  }
}

function buildReport(rows, baseline) {
  const total = rows.reduce((acc, row) => {
    acc.beforeWords += row.before_words;
    acc.afterWords += row.after_words;
    acc.beforeChars += row.before_chars;
    acc.afterChars += row.after_chars;
    if (row.changed) acc.changed += 1;
    return acc;
  }, { beforeWords: 0, afterWords: 0, beforeChars: 0, afterChars: 0, changed: 0 });

  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));
  const flagged = rows.filter((row) => row.residual_flags.length).sort((a, b) => b.after_chars - a.after_chars || a.name.localeCompare(b.name));
  const transformCounts = new Map();
  for (const row of rows) for (const id of row.transforms) transformCounts.set(id, (transformCounts.get(id) ?? 0) + 1);

  const lines = [
    '# Gauntlet v0.6.3 Card-Language Density Report',
    '',
    `**Baseline:** \`${baseline}\`  `,
    '**Stage:** shared-convention normalization before bespoke card editing  ',
    `**Cards:** ${rows.length}  `,
    `**Cards changed by conservative convention rules:** ${total.changed}`,
    '',
    '## Aggregate density',
    '',
    '| Measure | Before | After normalization | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${total.beforeWords} | ${total.afterWords} | ${total.afterWords - total.beforeWords} |`,
    `| Characters | ${total.beforeChars} | ${total.afterChars} | ${total.afterChars - total.beforeChars} |`,
    '',
    '## Convention reach',
    '',
    '| Convention | Cards changed |',
    '|---|---:|',
    ...transforms.map(({ id, description }) => `| ${description} (\`${id}\`) | ${transformCounts.get(id) ?? 0} |`),
    '',
    '## Densest cards after normalization',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ chars | Residual flags |',
    '|---:|---|---|---:|---:|---:|---|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.char_delta} | ${row.residual_flags.join(', ') || '—'} |`),
    '',
    '## Residual convention-review flags',
    '',
    'These are **review flags, not automatic errors**. They identify cards where an approved convention may still require card-specific judgment.',
    '',
    '| Card | Allegiance | Characters | Flags |',
    '|---|---|---:|---|',
    ...flagged.map((row) => `| ${row.name} | ${row.allegiance} | ${row.after_chars} | ${row.residual_flags.join(', ')} |`),
    '',
    '## Complete per-card measurement',
    '',
    '| Card | Allegiance | Before words | After words | Before chars | After chars | Δ chars | Changed |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...[...rows].sort((a, b) => a.allegiance.localeCompare(b.allegiance) || a.name.localeCompare(b.name)).map((row) => `| ${row.name} | ${row.allegiance} | ${row.before_words} | ${row.after_words} | ${row.before_chars} | ${row.after_chars} | ${row.char_delta} | ${row.changed ? 'yes' : 'no'} |`),
    ''
  ];
  return `${lines.join('\n')}\n`;
}

console.log(`Normalized ${rows.length} cards; ${rows.filter((row) => row.changed).length} changed by shared conventions.`);
console.log(`Wrote ${candidatePath}`);
console.log(`Wrote ${reportPath}`);
