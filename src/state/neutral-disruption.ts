import type { CardID, GameEvent, GameState, PlayerID } from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { GameActionError } from './reducer';

export const DISRUPTION = 'neutral-disruption';

export interface PreparedDisruptionAction {
  opponentId: PlayerID;
  discardedCardId: CardID;
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID | undefined {
  return Object.keys(game.players).find((candidate) => candidate !== playerId);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
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

export function canResolveDisruptionAction(game: GameState, playerId: PlayerID): boolean {
  const opponent = opponentId(game, playerId);
  return Boolean(opponent && game.players[opponent]?.zones.hand.length);
}

export function prepareDisruptionAction(
  game: GameState,
  action: PlayActionCardAction,
  random: () => number = Math.random,
): PreparedDisruptionAction {
  if (action.cardId !== DISRUPTION) throw new GameActionError('Disruption was not played.');
  const targetPlayerId = opponentId(game, action.playerId);
  if (!targetPlayerId) throw new GameActionError('Disruption requires an opponent.');
  const hand = game.players[targetPlayerId]?.zones.hand ?? [];
  if (hand.length === 0) throw new GameActionError('Disruption requires an opponent with at least one card in hand.');
  const index = Math.min(Math.floor(random() * hand.length), hand.length - 1);
  return { opponentId: targetPlayerId, discardedCardId: hand[index] };
}

export function applyDisruptionAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedDisruptionAction,
): void {
  const opponent = game.players[prepared.opponentId];
  if (!opponent || !removeOne(opponent.zones.hand, prepared.discardedCardId)) {
    throw new GameActionError('The randomly selected Disruption card is no longer in the opponent’s hand.');
  }
  opponent.zones.discard.push(prepared.discardedCardId);
  appendPublicLog(
    game,
    playerId,
    'neutral_disruption_action',
    `${game.players[playerId].name} used Disruption; ${opponent.name} discarded ${prepared.discardedCardId} at random.`,
    { opponentId: opponent.id, cardId: prepared.discardedCardId },
  );
}
