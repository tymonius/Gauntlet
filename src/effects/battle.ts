import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types/v06';
import { bankedAssetCardUseAllowed } from './asset-policy';
import { capitalPunishmentCleanupHandler } from './capital-punishment';
import { disruptionBattleHandler } from './disruption';
import { validateEmbargoTargets } from './embargo';
import { sabotageBattleHandler } from './sabotage';
import type { BattleCardTarget, EffectHandler } from './types';

function participantCardCount(participant: BattleParticipantState, cardId: CardID): number {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((played) => played?.cardId === cardId && !played.canceled && !played.negated)
    .length;
}

function participantHasCard(participant: BattleParticipantState, cardId: CardID): boolean {
  return participantCardCount(participant, cardId) > 0;
}

function hasPlayedCard(context: Parameters<EffectHandler['applies']>[0], playerId: PlayerID, cardId: CardID): boolean {
  if (!context.battle) return false;
  const participant = context.battle.attacker.playerId === playerId ? context.battle.attacker : context.battle.defender;
  return participantHasCard(participant, cardId);
}

function treasonCopiedEffect(context: Parameters<EffectHandler['applies']>[0], playerId: PlayerID, cardId: CardID): boolean {
  return context.battle?.effectsResolved.includes(`treason_copy:${playerId}:${cardId}`) ?? false;
}

function hasBankedAsset(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return bankedAssetCardUseAllowed(game, playerId, cardId);
}

function opposingParticipant(context: Parameters<EffectHandler['applies']>[0], owner: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  return context.battle.attacker.playerId === owner ? context.battle.defender : context.battle.attacker;
}

function findPlayedTarget(participant: BattleParticipantState, target: BattleCardTarget) {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .find((played) => played?.cardId === target.targetCardId && played.owner === target.targetOwner && !played.canceled && !played.virtual);
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
    ...participant.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId),
    ...participant.battleDraw,
  ];
}

interface BattleHandCleanupTarget {
  cardId: CardID;
  zone: 'battle_draw_played' | 'battle_draw';
  index: number;
}

function initialBattleHandTargets(participant: BattleParticipantState): BattleHandCleanupTarget[] {
  if (!participant.initialBattleHand) {
    return [
      ...participant.battleDrawPlayed
        .map((played, index) => ({ played, index }))
        .filter(({ played }) => !played.virtual && played.origin === 'battle_draw')
        .map(({ played, index }) => ({ cardId: played.cardId, zone: 'battle_draw_played' as const, index })),
      ...participant.battleDraw.map((cardId, index) => ({ cardId, zone: 'battle_draw' as const, index })),
    ];
  }

  const remaining = new Map<CardID, number>();
  for (const cardId of participant.initialBattleHand) {
    remaining.set(cardId, (remaining.get(cardId) ?? 0) + 1);
  }
  const targets: BattleHandCleanupTarget[] = [];
  for (const [index, played] of participant.battleDrawPlayed.entries()) {
    if (played.virtual || played.fromInitialBattleHand === false) continue;
    if (played.origin !== 'battle_draw' && played.fromInitialBattleHand !== true) continue;
    const available = remaining.get(played.cardId) ?? 0;
    if (played.fromInitialBattleHand !== true && available < 1) continue;
    if (available > 0) remaining.set(played.cardId, available - 1);
    targets.push({ cardId: played.cardId, zone: 'battle_draw_played', index });
  }
  for (const [index, cardId] of participant.battleDraw.entries()) {
    const available = remaining.get(cardId) ?? 0;
    if (available < 1) continue;
    remaining.set(cardId, available - 1);
    targets.push({ cardId, zone: 'battle_draw', index });
  }
  return targets;
}

function chosenBattleHandTargets(participant: BattleParticipantState): BattleHandCleanupTarget[] {
  return participant.battleDrawPlayed
    .map((played, index) => ({ played, index }))
    .filter(({ played }) => !played.virtual && played.origin === 'battle_draw')
    .map(({ played, index }) => ({ cardId: played.cardId, zone: 'battle_draw_played' as const, index }));
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
    const count = participantCardCount(context.battle.defender, 'card-fortifications');

    return {
      modifiers: [
        {
          playerId: context.battle.defender.playerId,
          source: 'card-fortifications',
          amount: count,
          reason: `Fortifications Battle: defender gains +${count}.`,
        },
      ],
      logMessages: [`Fortifications battle effects gave the defender +${count}.`],
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
      .map((participant) => ({ participant, count: participantCardCount(participant, 'card-valor') }))
      .filter(({ count }) => count > 0)
      .map(({ participant, count }) => ({
        playerId: participant.playerId,
        source: 'card-valor',
        amount: 2 * count,
        reason: `Valor Battle: +${2 * count} to battle total.`,
      }));

    return {
      modifiers,
      logMessages: modifiers.map((modifier) => `Valor gave ${modifier.playerId} +${modifier.amount}.`),
    };
  },
};

export const contingencyPlanBattleHandler: EffectHandler = {
  id: 'neutral_contingency_plan_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return [context.battle.attacker, context.battle.defender].some((participant) => {
      const opponent = participant.playerId === context.battle!.attacker.playerId
        ? context.battle!.defender
        : context.battle!.attacker;
      return participantCardCount(participant, 'neutral-contingency-plan') > 0
        && context.game.players[opponent.playerId].controlledTerritories.length
          > context.game.players[participant.playerId].controlledTerritories.length;
    });
  },
  resolve(context) {
    if (!context.battle) return {};
    const modifiers = [context.battle.attacker, context.battle.defender].flatMap((participant) => {
      const opponent = participant.playerId === context.battle!.attacker.playerId
        ? context.battle!.defender
        : context.battle!.attacker;
      const count = participantCardCount(participant, 'neutral-contingency-plan');
      const isBehind = context.game.players[opponent.playerId].controlledTerritories.length
        > context.game.players[participant.playerId].controlledTerritories.length;
      if (count === 0 || !isBehind) return [];
      return [{
        playerId: participant.playerId,
        source: 'neutral-contingency-plan',
        amount: count,
        reason: `Contingency Plan Battle: +${count} while the opponent controls more Territories.`,
      }];
    });

    return {
      modifiers,
      logMessages: modifiers.map((modifier) => `Contingency Plan gave ${modifier.playerId} +${modifier.amount}.`),
    };
  },
};

