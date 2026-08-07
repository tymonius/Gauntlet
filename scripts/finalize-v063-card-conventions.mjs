import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const firstPassPath = process.env.V063_CARD_FIRST_PASS ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Language_Candidate.json';
const overridesDir = process.env.V063_CARD_OVERRIDES_DIR ?? 'docs/v063-card-language-overrides';
const candidatePath = process.env.V063_CARD_FINAL_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Convention_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_FINAL_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Convention_Normalized_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const firstPass = JSON.parse(readFileSync(firstPassPath, 'utf8'));
const candidate = structuredClone(firstPass);
const overrides = new Map();
const overrideSources = new Map();
let acceptedResiduals = {};

for (const fileName of readdirSync(overridesDir).filter((name) => name.endsWith('.json')).sort()) {
  const filePath = join(overridesDir, fileName);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  if (data.accepted_residuals) acceptedResiduals = { ...acceptedResiduals, ...data.accepted_residuals };
  for (const [id, override] of Object.entries(data.cards ?? {})) {
    if (overrides.has(id)) throw new Error(`Duplicate v0.6.3 card-language override: ${id}`);
    overrides.set(id, override);
    overrideSources.set(id, `${overridesDir}/${fileName}`);
  }
}

assertPool(baseline);
assertPool(candidate);
const baselineById = new Map(baseline.cards.map((card) => [card.id, card]));
const firstPassById = new Map(firstPass.cards.map((card) => [card.id, card]));

for (const card of candidate.cards) {
  const override = overrides.get(card.id);
  if (override) {
    if (override.name !== card.name) throw new Error(`Override name mismatch for ${card.id}: ${override.name} !== ${card.name}`);
    card.effects = structuredClone(override.effects);
    card.v063_language_review = {
      class: override.change_class,
      source: overrideSources.get(card.id)
    };
  }
  card.effects = (card.effects ?? []).map((effect) => ({ ...effect, text: applyFinalSafeConventions(effect.text) }));
  syncLegacyEffectFields(card);
}

candidate.status = 'Development candidate — complete shared-convention normalization';
candidate.normalization = {
  ...(candidate.normalization ?? {}),
  stage: 'complete-shared-convention-normalization',
  manual_overrides: overrides.size,
  accepted_residuals: Object.keys(acceptedResiduals).length
};

const rows = candidate.cards.map((card) => {
  const original = baselineById.get(card.id);
  const first = firstPassById.get(card.id);
  if (!original || !first) throw new Error(`Baseline or first-pass card missing: ${card.id}`);
  const before = cardText(original);
  const after = cardText(card);
  const residual = flagsFor(card);
  const accepted = acceptedResiduals[card.id] ?? null;
  validateResidual(card, residual, accepted);
  const override = overrides.get(card.id);
  const firstPassChanged = JSON.stringify(original.effects ?? []) !== JSON.stringify(first.effects ?? []);
  return {
    id: card.id,
    name: card.name,
    allegiance: card.allegiance,
    before_words: words(before),
    after_words: words(after),
    before_chars: before.length,
    after_chars: after.length,
    word_delta: words(after) - words(before),
    char_delta: after.length - before.length,
    review_result: override ? override.change_class : firstPassChanged ? 'safe-convention-normalization' : 'reviewed-no-change',
    residual_flags: residual,
    residual_reason: accepted?.reason ?? ''
  };
});

if (rows.length !== 128) throw new Error(`Expected 128 reviewed cards, found ${rows.length}.`);
if (rows.some((row) => !row.review_result)) throw new Error('Every card must have an explicit review result.');

