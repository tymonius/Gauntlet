import type { BoardSpaceState, GameEvent, GamePhase, GameState, PlayerID, SpaceID } from '../types';
import type { ActionResult, GameAction } from './actions';

export class GameActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameActionError';
  }
}

export interface ApplyGameActionResult {
  state: GameState;
  result?: ActionResult;
}

function cloneGameState(game: GameState): GameState {
  return structuredClone(game);
}

function requirePlayerTurn(game: GameState, playerId: PlayerID): void {
  if (game.activePlayer !== playerId) {
    throw new GameActionError(`It is not ${playerId}'s turn.`);
  }
}

function requirePlayer(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player) throw new GameActionError(`Unknown player: ${playerId}.`);
  return player;
}

function findSpace(game: GameState, spaceId: SpaceID): BoardSpaceState {
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space) throw new GameActionError(`Unknown space: ${spaceId}.`);
  return space;
}

function appendPublicLog(game: GameState, actor: PlayerID | undefined, type: string, message: string, payload?: unknown): void {
  const event: GameEvent = {
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  };

  game.log.push(event);
}

function nextPlayerId(game: GameState): PlayerID {
  const ids = Object.keys(game.players);
  const currentIndex = ids.indexOf(game.activePlayer);
  return ids[(currentIndex + 1) % ids.length];
}

function phaseAllowsAction(game: GameState, allowed: GamePhase[]): void {
  if (!allowed.includes(game.phase)) {
    throw new GameActionError(`Action is not allowed during phase ${game.phase}.`);
  }
}

function drawCards(game: GameState, action: Extract<GameAction, { type: 'draw_card' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['turn_start', 'action_before_movement', 'action_after_movement']);

  const player = requirePlayer(game, action.playerId);
  const count = action.count ?? 1;

  if (!Number.isInteger(count) || count < 1) {
    throw new GameActionError('Draw count must be a positive integer.');
  }

  const drawnCards = player.zones.deck.slice(0, count);
  player.zones.deck = player.zones.deck.slice(drawnCards.length);
  player.zones.hand = [...player.zones.hand, ...drawnCards];

  appendPublicLog(game, action.playerId, 'draw_card', `${player.name} drew ${drawnCards.length} card${drawnCards.length === 1 ? '' : 's'}.`, {
    count: drawnCards.length,
  });

  if (game.phase === 'turn_start') game.phase = 'action_before_movement';

  return { state: game, result: { drawnCards } };
}

function revealSpace(game: GameState, action: Extract<GameAction, { type: 'reveal_space' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['turn_start', 'action_before_movement', 'movement', 'action_after_movement']);

  const player = requirePlayer(game, action.playerId);
  const space = findSpace(game, action.spaceId);

  if (space.controller !== action.playerId) {
    throw new GameActionError(`${player.name} cannot reveal a space they do not control.`);
  }

  if (space.revealed) {
    throw new GameActionError('That space is already revealed.');
  }

  space.revealed = true;
  appendPublicLog(game, action.playerId, 'reveal_space', `${player.name} revealed ${space.territoryId ?? space.id}.`, {
    spaceId: space.id,
    territoryId: space.territoryId,
  });

  return { state: game };
}

function movePlayer(game: GameState, action: Extract<GameAction, { type: 'move_player' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);
  phaseAllowsAction(game, ['movement']);

  const player = requirePlayer(game, action.playerId);

  if (player.movementRemaining < 1) {
    throw new GameActionError(`${player.name} has no movement remaining.`);
  }

  const origin = game.board.spaces.find((space) => space.occupant === action.playerId);
  if (!origin) throw new GameActionError(`${player.name} does not occupy a board space.`);

  const destination = findSpace(game, action.toSpaceId);
  const distance = Math.abs(destination.index - origin.index);

  if (distance !== 1) {
    throw new GameActionError('Basic movement currently only allows moving to an adjacent space.');
  }

  if (destination.occupant && destination.occupant !== action.playerId) {
    game.phase = 'battle';
    appendPublicLog(game, action.playerId, 'battle_pending', `${player.name} moved into a contested space.`, {
      fromSpaceId: origin.id,
      toSpaceId: destination.id,
      defender: destination.occupant,
    });
    return { state: game };
  }

  origin.occupant = undefined;
  destination.occupant = action.playerId;
  player.occupiedSpaceId = destination.id;
  player.movementRemaining -= 1;

  if (destination.controller && destination.controller !== action.playerId) {
    destination.capturePendingBy = action.playerId;
  }

  appendPublicLog(game, action.playerId, 'move_player', `${player.name} moved to ${destination.id}.`, {
    fromSpaceId: origin.id,
    toSpaceId: destination.id,
  });

  game.phase = 'action_after_movement';
  return { state: game };
}

function endTurn(game: GameState, action: Extract<GameAction, { type: 'end_turn' }>): ApplyGameActionResult {
  requirePlayerTurn(game, action.playerId);

  const endingPlayer = requirePlayer(game, action.playerId);
  const nextPlayer = nextPlayerId(game);

  endingPlayer.actionsRemaining = 0;
  endingPlayer.movementRemaining = 0;

  const nextPlayerState = requirePlayer(game, nextPlayer);
  nextPlayerState.actionsRemaining = 1;
  nextPlayerState.movementRemaining = 1;
  nextPlayerState.hasPlayedActionThisTurn = false;
  nextPlayerState.hasPlayedBattleThisTurn = false;

  game.activePlayer = nextPlayer;
  game.priorityPlayer = nextPlayer;
  game.turn += 1;
  game.phase = 'turn_start';

  appendPublicLog(game, action.playerId, 'end_turn', `${endingPlayer.name} ended their turn.`);

  return { state: game };
}

export function applyGameAction(game: GameState, action: GameAction): ApplyGameActionResult {
  const next = cloneGameState(game);

  switch (action.type) {
    case 'draw_card':
      return drawCards(next, action);
    case 'reveal_space':
      return revealSpace(next, action);
    case 'move_player':
      return movePlayer(next, action);
    case 'end_turn':
      return endTurn(next, action);
    default: {
      const exhaustive: never = action;
      throw new GameActionError(`Unhandled action: ${JSON.stringify(exhaustive)}.`);
    }
  }
}