export const counterintelligenceBattleHandler: EffectHandler = {
  id: 'neutral_counterintelligence_battle',
  timing: ['before_battle_resolution'],
  applies(context) {
    if (!context.battle) return false;
    return participantHasCard(context.battle.attacker, 'neutral-counterintelligence')
      || participantHasCard(context.battle.defender, 'neutral-counterintelligence');
  },
  resolve(context) {
    if (!context.battle) return {};
    const modifiers = [context.battle.attacker, context.battle.defender]
      .map((participant) => ({
        participant,
        count: participantCardCount(participant, 'neutral-counterintelligence'),
      }))
      .filter(({ count }) => count > 0)
      .map(({ participant, count }) => ({
        playerId: participant.playerId,
        source: 'neutral-counterintelligence',
        amount: count,
        reason: `Counterintelligence Battle: +${count} to battle total.`,
      }));
    return {
      modifiers,
      logMessages: modifiers.map((modifier) => `Counterintelligence gave ${modifier.playerId} +${modifier.amount}.`),
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
    return hasPlayedCard(context, context.battle.winner, 'card-attrition')
      || treasonCopiedEffect(context, context.battle.winner, 'card-attrition');
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

export const attritionAssetHandler: EffectHandler = {
  id: 'attrition_asset',
  timing: ['after_battle_resolution'],
  applies(context) {
    if (!context.battle?.winner || !context.battle.loser) return false;
    return hasBankedAsset(context.game, context.battle.winner, 'card-attrition');
  },
  resolve(context) {
    if (!context.battle?.winner || !context.battle.loser) return {};

    const loser = context.battle.attacker.playerId === context.battle.loser
      ? context.battle.attacker
      : context.battle.defender;
    const cards = loser.battleDrawPlayed.filter((played) => !played.virtual).map((played) => played.cardId);

    return {
      destinationOverrides: cards.map((cardId) => ({
        cardId,
        owner: loser.playerId,
        destination: 'graveyard' as const,
        reason: 'Attrition Asset: opponent\'s played battle-drawn cards go to the Graveyard after they lose.',
      })),
      logMessages: cards.length > 0 ? ['Attrition Asset sent the losing opponent\'s played battle-drawn cards to the Graveyard.'] : [],
    };
  },
};


export const neutralAttritionBattleHandler: EffectHandler = {
  id: 'neutral_attrition_battle',
  timing: ['after_battle_resolution'],
  applies(context) {
    if (!context.battle?.winner || !context.battle.loser) return false;
    return hasPlayedCard(context, context.battle.winner, 'neutral-attrition')
      || treasonCopiedEffect(context, context.battle.winner, 'neutral-attrition');
  },
  resolve(context) {
    if (!context.battle?.winner || !context.battle.loser) return {};
    const loser = context.battle.attacker.playerId === context.battle.loser
      ? context.battle.attacker
      : context.battle.defender;
    const targets = initialBattleHandTargets(loser);
    return {
      destinationOverrides: targets.map((target) => ({
        cardId: target.cardId,
        owner: loser.playerId,
        destination: 'graveyard' as const,
        reason: "Attrition Battle: every card from the losing opponent's initial Battle Hand goes to the Graveyard.",
        target: { zone: target.zone, index: target.index },
        force: true,
      })),
      logMessages: targets.length > 0
        ? ["Attrition sent the losing opponent's initial Battle Hand to the Graveyard."]
        : [],
    };
  },
};

export const neutralAttritionAssetHandler: EffectHandler = {
  id: 'neutral_attrition_asset',
  timing: ['after_battle_resolution'],
  applies(context) {
    if (!context.battle?.winner || !context.battle.loser) return false;
    return hasBankedAsset(context.game, context.battle.winner, 'neutral-attrition');
  },
  resolve(context) {
    if (!context.battle?.winner || !context.battle.loser) return {};
    const loser = context.battle.attacker.playerId === context.battle.loser
      ? context.battle.attacker
      : context.battle.defender;
    const targets = chosenBattleHandTargets(loser);
    return {
      destinationOverrides: targets.map((target) => ({
        cardId: target.cardId,
        owner: loser.playerId,
        destination: 'graveyard' as const,
        reason: 'Attrition Asset: chosen Battle Hand cards go to the Graveyard instead of the Discard Pile.',
        target: { zone: target.zone, index: target.index },
      })),
      logMessages: targets.length > 0
        ? ["Attrition sent the losing opponent's chosen Battle Hand cards to the Graveyard."]
        : [],
    };
  },
};

export const baseBattleEffectHandlers: EffectHandler[] = [
  tradeBanBattleHandler,
  disruptionBattleHandler,
  sabotageBattleHandler,
  heartlandDefenseBonusHandler,
  fortificationsAssetHandler,
  fortificationsBattleHandler,
  valorBattleHandler,
  contingencyPlanBattleHandler,
  counterintelligenceBattleHandler,
  attritionBattleHandler,
  attritionAssetHandler,
  neutralAttritionBattleHandler,
  neutralAttritionAssetHandler,
  capitalPunishmentCleanupHandler,
];
