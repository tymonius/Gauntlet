import type { CardID } from '../types/v06';

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

const battleOnly = (cardId: CardID): CardPlayRule => ({
  cardId,
  timings: ['battle_hand_commit', 'battle_draw_play'],
  allowedOrigins: ['hand', 'battle_draw'],
  defaultDestinationByOrigin: { hand: 'graveyard', battle_draw: 'discard' },
});

export const coreCardPlayRules: Record<CardID, CardPlayRule> = {
  'neutral-advance-guard': battleAndAction('neutral-advance-guard', 'discard'),
  'neutral-consolidation': battleAndAction('neutral-consolidation', 'discard'),
  'neutral-contingency-plan': battleAndAction('neutral-contingency-plan', 'asset_bank'),
  'neutral-counterintelligence': battleAndAction('neutral-counterintelligence', 'asset_bank'),
  'neutral-decoys': battleAndAction('neutral-decoys', 'asset_bank'),
  'neutral-disruption': battleAndAction('neutral-disruption', 'discard'),
  'neutral-entrenchment': battleAndAction('neutral-entrenchment', 'asset_bank'),
  'neutral-foothold': battleAndAction('neutral-foothold', 'asset_bank'),
  'neutral-illegal-occupation': battleAndAction('neutral-illegal-occupation', 'asset_bank'),
  'neutral-palisade-wall': battleAndAction('neutral-palisade-wall', 'asset_bank'),
  'neutral-reinforcements': battleAndAction('neutral-reinforcements', 'asset_bank'),
  'neutral-requisition': battleAndAction('neutral-requisition', 'discard', true),
  'neutral-rousing-speech': battleAndAction('neutral-rousing-speech', 'asset_bank'),
  'neutral-sabotage': battleAndAction('neutral-sabotage', 'discard', true),
  'neutral-salvage': battleAndAction('neutral-salvage', 'discard', true),
  'neutral-scorched-earth': battleAndAction('neutral-scorched-earth', 'asset_bank'),
  'neutral-sedition': battleAndAction('neutral-sedition', 'discard'),
  'neutral-stand-ground': battleAndAction('neutral-stand-ground', 'asset_bank'),
  'neutral-strategic-withdrawal': battleAndAction('neutral-strategic-withdrawal', 'discard', true),
  'neutral-tactical-planning': battleAndAction('neutral-tactical-planning', 'discard'),
  'neutral-valor': battleAndAction('neutral-valor', 'asset_bank'),
  'neutral-attrition': battleAndAction('neutral-attrition', 'asset_bank'),
  'neutral-arcane-knowledge': battleAndAction('neutral-arcane-knowledge', 'discard', true),
  'neutral-bombardment': battleAndAction('neutral-bombardment', 'removed'),
  'neutral-capital-punishment': battleAndAction('neutral-capital-punishment', 'discard', true),
  'neutral-conscription': battleAndAction('neutral-conscription', 'discard'),
  'neutral-contraband': battleAndAction('neutral-contraband', 'discard', true),
  'neutral-counterworks': battleAndAction('neutral-counterworks', 'asset_bank'),
  'neutral-court-martial': battleAndAction('neutral-court-martial', 'asset_bank'),
  'neutral-fortifications': battleAndAction('neutral-fortifications', 'asset_bank'),
  'neutral-insurrection': battleAndAction('neutral-insurrection', 'discard'),
  'neutral-liberation': battleAndAction('neutral-liberation', 'asset_bank'),
  'neutral-protracted-siege': battleAndAction('neutral-protracted-siege', 'asset_bank'),
  'neutral-resistance': battleAndAction('neutral-resistance', 'asset_bank'),
  'neutral-resourcefulness': battleAndAction('neutral-resourcefulness', 'asset_bank'),
  'neutral-assimilation': battleAndAction('neutral-assimilation', 'removed'),
  'neutral-invasion': battleAndAction('neutral-invasion', 'discard'),
  'neutral-revolution': battleAndAction('neutral-revolution', 'discard'),
  'neutral-sequestration': battleAndAction('neutral-sequestration', 'discard'),
  'neutral-armistice': battleAndAction('neutral-armistice', 'removed'),
  'neutral-fealty': battleAndAction('neutral-fealty', 'asset_bank'),
  'neutral-forced-march': battleAndAction('neutral-forced-march', 'discard'),
  'neutral-new-recruits': battleAndAction('neutral-new-recruits', 'discard', true),
  'neutral-pathfinders': battleAndAction('neutral-pathfinders', 'discard', true),
  'neutral-rallying-cry': battleAndAction('neutral-rallying-cry', 'discard'),
  'neutral-redemption': battleAndAction('neutral-redemption', 'asset_bank'),
  'neutral-reserves': battleAndAction('neutral-reserves', 'discard'),
  'neutral-scouting-report': battleAndAction('neutral-scouting-report', 'discard'),
  'neutral-supplies': battleAndAction('neutral-supplies', 'asset_bank'),

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

  'financiers-speculation': battleAndAction('financiers-speculation', 'removed', true),
  'financiers-monetary-crisis': battleAndAction('financiers-monetary-crisis', 'discard'),
  'financiers-liquidation': battleAndAction('financiers-liquidation', 'discard', true),
  'financiers-underwriting': battleAndAction('financiers-underwriting', 'asset_bank'),
  'financiers-capital-gains': battleAndAction('financiers-capital-gains', 'removed', true),
  'financiers-tariffs': battleAndAction('financiers-tariffs', 'asset_bank'),
  'financiers-divestment': battleAndAction('financiers-divestment', 'discard', true),
  'financiers-margin-loan': battleAndAction('financiers-margin-loan', 'asset_bank', true),
  'financiers-leveraged-buyout': battleAndAction('financiers-leveraged-buyout', 'discard'),
  'financiers-foreclosure': battleAndAction('financiers-foreclosure', 'discard', true),
  'financiers-property-dues': battleAndAction('financiers-property-dues', 'asset_bank'),
  'financiers-corner-the-market': battleAndAction('financiers-corner-the-market', 'discard'),

  'intelligence-exfiltration': battleAndAction('intelligence-exfiltration', 'asset_bank'),
  'intelligence-spies': battleAndAction('intelligence-spies', 'discard'),
  'intelligence-fog-of-war': battleAndAction('intelligence-fog-of-war', 'removed', true),
  'intelligence-disinformation': battleOnly('intelligence-disinformation'),
  'intelligence-operational-reassessment': battleAndAction('intelligence-operational-reassessment', 'discard'),
  'intelligence-intercepted-orders': battleAndAction('intelligence-intercepted-orders', 'asset_bank'),
  'intelligence-reconnaissance': battleAndAction('intelligence-reconnaissance', 'asset_bank'),
  'intelligence-deep-cover': battleAndAction('intelligence-deep-cover', 'asset_bank'),
  'intelligence-assassins': battleAndAction('intelligence-assassins', 'discard'),
  'intelligence-treason': battleAndAction('intelligence-treason', 'asset_bank'),
  'intelligence-subversion': battleAndAction('intelligence-subversion', 'asset_bank'),
  'intelligence-sleeper-network': actionOnly('intelligence-sleeper-network', 'asset_bank'),

  'mystics-dark-omens': battleAndAction('mystics-dark-omens', 'discard'),
  'mystics-accursed-wager': battleAndAction('mystics-accursed-wager', 'discard'),
  'mystics-fates-toll': battleAndAction('mystics-fates-toll', 'discard', true),
  'mystics-grave-ward': battleAndAction('mystics-grave-ward', 'asset_bank'),
  'mystics-soul-for-soul': battleAndAction('mystics-soul-for-soul', 'discard', true),
  'mystics-rend-the-veil': battleAndAction('mystics-rend-the-veil', 'asset_bank'),
  'mystics-paths-of-shadow': battleAndAction('mystics-paths-of-shadow', 'discard', true),
  'mystics-witchcraft': battleAndAction('mystics-witchcraft', 'asset_bank'),
  'mystics-black-covenant': battleAndAction('mystics-black-covenant', 'asset_bank', true),
  'mystics-spirit-hollow': battleAndAction('mystics-spirit-hollow', 'removed', true),
  'mystics-circle-of-bones': battleAndAction('mystics-circle-of-bones', 'removed', true),
  'mystics-necromancy': battleAndAction('mystics-necromancy', 'removed'),

  'inquisition-accusation': battleAndAction('inquisition-accusation', 'discard', true),
  'inquisition-penance': battleAndAction('inquisition-penance', 'discard'),
  'inquisition-divine-mercy': battleAndAction('inquisition-divine-mercy', 'discard', true),
  'inquisition-excommunication': battleAndAction('inquisition-excommunication', 'discard', true),
  'inquisition-guilt-by-association': battleAndAction('inquisition-guilt-by-association', 'discard', true),
  'inquisition-act-of-faith': battleAndAction('inquisition-act-of-faith', 'discard'),
  'inquisition-burning-at-the-stake': battleAndAction('inquisition-burning-at-the-stake', 'discard'),
  'inquisition-confession': battleAndAction('inquisition-confession', 'discard'),
  'inquisition-no-martyrs': battleAndAction('inquisition-no-martyrs', 'asset_bank'),
  'inquisition-tyranny': battleAndAction('inquisition-tyranny', 'asset_bank'),
  'inquisition-heresy': battleOnly('inquisition-heresy'),
  'inquisition-hellfire': battleAndAction('inquisition-hellfire', 'discard'),
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
