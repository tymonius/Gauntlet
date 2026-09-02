import type {
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
  ResolvedBattleModifier,
  SpaceID,
} from '../types/v06';
import { GameActionError } from './reducer';

export const FORCED_MARCH = 'neutral-forced-march';
const FORCED_MARCH_BATTLE_RESOLUTION = 'neutral_forced_march_battle';

function appendPublicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
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

function activeForcedMarch(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === FORCED_MARCH && !card.canceled && !card.negated);
}

export function requireForcedMarchActionTiming(game: GameState, playerId: PlayerID): void {
  if (game.activePlayer !== playerId || game.phase !== 'action_before_movement') {
    throw new GameActionError('Forced March can be played only during the Action Opportunity before movement.');
  }
}

export function applyForcedMarchAction(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  player.movementRemaining += 1;
  player.nonBattleMovementRemaining = (player.nonBattleMovementRemaining ?? 0) + 1;
  appendPublicLog(
    game,
    playerId,
    'neutral_forced_march_action',
    `${player.name} gained one additional position of movement that cannot initiate a battle.`,
    {
      movementRemaining: player.movementRemaining,
      nonBattleMovementRemaining: player.nonBattleMovementRemaining,
    },
  );
}

export function forcedMarchMoveWouldInitiateBattle(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: SpaceID,
): boolean {
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  return Boolean(destination?.occupant && destination.occupant !== playerId);
}

export function requireBattleCapableMovement(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: SpaceID,
): void {
  if (!forcedMarchMoveWouldInitiateBattle(game, playerId, toSpaceId)) return;
  const player = game.players[playerId];
  const restricted = player.nonBattleMovementRemaining ?? 0;
  if (player.movementRemaining <= restricted) {
    throw new GameActionError('The remaining Forced March movement cannot initiate a battle.');
  }
}

/**
 * Reconciles movement after the core adjacent-move reducer. Unopposed movement
 * spends restricted movement first, preserving ordinary movement for a later
 * battle. Beginning a battle ends all further movement for the turn.
 */
export function reconcileForcedMarchMove(
  game: GameState,
  playerId: PlayerID,
  initiatedBattle: boolean,
  restrictedBefore: number,
): void {
  const player = game.players[playerId];
  if (initiatedBattle) {
    player.movementRemaining = 0;
    player.nonBattleMovementRemaining = 0;
    return;
  }

  if (restrictedBefore > 0) {
    player.nonBattleMovementRemaining = Math.max(restrictedBefore - 1, 0);
  }
  if (game.phase !== 'game_over') {
    game.phase = player.movementRemaining > 0 ? 'movement' : 'action_after_movement';
  }
}

export function finishRemainingMovement(game: GameState, playerId: PlayerID): void {
  if (game.activePlayer !== playerId || game.phase !== 'movement' || game.battle) {
    throw new GameActionError('Movement cannot be finished right now.');
  }
  const player = game.players[playerId];
  player.movementRemaining = 0;
  player.nonBattleMovementRemaining = 0;
  game.phase = 'action_after_movement';
  game.priorityPlayer = playerId;
  appendPublicLog(game, playerId, 'finish_movement', `${player.name} finished movement.`);
}

export function clearRestrictedMovementForTurnTransition(
  game: GameState,
  endingPlayerId: PlayerID,
): void {
  game.players[endingPlayerId].nonBattleMovementRemaining = 0;
  game.players[game.activePlayer].nonBattleMovementRemaining = 0;
}

export function applyForcedMarchBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(FORCED_MARCH_BATTLE_RESOLUTION)) return;

  const count = (activeForcedMarch(battle.attacker.handCommit) ? 1 : 0)
    + battle.attacker.battleDrawPlayed.filter(activeForcedMarch).length;
  const modifiers: ResolvedBattleModifier[] = [];
  if (count > 0) {
    battle.attacker.modifiers += count;
    modifiers.push({
      playerId: battle.attacker.playerId,
      source: FORCED_MARCH,
      amount: count,
      reason: `Forced March Battle: attacker gains +${count}.`,
    });
    appendPublicLog(
      game,
      battle.attacker.playerId,
      'neutral_forced_march_battle',
      `${game.players[battle.attacker.playerId].name} gained +${count} from Forced March while attacking.`,
      { battleId: battle.id, count },
    );
  }
  battle.resolvedModifiers = [...(battle.resolvedModifiers ?? []), ...modifiers];
  battle.effectsResolved.push(FORCED_MARCH_BATTLE_RESOLUTION);
}
