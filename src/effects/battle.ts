import type { EffectHandler } from './types';

export const homelandAdvantageHandler: EffectHandler = {
  id: 'homeland_advantage',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    const location = context.game.board.spaces.find((space) => space.id === context.battle?.location);
    return location?.kind === 'heartland' && location.controller === context.battle.defender.playerId;
  },
  resolve(context) {
    if (!context.battle) return {};

    return {
      modifiers: [
        {
          playerId: context.battle.defender.playerId,
          source: 'homeland_advantage',
          amount: 1,
          reason: 'Homeland Advantage: +1 while defending your own Heartland.',
        },
      ],
      logMessages: ['Homeland Advantage gave the defender +1.'],
    };
  },
};

export const baseBattleEffectHandlers: EffectHandler[] = [homelandAdvantageHandler];
