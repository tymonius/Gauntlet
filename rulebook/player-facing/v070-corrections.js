import { deriveCardPoolSummary } from './rule-facts.js';

export function applyV070RulebookCorrections(value) {
  let text = String(value ?? '').replaceAll('Ritual of Ascendance', 'Ritual of Ascension');

  if (!text.includes('| Unique card | Plenipotentiary, cost 4; maximum one copy per Deck. |')) {
    text = text.replace(
      /(\| Faction pool \| \d+ Diplomat card titles\. \|)/,
      '$1\n| Unique card | Plenipotentiary, cost 4; maximum one copy per Deck. |',
    );
  }

  if (!text.includes('| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |')) {
    text = text.replace(
      /(\| Faction pool \| \d+ Inquisition card titles\. \|\n)(\| Arcane card \| Heresy\. \|)/,
      '$1| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |\n$2',
    );
  }

  return text;
}

export function applyV070CanonicalCorrections(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : JSON.parse(JSON.stringify(value));
  const gameplay = data.gameplay || {};
  const mystics = gameplay.factions?.find(faction => faction.id === 'mystics');
  if (mystics?.victory === 'Run the Gauntlet or complete the Ritual of Ascendance.') {
    mystics.victory = 'Run the Gauntlet or complete the Ritual of Ascension.';
  }

  const summary = deriveCardPoolSummary(gameplay.cards);
  if (Object.keys(summary).length) {
    gameplay.card_pool_summary = summary;
    for (const faction of gameplay.factions || []) {
      if (summary[faction.name]) faction.card_count = summary[faction.name].count;
    }
  }

  return data;
}
