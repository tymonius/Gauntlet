const REPLACEMENTS = Object.freeze([
  [
    'Accepted or successfully imposed Proposals become Treaty Articles. Ratify five different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.',
    'Accepted or successfully imposed Proposals become Treaty Articles. Ratify six different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.'
  ],
  [
    "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if five different Proposals are ratified, the Diplomat wins through the Peace Treaty.",
    "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if six different Proposals are ratified, the Diplomat wins through the Peace Treaty."
  ],
]);

export function applyV070RulebookCorrections(value) {
  let text = String(value ?? '');
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  return text;
}
