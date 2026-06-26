import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types';
import { validateEmbargoTargets } from './embargo';
import type { BattleCardTarget, EffectHandler } from './types';

function participantHasCard(participant: BattleParticipantState, cardId: CardID): boolean {
  return participant.handCommit?.cardId === cardId && !participant.handCommit.canceled
    || participant.battleDrawPlayed.some((played) => played.cardId === cardId && !played.canceled);
}

function hasPlayedCard(context: Parameters<EffectHandler['applies']>[0], playerId: PlayerID, cardId: CardID): boolean {
  if (!context.battle) return false;
  const participant = context.battle.attacker.playerId === playerId ? context.battle.attacker : context.battle.defender;
  return participantHasCard(participant, cardId);
}

function hasBankedAsset(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return game.players[playerId]?.zones.assetBank.includes(cardId) ?? false;
}

function hasCondition(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return game.players[playerId]?.zones.conditions.includes(cardId) ?? false;
}

function opposingParticipant(context: Parameters<EffectHandler['applies']>[0], owner: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  return context.battle.attacker.playerId === owner ? context.battle.defender : context.battle.attacker;
}

function findPlayedTarget(participant: BattleParticipantState, target: BattleCardTarget) {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .find((played) => played?.cardId === target.targetCardId && played.owner === target.targetOwner && !played.canceled);
}

function selectedEmbargoTarget(context: Parameters<EffectHandler['resolve']>[0], sourceOwner: PlayerID): BattleCardTarget | undefined {
  const target = context.battleCardTargets?.find((candidate) => (
    candidate.sourceCardId === 'card-embargo'
    && candidate.sourceOwner === sourceOwner
  ));
  if (!target || target.targetOwner === sourceOwner) return undefined;

  const opponent = opposingParticipant(context, sourceOwner);
  if (!opponent || opponent.playerId !== target.targetOwner) return undefined;

  return findPlayedTarget(opponent, target) ? target : undefined;
}

function battleDrawCardsFor(participant: BattleParticipantState): CardID[] {
  return [
    ...participant.battleDrawPlayed.map((played) => played.cardId),
    ...participant.battleDraw,
  ];
}

export const heartlandDefenseBonusHandler: EffectHandler = {
  id: 'heartland_defense_bonus',
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
          source: 'heartland_defense_bonus',
          amount: 1,
          reason: 'Heartland Defense: +1 while defending your Heartland.',
        },
      ],
      logMessages: ['Heartland Defense gave the defender +1.'],
    };
  },
};

export const homelandAdvantageHandler = heartlandDefenseBonusHandler;

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

export const tradeBanBattleHandler: EffectHandler = {
  id: 'trade_ban_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return hasPlayedCard(context, context.battle.attacker.playerId, 'card-embargo')
      || hasPlayedCard(context, context.battle.defender.playerId, 'card-embargo');
  },
  resolve(context) {
    if (!context.battle) return {};

    validateEmbargoTargets(context);

    const cancellations = [context.battle.attacker, context.battle.defender]
      .filter((participant) => participantHasCard(participant, 'card-embargo'))
      .flatMap((participant) => {
        const target = selectedEmbargoTarget(context, participant.playerId);
        if (!target) return [];
        return [{
          cardId: target.targetCardId,
          owner: target.targetOwner,
          source: 'card-embargo',
          reason: 'Embargo cancels the chosen opposing Battle card.',
        }];
      });

    return {
      cancellations,
      logMessages: cancellations.map((cancel) => `Embargo canceled ${cancel.cardId}.`),
    };
  },
};

export const attritionBattleHandler: EffectHandler = {
  id: 'attrition_battle',
  timing: ['after_battle_resolution'],
  applies(context) {
    if (!context.battle?.winner || !context.battle.loser) return false;
    return hasPlayedCard(context, context.battle.winner, 'card-attrition');
  },
  resolve(context) {
    if (!context.battle?.winner || !context.battle.loser) return {};

    const loser = context.battle.attacker.playerId === context.battle.loser
      ? context.battle.attacker
      : context.battle.defender;
    const cards = battleDrawCardsFor(loser);

    return {
      destinationOverrides: cards.map((cardId) => ({
        cardId,
        owner: loser.playerId,
        destination: 'graveyard' as const,
        reason: 'Attrition Battle: opponent\'s battle-drawn cards go to the Graveyard after they lose.',
      })),
      logMessages: cards.length > 0 ? ['Attrition sent the losing opponent\'s battle-drawn cards to the Graveyard.'] : [],
    };
  },
};

export const attritionConditionHandler: EffectHandler = {
  id: 'attrition_condition',
  timing: ['after_battle_resolution'],
  applies(context) {
    if (!context.battle?.winner || !context.battle.loser) return false;
    return hasCondition(context.game, context.battle.winner, 'card-attrition');
  },
  resolve(context) {
    if (!context.battle?.winner || !context.battle.loser) return {};

    const loser = context.battle.attacker.playerId === context.battle.loser
      ? context.battle.attacker
      : context.battle.defender;
    const cards = loser.battleDrawPlayed.map((played) => played.cardId);

    return {
      destinationOverrides: cards.map((cardId) => ({
        cardId,
        owner: loser.playerId,
        destination: 'graveyard' as const,
        reason: 'Attrition Action: opponent\'s played battle-drawn card goes to the Graveyard after they lose.',
      })),
      logMessages: cards.length > 0 ? ['Attrition condition sent the losing opponent\'s played battle-drawn card to the Graveyard.'] : [],
    };
  },
};

export const baseBattleEffectHandlers: EffectHandler[] = [
  tradeBanBattleHandler,
  heartlandDefenseBonusHandler,
  fortificationsAssetHandler,
  fortificationsBattleHandler,
  valorBattleHandler,
  attritionBattleHandler,
  attritionConditionHandler,
];
