import type {
  BattleParticipantState,
  BattlePlayedCard,
  BoardSpaceState,
  GameEvent,
  GamePhase,
  GameState,
  PlayerID,
  SpaceID,
} from '../types';
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

function createBattleParticipant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    battleDraw: [],
    battleDrawPlayed: [],
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function getBattleParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  if (!game.battle) throw new GameActionError('There is no active battle.');
  if (game.battle.attacker.playerId === playerId) return game.battle.attacker;
  if (game.battle.defender.playerId === playerId) return game.battle.defender;
  throw new GameActionError(`${playerId} is not a participant in this battle.`);
}

function bothParticipants(
  game: GameState,
  predicate: (participant: BattleParticipantState) => boolean,
): boolean {
  if (!game.battle) return false;
  return predicate(game.battle.attacker) && predicate(game.battle.defender);
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
    const defenderId = destination.occupant;
    player.movementRemaining -= 1;
    game.phase = 'battle';
    game.priorityPlayer = action.playerId;
    game.battle = {
      id: `${game.id}-battle-${game.turn}`,
      stage: 'hand_commit',
      location: destination.id,
      attacker: createBattleParticipant(action.playerId),
      defender: createBattleParticipant(defenderId),
      effectsResolved: [],
    };

    appendPublicLog(game, action.playerId, 'battle_started', `${player.name} started a battle.`, {
      fromSpaceId: origin.id,
      toSpaceId: destination.id,
      defender: defenderId,
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

function commitBattleHandCard(game: GameState, action: Extract<GameAction, { type: 'commit_battle_hand_card' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'hand_commit') {
    throw new GameActionError('Battle hand commitments are not currently open.');
  }

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);

  if (participant.handCommit) throw new GameActionError(`${player.name} has already committed a hand card.`);
  if (!player.zones.hand.includes(action.cardId)) throw new GameActionError(`${player.name} does not have that card in hand.`);

  player.zones.hand = player.zones.hand.filter((cardId) => cardId !== action.cardId);
  participant.handCommit = {
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'hand',
    faceDown: true,
    canceled: false,
  };
  player.hasPlayedBattleThisTurn = true;

  appendPublicLog(game, action.playerId, 'commit_battle_hand_card', `${player.name} committed a card from hand face down.`);

  if (bothParticipants(game, (candidate) => candidate.handCommit !== undefined)) {
    game.battle.stage = 'battle_draw';
  }

  return { state: game };
}

function passBattleHandCommit(game: GameState, action: Extract<GameAction, { type: 'pass_battle_hand_commit' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'hand_commit') {
    throw new GameActionError('Battle hand commitments are not currently open.');
  }

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);

  if (participant.handCommit) throw new GameActionError(`${player.name} has already committed a hand card.`);

  participant.handCommit = {
    cardId: '__pass__',
    owner: action.playerId,
    origin: 'hand',
    faceDown: false,
    canceled: true,
  };

  appendPublicLog(game, action.playerId, 'pass_battle_hand_commit', `${player.name} passed their hand commitment.`);

  if (bothParticipants(game, (candidate) => candidate.handCommit !== undefined)) {
    game.battle.stage = 'battle_draw';
  }

  return { state: game };
}

function drawBattleCards(game: GameState, action: Extract<GameAction, { type: 'draw_battle_cards' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'battle_draw') {
    throw new GameActionError('Battle draw is not currently open.');
  }

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  const count = action.count ?? 3;

  if (!Number.isInteger(count) || count < 1) throw new GameActionError('Battle draw count must be a positive integer.');
  if (participant.battleDraw.length > 0) throw new GameActionError(`${player.name} has already drawn battle cards.`);

  const battleDrawnCards = player.zones.deck.slice(0, count);
  player.zones.deck = player.zones.deck.slice(battleDrawnCards.length);
  participant.battleDraw = battleDrawnCards;

  appendPublicLog(game, action.playerId, 'draw_battle_cards', `${player.name} drew ${battleDrawnCards.length} battle card${battleDrawnCards.length === 1 ? '' : 's'}.`, {
    count: battleDrawnCards.length,
  });

  if (bothParticipants(game, (candidate) => candidate.battleDraw.length > 0)) {
    game.battle.stage = 'battle_play_selection';
  }

  return { state: game, result: { battleDrawnCards } };
}

function playBattleDrawCard(game: GameState, action: Extract<GameAction, { type: 'play_battle_draw_card' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'battle_play_selection') {
    throw new GameActionError('Battle draw card selection is not currently open.');
  }

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);

  if (participant.battleDrawPlayed.length > 0) throw new GameActionError(`${player.name} has already played a battle-draw card.`);
  if (!participant.battleDraw.includes(action.cardId)) throw new GameActionError(`${player.name} did not draw that battle card.`);

  participant.battleDraw = participant.battleDraw.filter((cardId) => cardId !== action.cardId);
  participant.battleDrawPlayed.push({
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'battle_draw',
    faceDown: true,
    canceled: false,
  });
  player.hasPlayedBattleThisTurn = true;

  appendPublicLog(game, action.playerId, 'play_battle_draw_card', `${player.name} selected a battle-draw card face down.`);

  if (bothParticipants(game, (candidate) => candidate.battleDrawPlayed.length > 0)) {
    for (const side of [game.battle.attacker, game.battle.defender]) {
      if (side.handCommit && side.handCommit.cardId !== '__pass__') side.handCommit.faceDown = false;
      side.battleDrawPlayed = side.battleDrawPlayed.map((played): BattlePlayedCard => ({ ...played, faceDown: false }));
    }
    game.battle.stage = 'dice';
    appendPublicLog(game, undefined, 'battle_cards_revealed', 'Battle cards were revealed.');
  }

  return { state: game };
}

