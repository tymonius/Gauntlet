import type { EffectHandler } from './types';
import { activePlayedCards, validateBattleCancellationTargets } from './embargo';

export const sabotageBattleHandler: EffectHandler = {
  id: 'neutral_sabotage_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return [context.battle.attacker, context.battle.defender]
      .some((participant) => activePlayedCards(participant)
        .some((card) => card.cardId === 'neutral-sabotage'));
  },
  resolve(context) {
    if (!context.battle) return {};
    validateBattleCancellationTargets(context);
    const cancellations = (context.battleCardTargets ?? [])
      .filter((target) => target.sourceCardId === 'neutral-sabotage')
      .map((target) => ({
        cardId: target.targetCardId,
        owner: target.targetOwner,
        source: 'neutral-sabotage',
        reason: 'Sabotage cancels the chosen active opposing Battle card.',
        destination: 'discard' as const,
        immediate: true,
      }));
    return {
      cancellations,
      logMessages: cancellations.map((cancellation) => `Sabotage canceled and discarded ${cancellation.cardId}.`),
    };
  },
};