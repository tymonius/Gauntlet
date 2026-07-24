import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  MysticRiteId,
  PlayerID,
} from '../types';
import type { BeginMysticRiteAction, ResolveMysticsChoiceAction } from './actions';
import {
  beginRiteOfBlood,
  beginRiteOfCrossing,
  beginRiteOfEchoes,
  completeBegunRite,
  isArcaneCard,
  MysticsRitualError,
  resetBegunRite,
} from './mystics-ritual';

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function playerHasOtherPendingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

export function beginMysticRiteFromAction(game: GameState, action: BeginMysticRiteAction): void {
  if (playerHasOtherPendingChoice(game)) throw new MysticsRitualError('Resolve the pending choice before beginning a Rite.');
  if (action.riteId === 'rite_of_echoes') {
    if (!action.secondaryCardId) throw new MysticsRitualError('Rite of Echoes requires both bound cards.');
    beginRiteOfEchoes(game, action.playerId, action.cardId, action.secondaryCardId);
    return;
  }
  if (action.riteId === 'rite_of_blood') {
    beginRiteOfBlood(game, action.playerId, action.cardId);
    return;
  }
  beginRiteOfCrossing(game, action.playerId, action.cardId, action.source ?? 'hand');
}

function activeCardsFor(battle: BattleState, playerId: PlayerID): BattlePlayedCard[] {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => Boolean(card && !card.canceled && !card.negated));
}

function usedMatchingEchoesCard(battle: BattleState, playerId: PlayerID, cardId: CardID): boolean {
  return activeCardsFor(battle, playerId).some((card) => card.cardId === cardId);
}

function cleanBloodVictory(game: GameState, playerId: PlayerID): boolean {
  const result = game.recentBattleResult;
  if (!result || result.winner !== playerId) return false;
  return (result.handCommittedCards?.[playerId]?.length ?? 0) === 0
    && (result.battleHandCards?.[playerId]?.length ?? 0) === 0;
}

function openGuardiansOfTheCircle(game: GameState, playerId: PlayerID, battleId: string, riteId: Exclude<MysticRiteId, 'rite_of_crossing'>): boolean {
  const player = game.players[playerId];
  const mystics = player.mystics;
  if (!mystics || player.leaderName !== 'Spirit Walker' || game.activePlayer !== playerId) return false;
  if (mystics.guardiansOfTheCircleUsedTurn === game.turn) return false;

  const arcaneCardOptions = player.zones.hand.filter(isArcaneCard);
  mystics.guardiansOfTheCircleUsedTurn = game.turn;
  if (arcaneCardOptions.length === 0) return false;

  game.pendingMysticsChoice = {
    kind: 'guardians_of_the_circle',
    playerId,
    battleId,
    riteId,
    arcaneCardOptions,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function interruptRiteAfterLoss(game: GameState, playerId: PlayerID, battleId: string): void {
  const rite = game.players[playerId].mystics?.begunRite;
  if (!rite || rite.kind === 'rite_of_crossing') return;
  if (!openGuardiansOfTheCircle(game, playerId, battleId, rite.kind)) {
    resetBegunRite(game, playerId, 'battle_lost');
  }
}

export function reconcileMysticsAfterResolvedBattle(game: GameState, battle: BattleState): void {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id || game.phase === 'game_over') return;

  for (const playerId of [battle.attacker.playerId, battle.defender.playerId]) {
    const player = game.players[playerId];
    const rite = player.mystics?.begunRite;
    if (!rite) continue;

    if (rite.kind === 'rite_of_echoes'
      && rite.startedTurn < game.turn
      && usedMatchingEchoesCard(battle, playerId, rite.faceDownBoundCardId)) {
      completeBegunRite(game, playerId, 'rite_of_echoes');
      if (game.phase === 'game_over') return;
      continue;
    }

    if (rite.kind === 'rite_of_blood'
      && rite.startedTurn < game.turn
      && cleanBloodVictory(game, playerId)) {
      completeBegunRite(game, playerId, 'rite_of_blood');
      if (game.phase === 'game_over') return;
      continue;
    }

    if (result.loser === playerId) {
      interruptRiteAfterLoss(game, playerId, battle.id);
      if (game.pendingMysticsChoice) return;
    }
  }
}

export function reconcileRiteOfCrossingAtTurnStart(game: GameState): void {
  if (game.phase !== 'turn_start' || game.phase === 'game_over') return;
  const playerId = game.activePlayer;
  const player = game.players[playerId];
  const rite = player.mystics?.begunRite;
  if (!rite || rite.kind !== 'rite_of_crossing' || rite.startedTurn >= game.turn) return;

  const space = game.board.spaces.find((candidate) => candidate.id === rite.requiredSpaceId);
  const requirementMaintained = player.occupiedSpaceId === rite.requiredSpaceId || space?.controller === playerId;
  if (requirementMaintained) completeBegunRite(game, playerId, 'rite_of_crossing');
  else resetBegunRite(game, playerId, 'crossing_position_lost');
}

export function resolveMysticsChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.playerId !== action.playerId) {
    throw new MysticsRitualError(`${action.playerId} has no pending Mystics choice.`);
  }
  if (pending.kind !== 'guardians_of_the_circle') {
    throw new MysticsRitualError(`Unsupported Mystics choice: ${pending.kind}.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new MysticsRitualError('Choose whether to use Guardians of the Circle.');
  }

  const player = game.players[action.playerId];
  game.pendingMysticsChoice = undefined;

  if (action.choice === 'use') {
    if (!action.cardId || !pending.arcaneCardOptions.includes(action.cardId) || !isArcaneCard(action.cardId)) {
      throw new MysticsRitualError('Choose an eligible Arcane card from hand.');
    }
    if (!removeOne(player.zones.hand, action.cardId)) {
      throw new MysticsRitualError('The chosen Arcane card is no longer in hand.');
    }
    player.zones.graveyard.push(action.cardId);
    publicLog(
      game,
      action.playerId,
      'mystics_guardians_of_the_circle_used',
      `${player.name} sacrificed ${action.cardId} to preserve ${pending.riteId}.`,
      { cardId: action.cardId, riteId: pending.riteId, battleId: pending.battleId },
    );
  } else {
    resetBegunRite(game, action.playerId, 'guardians_declined');
  }

  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
