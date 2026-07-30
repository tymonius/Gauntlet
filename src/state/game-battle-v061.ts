import { v061CanonicalContent } from '../content';
import type {
  CardID,
  GameState,
  PlayerID,
  PlayerState,
  V061BattleCard,
  V061GameBattleState,
} from '../types';
import { drawFromDeck } from './draw';
import {
  applyV061BattleProcedureAction,
  createV061BattleProcedureState,
  type CreateV061BattleProcedureOptions,
  type V061BattleProcedureAction,
  V061BattleProcedureError,
} from './battle-v061-procedure';
import { normalV061BattleDestination } from './battle-v061';

export class V061GameBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V061GameBattleError';
  }
}

export type V061GameBattleAction =
  | Exclude<V061BattleProcedureAction, { type: 'form_reserve' }>
  | { type: 'form_reserve'; playerId: PlayerID; random?: () => number }
  | { type: 'complete_aftermath_cleanup' };

function cloneGame(game: GameState): GameState {
  return structuredClone(game);
}

function requireV061Game(game: GameState): void {
  if (game.version !== 'v0.6.1') {
    throw new V061GameBattleError(`v0.6.1 battle actions cannot be used in ${game.version}.`);
  }
}

function requirePlayer(game: GameState, playerId: PlayerID): PlayerState {
  const player = game.players[playerId];
  if (!player) throw new V061GameBattleError(`Unknown player: ${playerId}.`);
  return player;
}

function requireBattle(game: GameState): V061GameBattleState {
  if (!game.battleV061) throw new V061GameBattleError('There is no active v0.6.1 battle.');
  return game.battleV061;
}

function appendPublicLog(
  game: GameState,
  actor: PlayerID | undefined,
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
  });
}

function removeOne(cards: CardID[], cardId: CardID): void {
  const index = cards.indexOf(cardId);
  if (index < 0) throw new V061GameBattleError(`${cardId} is not available in the required zone.`);
  cards.splice(index, 1);
}

export function v061CardEligibleForRole(cardId: CardID, role: 'gambit' | 'tactic'): boolean {
  const card = v061CanonicalContent.cardsById.get(cardId);
  if (!card) return false;
  const allowedLabels = role === 'gambit' ? new Set(['Gambit', 'Battle']) : new Set(['Tactic', 'Battle']);
  return card.effects.some((effect) => allowedLabels.has(effect.label));
}

export function beginV061GameBattle(
  game: GameState,
  options: CreateV061BattleProcedureOptions,
): GameState {
  const next = cloneGame(game);
  requireV061Game(next);
  if (next.battle || next.battleV061) throw new V061GameBattleError('A battle is already active.');
  requirePlayer(next, options.attacker);
  requirePlayer(next, options.defender);
  if (options.attacker === options.defender) throw new V061GameBattleError('A player cannot battle themself.');

  next.battleV061 = createV061BattleProcedureState(options);
  next.phase = 'battle';
  next.priorityPlayer = undefined;
  appendPublicLog(next, options.attacker, 'v061_battle_started', `${options.attacker} initiated a battle against ${options.defender}.`, {
    battleId: options.id,
    location: options.location,
    attackerOrigin: options.attackerOrigin,
  });
  return next;
}

function applyProcedureAction(
  game: GameState,
  action: V061BattleProcedureAction,
): void {
  const battle = requireBattle(game);
  game.battleV061 = applyV061BattleProcedureAction(battle, action);
  game.priorityPlayer = game.battleV061.priorityPlayer;
}

function setGambitFromHand(
  game: GameState,
  action: Extract<V061BattleProcedureAction, { type: 'set_gambit' }>,
): void {
  if (!v061CardEligibleForRole(action.cardId, 'gambit')) {
    throw new V061GameBattleError(`${action.cardId} is not eligible as a Gambit.`);
  }
  const player = requirePlayer(game, action.playerId);
  if (!player.zones.hand.includes(action.cardId)) {
    throw new V061GameBattleError(`${action.cardId} is not in ${action.playerId}'s Hand.`);
  }

  applyProcedureAction(game, action);
  removeOne(player.zones.hand, action.cardId);
  appendPublicLog(game, action.playerId, 'v061_gambit_set', `${action.playerId} set a Gambit.`, {
    battleId: requireBattle(game).id,
    faceUp: Boolean(action.faceUp),
  });
}

