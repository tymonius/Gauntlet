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
    '| Faction pool | 13 Inquisition card titles. |\n| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |\n| Arcane card | Heresy. |'
  ],
]);

export function applyV070RulebookCorrections(value) {
  let text = String(value ?? '');
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  return text;
}


export function applyV070CanonicalCorrections(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : JSON.parse(JSON.stringify(value));
  const mystics = data.gameplay?.factions?.find(faction => faction.id === 'mystics');
  if (mystics?.victory === 'Run the Gauntlet or complete the Ritual of Ascendance.') {
    mystics.victory = 'Run the Gauntlet or complete the Ritual of Ascension.';
  }
  return data;
}
