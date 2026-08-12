import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const outputPath = path.join(root, 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Complete_Card_Reference_Candidate.md');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const lines = [
  '# Gauntlet v0.6.3 Complete Card Reference Candidate',
  '',
  '**Status:** Generated next-release candidate; not yet published  ',
  `**Cards:** ${data.cards.length}  `,
  `**Territories:** ${data.territories.length}`,
  '',
  'This reference is generated from the integrated v0.6.3 canonical-data candidate. Exact playable-card text comes from the final v0.6.3 card-text build; Territory text is inherited from published v0.6.2 unless a later v0.6.3 source expressly replaces it.',
  '',
  '---',
  '',
  '# Playable Cards',
  '',
];

const allegianceOrder = ['Neutral', 'Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition'];
const byAllegiance = new Map(allegianceOrder.map((name) => [name, []]));
for (const card of data.cards) {
  if (!byAllegiance.has(card.allegiance)) byAllegiance.set(card.allegiance, []);
  byAllegiance.get(card.allegiance).push(card);
}

for (const allegiance of allegianceOrder) {
  const cards = (byAllegiance.get(allegiance) || []).sort((a, b) => a.name.localeCompare(b.name));
  lines.push(`## ${allegiance}`, '');
  for (const card of cards) {
    lines.push(`### ${card.name}`, '');
    lines.push(`**Cost:** ${card.cost}`);
    if (card.trait) lines.push(`**Trait:** ${card.trait}`);
    if (card.card_form) lines.push(`**Card form:** ${card.card_form}`);
    if (card.unique) lines.push(`**Unique:** ${card.unique_rule || 'Yes'}`);
    lines.push('');
    for (const effect of card.effects) {
      const paragraphs = String(effect.text).split('\n');
      lines.push(`**${effect.label}:** ${paragraphs[0]}`);
      for (const paragraph of paragraphs.slice(1)) lines.push(paragraph);
      lines.push('');
    }
    if (card.name === 'Manifest Destiny') {
      const deedRule = (card.rules_notes ?? []).find((note) => note === 'After entering the Gauntlet, this card is a normal Territory with a normal Deed.');
      if (!deedRule) throw new Error('Manifest Destiny is missing its normal-Territory / normal-Deed rule.');
      lines.push(`**Rules:** ${deedRule}`, '');
    }
  }
}

lines.push('---', '', '# Territory Cards', '');
const territories = [...data.territories].sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
for (const territory of territories) {
  lines.push(`## ${territory.name}`, '');
  lines.push(`**Type:** ${territory.arena ? 'Arena' : (territory.type || 'Territory')}`);
  if (territory.number != null) lines.push(`**Number:** ${territory.number}`);
  lines.push('');
  const effects = territory.effects?.length ? territory.effects : [{ label: 'Text', text: territory.text }];
  for (const effect of effects) {
    lines.push(`**${effect.label}:** ${effect.text}`, '');
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n').replace(/\s+$/, '') + '\n', 'utf8');
console.log(`Generated ${path.relative(root, outputPath)}.`);
