import type { CardID } from '../types';

export type CardPlayTiming = 'action' | 'battle_hand_commit' | 'battle_draw_play';
export type CardPlayOrigin = 'hand' | 'battle_draw';
export type CardDestination = 'discard' | 'graveyard' | 'hand' | 'removed' | 'condition' | 'asset_bank';

export interface CardPlayRule {
  cardId: CardID;
  timings: CardPlayTiming[];
  allowedOrigins: CardPlayOrigin[];
  defaultDestinationByOrigin: Partial<Record<CardPlayOrigin, CardDestination>>;
  requiresTarget?: boolean;
}

export const coreCardPlayRules: Record<CardID, CardPlayRule> = {
  'card-attrition': {
    cardId: 'card-attrition',
    timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
    allowedOrigins: ['hand', 'battle_draw'],
    defaultDestinationByOrigin: {
      hand: 'condition',
      battle_draw: 'discard',
    },
  },
  'card-conscription': {
    cardId: 'card-conscription',
    timings: ['battle_hand_commit', 'battle_draw_play'],
    allowedOrigins: ['hand', 'battle_draw'],
    defaultDestinationByOrigin: {
      hand: 'graveyard',
      battle_draw: 'discard',
    },
  },
  'card-embargo': {
    cardId: 'card-embargo',
    timings: ['battle_hand_commit', 'battle_draw_play'],
    allowedOrigins: ['hand', 'battle_draw'],
    defaultDestinationByOrigin: {
      hand: 'graveyard',
      battle_draw: 'discard',
    },
    requiresTarget: true,
  },
  'card-fortifications': {
    cardId: 'card-fortifications',
    timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
    allowedOrigins: ['hand', 'battle_draw'],
    defaultDestinationByOrigin: {
      hand: 'asset_bank',
      battle_draw: 'discard',
    },
  },
  'card-valor': {
    cardId: 'card-valor',
    timings: ['battle_hand_commit', 'battle_draw_play'],
    allowedOrigins: ['hand', 'battle_draw'],
    defaultDestinationByOrigin: {
      hand: 'graveyard',
      battle_draw: 'discard',
    },
  },
};

export function getCardPlayRule(cardId: CardID): CardPlayRule | undefined {
  return coreCardPlayRules[cardId];
}

export function cardCanBePlayedAt(cardId: CardID, timing: CardPlayTiming, origin: CardPlayOrigin): boolean {
  const rule = getCardPlayRule(cardId);
  if (!rule) return true;
  return rule.timings.includes(timing) && rule.allowedOrigins.includes(origin);
}

export function destinationForCardPlay(cardId: CardID, origin: CardPlayOrigin): CardDestination {
  return getCardPlayRule(cardId)?.defaultDestinationByOrigin[origin] ?? 'discard';
}
