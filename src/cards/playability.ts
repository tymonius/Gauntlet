import type { CardID } from '../types';

export type CardPlayTiming = 'action' | 'battle_hand_commit' | 'battle_draw_play';
export type CardPlayOrigin = 'hand' | 'battle_draw';
export type CardDestination = 'discard' | 'graveyard' | 'hand' | 'removed' | 'asset_bank';

export interface CardPlayRule {
  cardId: CardID;
  timings: CardPlayTiming[];
  allowedOrigins: CardPlayOrigin[];
  defaultDestinationByOrigin: Partial<Record<CardPlayOrigin, CardDestination>>;
  requiresTarget?: boolean;
}

const battleAndAction = (cardId: CardID, actionDestination: CardDestination, requiresTarget = false): CardPlayRule => ({
  cardId,
  timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
  allowedOrigins: ['hand', 'battle_draw'],
  defaultDestinationByOrigin: { hand: actionDestination, battle_draw: 'discard' },
  requiresTarget,
});

const actionOnly = (cardId: CardID, destination: CardDestination, requiresTarget = false): CardPlayRule => ({
  cardId,
  timings: ['action'],
  allowedOrigins: ['hand'],
  defaultDestinationByOrigin: { hand: destination },
  requiresTarget,
});

export const coreCardPlayRules: Record<CardID, CardPlayRule> = {
  'card-attrition': battleAndAction('card-attrition', 'asset_bank'),
  'card-conscription': { cardId: 'card-conscription', timings: ['battle_hand_commit', 'battle_draw_play'], allowedOrigins: ['hand', 'battle_draw'], defaultDestinationByOrigin: { hand: 'graveyard', battle_draw: 'discard' } },
  'card-embargo': { cardId: 'card-embargo', timings: ['battle_hand_commit', 'battle_draw_play'], allowedOrigins: ['hand', 'battle_draw'], defaultDestinationByOrigin: { hand: 'graveyard', battle_draw: 'discard' }, requiresTarget: true },
  'card-fortifications': battleAndAction('card-fortifications', 'asset_bank'),
  'card-valor': { cardId: 'card-valor', timings: ['battle_hand_commit', 'battle_draw_play'], allowedOrigins: ['hand', 'battle_draw'], defaultDestinationByOrigin: { hand: 'graveyard', battle_draw: 'discard' } },

  'military-unbroken-ranks': battleAndAction('military-unbroken-ranks', 'asset_bank'),
  'military-battlefield-promotion': battleAndAction('military-battlefield-promotion', 'discard', true),
  'military-encampment': battleAndAction('military-encampment', 'removed', true),
  'military-rearguard': battleAndAction('military-rearguard', 'asset_bank'),
  'military-brothers-in-arms': battleAndAction('military-brothers-in-arms', 'asset_bank'),
  'military-field-command': battleAndAction('military-field-command', 'asset_bank'),
  'military-reserve-force': battleAndAction('military-reserve-force', 'asset_bank', true),
  'military-give-chase': battleAndAction('military-give-chase', 'graveyard'),
  'military-hold-the-line': battleAndAction('military-hold-the-line', 'asset_bank'),
  'military-countercharge': battleAndAction('military-countercharge', 'asset_bank'),
  'military-war-crimes': battleAndAction('military-war-crimes', 'asset_bank'),
  'military-shock-and-awe': battleAndAction('military-shock-and-awe', 'asset_bank'),

  'diplomats-safe-conduct': actionOnly('diplomats-safe-conduct', 'asset_bank'),
  'diplomats-neutral-observers': actionOnly('diplomats-neutral-observers', 'asset_bank'),
  'diplomats-good-faith': actionOnly('diplomats-good-faith', 'asset_bank'),
  'diplomats-sanctions-censure': actionOnly('diplomats-sanctions-censure', 'asset_bank'),
  'diplomats-sanctions-embargo': actionOnly('diplomats-sanctions-embargo', 'asset_bank'),
  'diplomats-demilitarized-zone': actionOnly('diplomats-demilitarized-zone', 'removed'),
  'diplomats-sanctions-blockade': actionOnly('diplomats-sanctions-blockade', 'removed'),

  'financiers-speculation': actionOnly('financiers-speculation', 'removed', true),
  'financiers-monetary-crisis': battleAndAction('financiers-monetary-crisis', 'discard'),
  'financiers-liquidation': actionOnly('financiers-liquidation', 'discard', true),
  'financiers-underwriting': battleAndAction('financiers-underwriting', 'asset_bank'),
  'financiers-capital-gains': battleAndAction('financiers-capital-gains', 'removed', true),
  'financiers-tariffs': actionOnly('financiers-tariffs', 'asset_bank'),
  'financiers-divestment': actionOnly('financiers-divestment', 'discard', true),
  'financiers-margin-loan': actionOnly('financiers-margin-loan', 'asset_bank', true),
  'financiers-leveraged-buyout': actionOnly('financiers-leveraged-buyout', 'discard'),
  'financiers-foreclosure': battleAndAction('financiers-foreclosure', 'discard', true),
  'financiers-property-dues': actionOnly('financiers-property-dues', 'asset_bank'),
  'financiers-corner-the-market': actionOnly('financiers-corner-the-market', 'discard'),
};

export function getCardPlayRule(cardId: CardID): CardPlayRule | undefined { return coreCardPlayRules[cardId]; }
export function cardCanBePlayedAt(cardId: CardID, timing: CardPlayTiming, origin: CardPlayOrigin): boolean {
  const rule = getCardPlayRule(cardId);
  if (!rule) return true;
  return rule.timings.includes(timing) && rule.allowedOrigins.includes(origin);
}
export function destinationForCardPlay(cardId: CardID, origin: CardPlayOrigin): CardDestination {
  return getCardPlayRule(cardId)?.defaultDestinationByOrigin[origin] ?? 'discard';
}
