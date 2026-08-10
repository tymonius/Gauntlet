import { readFileSync, writeFileSync } from 'node:fs';

const baselinePath = process.env.V063_CARD_BASELINE ?? 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
const candidatePath = process.env.V063_CARD_COMPACT_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_ASSET_LANGUAGE_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Asset_Language_Density.md';

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const before = structuredClone(candidate);
const byName = new Map((candidate.cards ?? []).map((card) => [card.name, card]));
let changedEffects = 0;

replaceEffect('Contingency Plan', 'Asset',
  'If you discard this card because your Asset limit decreased, +1 Card.',
  'If this card is Removed because your Asset limit decreased, +1 Card.');

replaceEffect('Decoys', 'Activate',
  'If an opposing effect would cause one or more of your other Assets to leave play, you may discard this card to choose one affected Asset; it remains in play.',
  'If an opposing effect would Remove one or more of your other Assets, you may discard this card to keep one of them in play.');

replaceEffect('Sleeper Network', 'Asset',
  'Before an opposing effect causes this card to leave play, reveal its bound cards. You may play one whose Action effect can apply now. Discard the rest.',
  'If this card is Removed, reveal its bound cards first. Play 1 immediately for its Action effect; discard the rest.');

replaceEffect('Sleeper Network', 'Activate',
  'Play each whose Action effect can apply now, one at a time and in any order. Discard the rest.',
  'Play each bound card you can for its Action effect, in any order; discard the rest.');

replaceEffect('Capital Punishment', 'Action',
  "If you won a battle this turn, choose one opposing Asset and put it in its owner's Graveyard.",
  "If you won a battle this turn, put 1 opposing Asset in its owner's Graveyard.");

replaceEffect('Sedition', 'Action',
  'The opponent chooses one Asset they control and discards it.',
  'The opponent discards 1 Asset.');

replaceEffect('Sedition', 'Battle',
  'The opponent chooses one face-up Asset they control. It is inactive during this battle. If they control no face-up Assets, +1 Battle Total.',
  'The opponent chooses 1 face-up Asset. It is inactive during this battle. If they have no face-up Assets, +1 Battle Total.');

replaceEffect('Sequestration', 'Action',
  'Each player chooses one banked Asset they control to keep, if able, and discards the rest.',
  'Each player keeps 1 Asset, if able, and discards the rest.');

replaceEffect('Requisition', 'Action',
  'Discard one banked Asset you control for +2 Cards.',
  'Discard 1 of your Assets: +2 Cards.');

replaceEffect('Requisition', 'Battle',
  'You may discard one banked Asset you control to gain Advantage.',
  'You may discard 1 of your Assets to gain Advantage.');

replaceEffect('Strategic Withdrawal', 'Action',
  'Return one banked Asset you control to your Hand to gain one additional Position of movement this turn.',
  'Return 1 of your Assets to your Hand to gain one additional Position of movement this turn.');

replaceEffect('Extraordinary Rendition', 'Asset',
  'Whenever you discard one or more Assets you control, discard this card before any others, if able.',
  'Whenever you discard one or more of your Assets, discard this card before any others, if able.');

replaceEffect('Manifest Destiny', 'Action',
  'Then put banked Assets you control in your Graveyard',
  'Then put your Assets in your Graveyard');

candidate.territories = deepReplace(candidate.territories, [
  ['only one banked Asset they control can be active', 'only 1 of their Assets can be active'],
  ['all their other banked Assets are inactive', 'their other Assets are inactive']
]);
candidate.territory_cards = deepReplace(candidate.territory_cards, [
  ['only one banked Asset they control can be active', 'only 1 of their Assets can be active'],
  ['all their other banked Assets are inactive', 'their other Assets are inactive']
]);

for (const card of candidate.cards ?? []) syncLegacyEffectFields(card);

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  asset_language: {
    removed_term: 'An Asset is Removed when it is forced to leave play. Natural destination verbs may cause Removal without using the keyword.',
    asset_limit: 'Discarding an Asset because the Asset limit decreased counts as Removal.',
    exclusions: 'Voluntary discard/use and normal self-expiration do not count as Removal.',
    ownership_style: 'Use your Assets / opposing Assets / their Assets instead of redundant Asset you control language when ownership is already clear.',
    effects_changed: changedEffects
  }
};

validate();
writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
writeFileSync(reportPath, buildReport());

function replaceEffect(cardName, label, from, to) {
  const card = byName.get(cardName);
  if (!card) throw new Error(`Card not found: ${cardName}`);
  const effect = (card.effects ?? []).find((entry) => entry.label === label);
  if (!effect) throw new Error(`Effect ${label} not found on ${cardName}`);
  if (!effect.text.includes(from)) throw new Error(`Expected text not found on ${cardName} ${label}: ${from}`);
  effect.text = effect.text.replace(from, to);
  changedEffects += 1;
}

