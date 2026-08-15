export const STANDARD_CARD_HEADINGS = Object.freeze([
  'Action',
  'Asset',
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
  'Mission',
  'Overlay',
  'Terms',
  'Sanctions',
  'Reaction',
]);

const OUTCOME_HOSTS = new Map([
  ['diplomats-diplomatic-latitude', 'Terms'],
  ['diplomats-good-faith', 'Asset'],
  ['diplomats-gunboat-diplomacy', 'Terms'],
  ['diplomats-nonbinding-resolution', 'Terms'],
  ['diplomats-trade-concessions', 'Terms'],
]);

export function normalizeV063CardForPresentation(card) {
  if (!card || typeof card !== 'object') return card;

  const normalized = {
    ...card,
    effects: (card.effects || []).map(effect => ({ ...effect })),
  };

  switch (normalized.id) {
    case 'neutral-bombardment':
    case 'intelligence-fog-of-war':
      relabel(normalized, 'Placement', 'Action');
      break;

    case 'diplomats-sanctions-blockade':
      normalized.effects = [
        {
          label: 'Sanctions',
          text: 'Instead of playing this immediately, in the Aftermath following that refusal, you may place this Overlay on a Territory that opponent controls.',
        },
        {
          label: 'Overlay',
          text: "The first time each turn that opponent enters or leaves this Territory, they choose one: discard one card; or +1 Influence. Put this card in its owner's Discard Pile if that opponent loses control of this Territory.",
        },
      ];
      break;

    case 'diplomats-sanctions-censure':
      normalized.effects = [
        { label: 'Sanctions', text: 'Bank this card.' },
        {
          label: 'Asset',
          text: 'The first time each turn that opponent plays a card for its Action effect, they choose one: discard one card; or +1 Card.',
        },
      ];
      break;

    case 'diplomats-sanctions-embargo':
      normalized.effects = [
        { label: 'Sanctions', text: 'Bank this card.' },
        {
          label: 'Asset',
          text: "That opponent's Asset limit is reduced by 1, to a minimum of 0.",
        },
      ];
      break;

    case 'inquisition-martyrdom':
      relabel(normalized, 'Aftermath', 'Reaction');
      break;

    case 'diplomats-demilitarized-zone':
      relabel(normalized, 'Terms', 'Reaction');
      break;
  }

  const outcomeHost = OUTCOME_HOSTS.get(normalized.id);
  if (outcomeHost) mergeOutcomeBranches(normalized, outcomeHost);

  return normalized;
}

export function normalizeV063CardsForPresentation(cards) {
  return (cards || []).map(normalizeV063CardForPresentation);
}

function relabel(card, from, to) {
  const effect = card.effects.find(entry => entry.label === from);
  if (effect) effect.label = to;
}

function mergeOutcomeBranches(card, hostLabel) {
  const host = card.effects.find(effect => effect.label === hostLabel);
  const accepted = card.effects.find(effect => effect.label === 'Accepted');
  const refused = card.effects.find(effect => effect.label === 'Refused');
  if (!host || !accepted || !refused) return;

  host.text = `${host.text}\n\nAccepted — ${accepted.text}\n\nRefused — ${refused.text}`;
  card.effects = card.effects.filter(effect => effect !== accepted && effect !== refused);
}
