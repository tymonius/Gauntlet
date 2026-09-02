import type {
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types/v06';
import { GameActionError } from './reducer';

export const INVASION = 'neutral-invasion';

export interface InvasionMovementSnapshot {
  invasionBefore: number;
  forcedMarchBefore: number;
  advance: boolean;
}

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

function playerStartIndex(game: GameState, playerId: PlayerID): number | undefined {
  return game.board.spaces.find((space) => (
    space.kind === 'endpoint'
    && space.endpointOwner === playerId
    && space.endpointRole === 'before_gauntlet'
  ))?.index ?? game.board.spaces.find((space) => (
    space.kind === 'heartland' && space.controller === playerId
  ))?.index;
}

function movementIsAdvance(
  game: GameState,
  playerId: PlayerID,
  originSpaceId: SpaceID,
  destinationSpaceId: SpaceID,
): boolean {
  const origin = game.board.spaces.find((space) => space.id === originSpaceId);
  const destination = game.board.spaces.find((space) => space.id === destinationSpaceId);
  const startIndex = playerStartIndex(game, playerId);
  if (!origin || !destination || startIndex === undefined) return false;
  return Math.abs(destination.index - startIndex) > Math.abs(origin.index - startIndex);
}

function moveWouldInitiateBattle(game: GameState, playerId: PlayerID, toSpaceId: SpaceID): boolean {
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  return Boolean(destination?.occupant && destination.occupant !== playerId);
}

export function canPlayInvasionAction(game: GameState, playerId: PlayerID): boolean {
  return game.activePlayer === playerId
    && game.priorityPlayer === playerId
    && game.phase === 'action_before_movement';
}

export function requireInvasionActionTiming(game: GameState, playerId: PlayerID): void {
  if (!canPlayInvasionAction(game, playerId)) {
    throw new GameActionError('Invasion can be played only during the Action Opportunity before movement.');
  }
}

export function applyInvasionAction(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  player.movementRemaining += 2;
  player.invasionAdvanceMovementRemaining = (player.invasionAdvanceMovementRemaining ?? 0) + 2;
  appendPublicLog(
    game,
    playerId,
    'neutral_invasion_action',
    `${player.name} gained two additional advance-only movements from Invasion.`,
    {
      movementRemaining: player.movementRemaining,
      invasionAdvanceMovementRemaining: player.invasionAdvanceMovementRemaining,
    },
  );
}

export function prepareInvasionMove(
  game: GameState,
  playerId: PlayerID,
  toSpaceId: SpaceID,
): InvasionMovementSnapshot {
  const player = game.players[playerId];
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  const destination = game.board.spaces.find((space) => space.id === toSpaceId);
  if (!player || !origin || !destination) {
    return { invasionBefore: 0, forcedMarchBefore: 0, advance: false };
  }

  const invasionBefore = player.invasionAdvanceMovementRemaining ?? 0;
  const forcedMarchBefore = player.nonBattleMovementRemaining ?? 0;
  const advance = movementIsAdvance(game, playerId, origin.id, destination.id);
  if (!advance && invasionBefore > 0) {
    const unavailable = invasionBefore + (moveWouldInitiateBattle(game, playerId, toSpaceId) ? forcedMarchBefore : 0);
    if (player.movementRemaining <= unavailable) {
      throw new GameActionError('The remaining Invasion movement may be used only to advance.');
    }
  }
  return { invasionBefore, forcedMarchBefore, advance };
}

/**
 * Unopposed forward movement spends Forced March first, then Invasion, and
 * preserves ordinary movement. Beginning a battle ends all unused movement.
 */
export function reconcileInvasionMove(
  game: GameState,
  playerId: PlayerID,
  snapshot: InvasionMovementSnapshot,
  initiatedBattle: boolean,
): void {
  const player = game.players[playerId];
  if (!player) return;
  if (initiatedBattle) {
    player.movementRemaining = 0;
    player.invasionAdvanceMovementRemaining = 0;
    return;
  }
  if (snapshot.advance && snapshot.forcedMarchBefore < 1 && snapshot.invasionBefore > 0) {
    player.invasionAdvanceMovementRemaining = Math.max(snapshot.invasionBefore - 1, 0);
  }
  if (game.phase !== 'game_over') {
    game.phase = player.movementRemaining > 0 ? 'movement' : 'action_after_movement';
  }
}

export function clearInvasionMovement(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (player) player.invasionAdvanceMovementRemaining = 0;
}

export function clearInvasionMovementForTurnTransition(
  game: GameState,
  endingPlayerId: PlayerID,
): void {
  clearInvasionMovement(game, endingPlayerId);
  clearInvasionMovement(game, game.activePlayer);
}