mkdirSync(dirname(candidatePath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport(rows));

function applyFinalSafeConventions(text) {
  return String(text ?? '')
    .replace(/\bwhose effect has not (?:yet )?been applied\b/g, 'that has not taken effect')
    .replace(/\bcan be applied now\b/g, 'can apply now')
    .replace(/\bone additional Tactic\b/g, 'an additional Tactic')
    .replace(/\bDuring the Aftermath of (?:the|a) battle,\s*/g, 'In the Aftermath, ')
    .replace(/\bDuring the Aftermath,\s*/g, 'In the Aftermath, ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((effect) => [String(effect.label).toLowerCase(), effect.text]));
  for (const key of ['action', 'battle', 'gambit', 'tactic', 'asset', 'activate', 'overlay']) {
    if (Object.hasOwn(card, key)) {
      if (labels.has(key)) card[key] = labels.get(key);
      else delete card[key];
    }
  }
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((effect) => `${effect.label ?? ''}: ${effect.text ?? ''}`.trim()).join(' ');
}

function flagsFor(card) {
  const text = cardText(card);
  const flags = [];
  const checks = [
    ['if-you-do', /\bIf you do\b/],
    ['destination-language', /\b(?:normal )?destination(?: step| trigger)?\b/i],
    ['as-though-played', /\bas though you played it\b/i],
    ['effect-not-applied', /\bwhose effect has not (?:yet )?been applied\b/i],
    ['additional-tactic-longform', /additional Tactic.*(?:Tactic|Battle) effect.*(?:apply|applied)/i],
    ['replacement-longform', /replace .*eligible.*(?:same role|timing|effect)/i],
    ['asset-bank-boilerplate', /(?:bank|place) this card .*Asset Bank/i],
    ['aftermath-longform', /During the Aftermath/i]
  ];
  for (const [id, pattern] of checks) if (pattern.test(text)) flags.push(id);
  if ((card.effects ?? []).some((effect) => /^Use$/i.test(effect.label ?? ''))) flags.push('use-label');
  const escaped = card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleCount = (text.match(new RegExp(`\\b${escaped}\\b`, 'g')) ?? []).length;
  if (titleCount) flags.push(`self-title-repeat:${titleCount}`);
  return flags;
}

function normalizeFlag(flag) {
  return flag.replace(/:\d+$/, '');
}

function validateResidual(card, actual, accepted) {
  const actualNormalized = [...new Set(actual.map(normalizeFlag))].sort();
  const acceptedNormalized = [...new Set((accepted?.flags ?? []).map(normalizeFlag))].sort();
  if (JSON.stringify(actualNormalized) !== JSON.stringify(acceptedNormalized)) {
    throw new Error(`Unexpected convention residuals for ${card.name}: actual [${actual.join(', ')}], accepted [${accepted?.flags?.join(', ') ?? ''}]`);
  }
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
  const total = rows.reduce((acc, row) => {
    acc.beforeWords += row.before_words;
    acc.afterWords += row.after_words;
    acc.beforeChars += row.before_chars;
    acc.afterChars += row.after_chars;
    if (row.before_chars !== row.after_chars) acc.changed += 1;
    return acc;
  }, { beforeWords: 0, afterWords: 0, beforeChars: 0, afterChars: 0, changed: 0 });
  const ranked = [...rows].sort((a, b) => b.after_chars - a.after_chars || b.after_words - a.after_words || a.name.localeCompare(b.name));
  const residual = rows.filter((row) => row.residual_flags.length);
  const classes = new Map();
  for (const row of rows) classes.set(row.review_result, (classes.get(row.review_result) ?? 0) + 1);

  return `${[
    '# Gauntlet v0.6.3 Convention-Normalized Card Density',
    '',
    `**Baseline:** \`${baselinePath}\`  `,
    '**Stage:** all approved shared conventions reviewed across the complete pool  ',
    `**Cards reviewed:** ${rows.length}  `,
    `**Cards with manual convention overrides:** ${overrides.size}  `,
    `**Cards with accepted intentional residuals:** ${residual.length}`,
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | Convention-normalized v0.6.3 | Change |',
    '|---|---:|---:|---:|',
    `| Words | ${total.beforeWords} | ${total.afterWords} | ${total.afterWords - total.beforeWords} |`,
    `| Characters | ${total.beforeChars} | ${total.afterChars} | ${total.afterChars - total.beforeChars} |`,
    '',
    '## Review results',
    '',
    '| Result | Cards |',
    '|---|---:|',
    ...[...classes].sort().map(([name, count]) => `| ${name} | ${count} |`),
    '',
    '## Densest cards after complete convention normalization',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Δ chars | Review result |',
    '|---:|---|---|---:|---:|---:|---|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.char_delta} | ${row.review_result} |`),
    '',
    '## Intentional residuals retained after review',
    '',
    '| Card | Flags | Reason |',
    '|---|---|---|',
    ...residual.map((row) => `| ${row.name} | ${row.residual_flags.join(', ')} | ${row.residual_reason} |`),
    '',
    '## Complete 128-card review',
    '',
    '| Card | Allegiance | Before words | After words | Before chars | After chars | Δ chars | Result |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...[...rows].sort((a, b) => a.allegiance.localeCompare(b.allegiance) || a.name.localeCompare(b.name)).map((row) => `| ${row.name} | ${row.allegiance} | ${row.before_words} | ${row.after_words} | ${row.before_chars} | ${row.after_chars} | ${row.char_delta} | ${row.review_result} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Convention normalization complete: ${rows.length} cards reviewed, ${overrides.size} manual overrides, ${rows.filter((row) => row.residual_flags.length).length} accepted residuals.`);
console.log(`Wrote ${candidatePath}`);
console.log(`Wrote ${reportPath}`);