function rollBattleDie(game: GameState, action: Extract<GameAction, { type: 'roll_battle_die' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'dice') throw new GameActionError('Battle dice are not currently open.');

  const player = requirePlayer(game, action.playerId);
  const participant = getBattleParticipant(game, action.playerId);
  const value = action.value ?? Math.floor(Math.random() * 6) + 1;

  if (!Number.isInteger(value) || value < 1 || value > 6) throw new GameActionError('Battle die value must be an integer from 1 to 6.');
  if (participant.diceRoll !== undefined) throw new GameActionError(`${player.name} has already rolled.`);

  participant.diceRoll = value;
  appendPublicLog(game, action.playerId, 'roll_battle_die', `${player.name} rolled a ${value}.`, { value });

  if (bothParticipants(game, (candidate) => candidate.diceRoll !== undefined)) {
    game.battle.stage = 'resolution';
  }

  return { state: game };
}

function resolveBattle(game: GameState, action: Extract<GameAction, { type: 'resolve_battle' }>): ApplyGameActionResult {
  phaseAllowsAction(game, ['battle']);
  if (!game.battle || game.battle.stage !== 'resolution') throw new GameActionError('Battle is not ready to resolve.');

  const battle = game.battle;
  if (action.playerId !== battle.attacker.playerId && action.playerId !== battle.defender.playerId) {
    throw new GameActionError(`${action.playerId} cannot resolve a battle they are not in.`);
  }

  const attackerTotal = (battle.attacker.diceRoll ?? 0) + battle.attacker.modifiers;
  const defenderTotal = (battle.defender.diceRoll ?? 0) + battle.defender.modifiers;
  const winner = attackerTotal >= defenderTotal ? battle.attacker.playerId : battle.defender.playerId;
  const loser = winner === battle.attacker.playerId ? battle.defender.playerId : battle.attacker.playerId;
  const location = findSpace(game, battle.location);
  const winnerState = requirePlayer(game, winner);
  const loserState = requirePlayer(game, loser);
  const attackerOrigin = game.board.spaces.find((space) => space.occupant === battle.attacker.playerId);

  battle.winner = winner;
  battle.loser = loser;

  if (winner === battle.attacker.playerId) {
    if (attackerOrigin) attackerOrigin.occupant = undefined;
    location.occupant = winner;
    winnerState.occupiedSpaceId = location.id;
    loserState.occupiedSpaceId = undefined;
    location.capturePendingBy = winner;
  }

  for (const participant of [battle.attacker, battle.defender]) {
    const player = requirePlayer(game, participant.playerId);
    if (participant.handCommit && participant.handCommit.cardId !== '__pass__') {
      player.zones.graveyard.push(participant.handCommit.cardId);
    }
    player.zones.discard.push(...participant.battleDrawPlayed.map((played) => played.cardId));
    player.zones.discard.push(...participant.battleDraw);
  }

  appendPublicLog(game, winner, 'battle_resolved', `${winnerState.name} won the battle.`, {
    winner,
    loser,
    attackerTotal,
    defenderTotal,
  });

  game.battle = undefined;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;

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
    case 'commit_battle_hand_card':
      return commitBattleHandCard(next, action);
    case 'pass_battle_hand_commit':
      return passBattleHandCommit(next, action);
    case 'draw_battle_cards':
      return drawBattleCards(next, action);
    case 'play_battle_draw_card':
      return playBattleDrawCard(next, action);
    case 'roll_battle_die':
      return rollBattleDie(next, action);
    case 'resolve_battle':
      return resolveBattle(next, action);
    case 'end_turn':
      return endTurn(next, action);
    default: {
      const exhaustive: never = action;
      throw new GameActionError(`Unhandled action: ${JSON.stringify(exhaustive)}.`);
    }
  }
}
