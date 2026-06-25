import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types';
import type { EffectHandler } from './types';

function participantHasCard(participant: BattleParticipantState, cardId: CardID): boolean {
  return participant.handCommit?.cardId === cardId
    || participant.battleDrawPlayed.some((played) => played.cardId === cardId);
}

function hasPlayedCard(context: Parameters<EffectHandler['applies']>[0], playerId: PlayerID, cardId: CardID): boolean {
  if (!context.battle) return false;
  const participant = context.battle.attacker.playerId === playerId ? context.battle.attacker : context.battle.defender;
  return participantHasCard(participant, cardId);
}

function hasBankedAsset(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return game.players[playerId]?.zones.assetBank.includes(cardId) ?? false;
}

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

export const fortificationsAssetHandler: EffectHandler = {
  id: 'fortifications_asset',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return hasBankedAsset(context.game, context.battle.defender.playerId, 'card-fortifications');
  },
  resolve(context) {
    if (!context.battle) return {};

    return {
      modifiers: [
        {
          playerId: context.battle.defender.playerId,
          source: 'card-fortifications',
          amount: 1,
          reason: 'Fortifications Asset: defender gains +1.',
        },
      ],
      logMessages: ['Fortifications gave the defender +1.'],
    };
  },
};

export const fortificationsBattleHandler: EffectHandler = {
  id: 'fortifications_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return hasPlayedCard(context, context.battle.defender.playerId, 'card-fortifications');
  },
  resolve(context) {
    if (!context.battle) return {};

    return {
      modifiers: [
        {
          playerId: context.battle.defender.playerId,
          source: 'card-fortifications',
          amount: 1,
          reason: 'Fortifications Battle: defender gains +1.',
        },
      ],
      logMessages: ['Fortifications battle effect gave the defender +1.'],
    };
  },
};

export const valorBattleHandler: EffectHandler = {
  id: 'valor_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return hasPlayedCard(context, context.battle.attacker.playerId, 'card-valor')
      || hasPlayedCard(context, context.battle.defender.playerId, 'card-valor');
  },
  resolve(context) {
    if (!context.battle) return {};

    const modifiers = [context.battle.attacker, context.battle.defender]
      .filter((participant) => participantHasCard(participant, 'card-valor'))
      .map((participant) => ({
        playerId: participant.playerId,
        source: 'card-valor',
        amount: 2,
        reason: 'Valor Battle: +2 to battle total.',
      }));

    return {
      modifiers,
      logMessages: modifiers.map((modifier) => `Valor gave ${modifier.playerId} +2.`),
    };
  },
};

export const baseBattleEffectHandlers: EffectHandler[] = [
  homelandAdvantageHandler,
  fortificationsAssetHandler,
  fortificationsBattleHandler,
  valorBattleHandler,
];
