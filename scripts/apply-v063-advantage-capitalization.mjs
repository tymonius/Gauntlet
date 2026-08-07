import { readFileSync, writeFileSync } from 'node:fs';

const candidatePath = process.env.V063_CARD_COMPACT_CANDIDATE ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Normalized_Candidate.json';
const reportPath = process.env.V063_CARD_COMPACT_REPORT ?? 'artifacts/v0.6.3/Gauntlet_v0.6.3_Compact_Shorthand_Density.md';

const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
let replacements = 0;

for (const card of candidate.cards ?? []) {
  for (const effect of card.effects ?? []) {
    const before = effect.text;
    effect.text = effect.text
      .replace(/\bgain double advantage\b/g, 'gain double Advantage')
      .replace(/\bgain advantage\b/g, 'gain Advantage')
      .replace(/\bgain disadvantage\b/g, 'gain Disadvantage')
      .replace(/\bgains disadvantage\b/g, 'gains Disadvantage');
    if (effect.text !== before) replacements += 1;
  }
  syncLegacyEffectFields(card);
}

const finalText = candidate.cards.flatMap((card) => (card.effects ?? []).map((effect) => effect.text)).join('\n');
for (const residual of ['gain advantage', 'gain double advantage', 'gain disadvantage', 'gains disadvantage']) {
  if (finalText.includes(residual)) throw new Error(`Lowercase Advantage/Disadvantage term remains on a card face: ${residual}`);
}

candidate.normalization = {
  ...(candidate.normalization ?? {}),
  advantage_capitalization: {
    rule: 'Advantage and Disadvantage are defined game terms and are capitalized in player-facing text; double remains a normal modifier.',
    effects_changed: replacements
  }
};

writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);

if (reportPath) {
  let report = readFileSync(reportPath, 'utf8');
  report = report
    .replaceAll('gain advantage', 'gain Advantage')
    .replaceAll('gain double advantage', 'gain double Advantage')
    .replaceAll('gain disadvantage', 'gain Disadvantage')
    .replaceAll('gains disadvantage', 'gains Disadvantage');
  if (!report.includes('Advantage and Disadvantage are capitalized defined game terms.')) {
    report = report.replace(
      '- Advantage remains instance-based and stackable; natural wording does not change the underlying stacking rule.',
      '- Advantage remains instance-based and stackable; natural wording does not change the underlying stacking rule.\n- Advantage and Disadvantage are capitalized defined game terms.'
    );
  }
  writeFileSync(reportPath, report);
}

function syncLegacyEffectFields(card) {
  const labels = new Map((card.effects ?? []).map((effect) => [String(effect.label).toLowerCase(), effect.text]));
  for (const key of ['action', 'battle', 'gambit', 'tactic', 'asset', 'activate', 'overlay']) {
    if (labels.has(key)) card[key] = labels.get(key);
    else if (Object.hasOwn(card, key)) delete card[key];
  }
}

console.log(`Capitalized Advantage/Disadvantage as defined terms across ${replacements} card effects.`);