function deepReplace(value, replacements) {
  if (typeof value === 'string') {
    let text = value;
    for (const [from, to] of replacements) text = text.replaceAll(from, to);
    return text;
  }
  if (Array.isArray(value)) return value.map((item) => deepReplace(item, replacements));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepReplace(child, replacements)]));
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((effect) => [String(effect.label).toLowerCase(), effect.text]));
  for (const key of ['action', 'battle', 'gambit', 'tactic', 'asset', 'activate', 'overlay']) {
    if (labels.has(key)) card[key] = labels.get(key);
    else if (Object.hasOwn(card, key)) delete card[key];
  }
}

function validate() {
  const playerFacing = JSON.stringify({ cards: candidate.cards, territories: candidate.territories, territory_cards: candidate.territory_cards });
  for (const residual of [
    'Asset you control',
    'Assets you control',
    'Asset they control',
    'Assets they control',
    'Before an opposing effect causes this card to leave play',
    'If you discard this card because your Asset limit decreased'
  ]) {
    if (playerFacing.includes(residual)) throw new Error(`Asset-language residual remains: ${residual}`);
  }
  if (!byName.get('Sleeper Network').effects.some((effect) => effect.text.includes('If this card is Removed'))) {
    throw new Error('Sleeper Network does not key off Removed.');
  }
  if (!byName.get('Contingency Plan').effects.some((effect) => effect.text.includes('If this card is Removed because your Asset limit decreased'))) {
    throw new Error('Contingency Plan does not key off Asset-limit Removal.');
  }
  if (changedEffects !== 13) throw new Error(`Expected 13 Asset-language effect changes, found ${changedEffects}.`);
}

function words(text) {
  const matches = String(text ?? '').trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}’'\-+]*\b/gu);
  return matches ? matches.length : 0;
}

function cardText(card) {
  return (card.effects ?? []).map((effect) => `${effect.label ?? ''}: ${effect.text ?? ''}`.trim()).join(' ');
}

function buildReport() {
  const baselineById = new Map((baseline.cards ?? []).map((card) => [card.id, card]));
  const beforeById = new Map((before.cards ?? []).map((card) => [card.id, card]));
  const rows = (candidate.cards ?? []).map((card) => {
    const published = baselineById.get(card.id);
    const prior = beforeById.get(card.id);
    if (!published || !prior) throw new Error(`Missing comparison card: ${card.id}`);
    const publishedText = cardText(published);
    const priorText = cardText(prior);
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
    '# Gauntlet v0.6.3 Asset-Language Density',
    '',
    `**Published baseline:** \`${baselinePath}\`  `,
    `**Prior shared-normalization candidate:** \`${candidatePath}\` before the Asset-language pass  `,
    '**Stage:** final shared normalization of Asset ownership and Removal terminology before bespoke compression  ',
    `**Cards:** ${rows.length}  `,
    `**Card effects changed:** ${changedEffects}`,
    '',
    '## Conventions',
    '',
    '- **Removed** classifies an Asset that is forced to leave play; the underlying instruction still determines its destination.',
    '- Asset loss caused by a decreased Asset limit counts as Removal.',
    '- Voluntary Asset discard/use and normal self-expiration do not count as Removal.',
    '- Natural verbs such as `discard` and `put ... in the Graveyard` remain preferred when they are cleaner than explicitly saying `Remove`.',
    '- Prefer `your Assets`, `opposing Assets`, and `their Assets` over redundant `Asset(s) you/they control` wording.',
    '',
    '## Aggregate density',
    '',
    '| Measure | Published v0.6.2 | Before Asset-language pass | Final pre-bespoke | Total change |',
    '|---|---:|---:|---:|---:|',
    `| Words | ${totals.publishedWords} | ${totals.priorWords} | ${totals.afterWords} | ${totals.afterWords - totals.publishedWords} |`,
    `| Characters | ${totals.publishedChars} | ${totals.priorChars} | ${totals.afterChars} | ${totals.afterChars - totals.publishedChars} |`,
    '',
    '## Densest cards after final shared normalization',
    '',
    '| Rank | Card | Allegiance | Words | Characters | Asset-language Δ | Δ from published |',
    '|---:|---|---|---:|---:|---:|---:|',
    ...ranked.slice(0, 30).map((row, index) => `| ${index + 1} | ${row.name} | ${row.allegiance} | ${row.after_words} | ${row.after_chars} | ${row.stage_delta} | ${row.total_delta} |`),
    ''
  ].join('\n')}\n`;
}

console.log(`Applied Asset ownership/Removal conventions across ${changedEffects} card effects.`);