function formReserveFromDeck(
  game: GameState,
  action: Extract<V061GameBattleAction, { type: 'form_reserve' }>,
): void {
  const battle = requireBattle(game);
  if (battle.stage !== 'form_reserves') {
    throw new V061GameBattleError(`A Reserve cannot be formed during ${battle.stage}.`);
  }
  const participant = battle.attacker.playerId === action.playerId
    ? battle.attacker
    : battle.defender.playerId === action.playerId
      ? battle.defender
      : undefined;
  if (!participant) throw new V061GameBattleError(`${action.playerId} is not in the active battle.`);
  if (participant.reserveFormed) throw new V061GameBattleError(`${action.playerId} already formed a Reserve.`);

  const player = requirePlayer(game, action.playerId);
  const result = drawFromDeck(player, {
    count: participant.reserveSize,
    random: action.random,
  });
  applyProcedureAction(game, {
    type: 'form_reserve',
    playerId: action.playerId,
    cardIds: result.drawnCards,
  });
  appendPublicLog(game, action.playerId, 'v061_reserve_formed', `${action.playerId} formed a Reserve of ${result.drawnCards.length} cards.`, {
    battleId: requireBattle(game).id,
    count: result.drawnCards.length,
    reshuffled: result.reshuffled,
    exhausted: result.exhausted,
  });
}

function chooseTacticsFromReserve(
  game: GameState,
  action: Extract<V061BattleProcedureAction, { type: 'choose_tactics' }>,
): void {
  for (const cardId of action.cardIds) {
    if (!v061CardEligibleForRole(cardId, 'tactic')) {
      throw new V061GameBattleError(`${cardId} is not eligible as a Tactic.`);
    }
  }
  applyProcedureAction(game, action);
  appendPublicLog(game, action.playerId, 'v061_tactics_chosen', `${action.playerId} chose ${action.cardIds.length} Tactic${action.cardIds.length === 1 ? '' : 's'}.`, {
    battleId: requireBattle(game).id,
    count: action.cardIds.length,
    faceUp: Boolean(action.faceUp),
  });
}

function pushBattleCardToDestination(player: PlayerState, card: V061BattleCard): void {
  const destination = normalV061BattleDestination(card);
  switch (destination) {
    case 'discard':
      player.zones.discard.push(card.cardId);
      return;
    case 'graveyard':
      player.zones.graveyard.push(card.cardId);
      return;
    case 'hand':
      player.zones.hand.push(card.cardId);
      return;
    case 'removed':
      player.zones.removed.push(card.cardId);
      return;
    case 'reserve':
      throw new V061GameBattleError('A card cannot remain in Reserve after battle cleanup.');
  }
}

function cleanupParticipant(game: GameState, playerId: PlayerID): void {
  const battle = requireBattle(game);
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  const player = requirePlayer(game, playerId);

  if (participant.gambit && !participant.gambit.virtual) {
    pushBattleCardToDestination(player, participant.gambit);
  }
  for (const tactic of participant.tactics) {
    if (!tactic.virtual) pushBattleCardToDestination(player, tactic);
  }
  player.zones.discard.push(...participant.reserve);
}

function completeAftermathCleanup(game: GameState): void {
  const battle = requireBattle(game);
  if (battle.stage !== 'aftermath') {
    throw new V061GameBattleError(`Battle cleanup requires the Aftermath; battle is in ${battle.stage}.`);
  }
  const battleId = battle.id;
  cleanupParticipant(game, battle.attacker.playerId);
  cleanupParticipant(game, battle.defender.playerId);
  delete game.battleV061;
  game.phase = 'action_after_movement';
  game.priorityPlayer = game.activePlayer;
  appendPublicLog(game, undefined, 'v061_battle_cleanup_complete', `Battle ${battleId} completed its normal card destinations.`, {
    battleId,
  });
}

export function applyV061GameBattleAction(
  game: GameState,
  action: V061GameBattleAction,
): GameState {
  const next = cloneGame(game);
  requireV061Game(next);
  requireBattle(next);

  try {
    switch (action.type) {
      case 'set_gambit':
        setGambitFromHand(next, action);
        break;
      case 'form_reserve':
        formReserveFromDeck(next, action);
        break;
      case 'choose_tactics':
        chooseTacticsFromReserve(next, action);
        break;
      case 'complete_aftermath_cleanup':
        completeAftermathCleanup(next);
        break;
      default:
        applyProcedureAction(next, action);
        break;
    }
  } catch (error) {
    if (error instanceof V061GameBattleError) throw error;
    if (error instanceof V061BattleProcedureError) {
      throw new V061GameBattleError(error.message);
    }
    throw error;
  }

  return next;
}
