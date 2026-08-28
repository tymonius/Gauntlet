const REPLACEMENTS = Object.freeze([
  [
    'Accepted or successfully imposed Proposals become Treaty Articles. Ratify five different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.',
    'Accepted or successfully imposed Proposals become Treaty Articles. Ratify six different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.'
  ],
  [
    "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if five different Proposals are ratified, the Diplomat wins through the Peace Treaty.",
    "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if six different Proposals are ratified, the Diplomat wins through the Peace Treaty."
  ],
  [
    'Ritual of Ascendance',
    'Ritual of Ascension'
  ],
  [
    '| Faction pool | 13 Inquisition card titles. |\n| Arcane card | Heresy. |',
    '| Faction pool | 15 Inquisition card titles. |\n| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |\n| Arcane card | Heresy. |'
  ],
  [
    '| Faction pool | 13 Inquisition card titles. |',
    '| Faction pool | 15 Inquisition card titles. |'
  ],
  [
    '| Faction pool | 13 Military card titles. |',
    '| Faction pool | 15 Military card titles. |'
  ],
  [
    '| Faction pool | 13 Diplomat card titles. |',
    '| Faction pool | 15 Diplomat card titles. |\n| Unique card | Plenipotentiary, cost 4; maximum one copy per Deck. |'
  ],
  [
    '| Faction pool | 13 Financier card titles. |',
    '| Faction pool | 15 Financier card titles. |'
  ],
  [
    '| Faction pool | 13 Intelligence card titles. |',
    '| Faction pool | 15 Intelligence card titles. |'
  ],
  [
    '| Faction pool | 13 Mystics card titles. |',
    '| Faction pool | 15 Mystics card titles. |'
  ],
  [
    'All thirteen Mystics cards have the Arcane trait.',
    'All fifteen Mystics cards have the Arcane trait.'
  ],
]);

export function applyV070RulebookCorrections(value) {
  let text = String(value ?? '');
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) text = text.split(from).join(to);
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
