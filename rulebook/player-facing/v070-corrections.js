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

function summarizeCards(cards) {
  const summary = {};
  for (const card of cards || []) {
    const allegiance = card.allegiance;
    if (!allegiance) continue;
    const bucket = summary[allegiance] ||= {
      count: 0,
      total_value: 0,
      unique: [],
      cost_curve: {},
    };
    const cost = Number(card.cost || 0);
    bucket.count += 1;
    bucket.total_value += cost;
    bucket.cost_curve[String(cost)] = (bucket.cost_curve[String(cost)] || 0) + 1;
    if (card.unique) bucket.unique.push(card.name);
  }
  for (const bucket of Object.values(summary)) {
    bucket.unique.sort((a, b) => String(a).localeCompare(String(b)));
    bucket.cost_curve = Object.fromEntries(
      Object.entries(bucket.cost_curve).sort(([a], [b]) => Number(a) - Number(b))
    );
  }
  return summary;
}

export function applyV070CanonicalCorrections(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : JSON.parse(JSON.stringify(value));
  const gameplay = data.gameplay || {};
  const mystics = gameplay.factions?.find(faction => faction.id === 'mystics');
  if (mystics?.victory === 'Run the Gauntlet or complete the Ritual of Ascendance.') {
    mystics.victory = 'Run the Gauntlet or complete the Ritual of Ascension.';
  }

  const summary = summarizeCards(gameplay.cards);
  if (Object.keys(summary).length) {
    gameplay.card_pool_summary = summary;
    for (const faction of gameplay.factions || []) {
      if (summary[faction.name]) faction.card_count = summary[faction.name].count;
    }
  }

  return data;
}
