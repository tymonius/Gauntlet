import type { EffectHandler } from './types';
import {
  activePlayedCards,
  validateBattleCancellationTargets,
} from './embargo';

export const disruptionBattleHandler: EffectHandler = {
  id: 'neutral_disruption_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return [context.battle.attacker, context.battle.defender]
      .some((participant) => activePlayedCards(participant)
        .some((card) => card.cardId === 'neutral-disruption'));
  },
  resolve(context) {
    if (!context.battle) return {};
    validateBattleCancellationTargets(context);
    const cancellations = (context.battleCardTargets ?? [])
      .filter((target) => target.sourceCardId === 'neutral-disruption')
      .map((target) => ({
        cardId: target.targetCardId,
        owner: target.targetOwner,
        source: 'neutral-disruption',
        reason: 'Disruption cancels the chosen active opposing Battle card.',
      }));
    return {
      cancellations,
      logMessages: cancellations.map((cancellation) => `Disruption canceled ${cancellation.cardId}.`),
    };
  },
};
