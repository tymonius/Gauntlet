import type {
  CardID,
  GameEvent,
  GameState,
  InquisitionPurgeMode,
  PlayerID,
} from '../types';
import type { UseInquisitionPurgeAction } from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';
import { spendFactionResource } from './resources';

export interface InquisitionPurgeOption {
  mode: InquisitionPurgeMode;
  cardId?: CardID;
  cost: number;
}

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

function privateLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'private',
    visibleTo: [actor],
  } satisfies GameEvent);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new GameActionError('Purge requires an opponent.');
  return opponent.id;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function purgesUsedThisTurn(game: GameState, playerId: PlayerID): number {
  const state = game.players[playerId].inquisition;
  if (!state || state.purgeUseTurn !== game.turn) return 0;
  return state.purgesUsedThisTurn ?? 0;
}

export function inquisitionPurgeCost(game: GameState, playerId: PlayerID): number | undefined {
  const player = game.players[playerId];
  if (!player?.inquisition || player.factionId !== 'inquisition') return undefined;
  const used = purgesUsedThisTurn(game, playerId);
  if (used === 0) return 1;
  if (used === 1 && player.leaderName === 'Grand Inquisitor') return 2;
  return undefined;
}

export function canUseInquisitionPurge(game: GameState, playerId: PlayerID): boolean {
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId) return false;
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return false;
  if (hasBlockingWindow(game)) return false;
  const cost = inquisitionPurgeCost(game, playerId);
  if (cost === undefined) return false;
  return (game.players[playerId].resources?.conviction?.value ?? 0) >= cost;
}

export function legalInquisitionPurgeOptions(game: GameState, playerId: PlayerID): InquisitionPurgeOption[] {
  if (!canUseInquisitionPurge(game, playerId)) return [];
  const cost = inquisitionPurgeCost(game, playerId)!;
  const opponent = game.players[opponentId(game, playerId)];
  const options: InquisitionPurgeOption[] = [];
  if (opponent.zones.discard.length > 0) options.push({ mode: 'remove_discard_top', cost });
  if (opponent.zones.hand.length > 0) options.push({ mode: 'random_hand_to_graveyard', cost });
  for (const cardId of opponent.zones.graveyard) {
    options.push({ mode: 'graveyard_to_deck_draw', cardId, cost });
  }
  return options;
}

function requireLegalOption(game: GameState, action: UseInquisitionPurgeAction): InquisitionPurgeOption {
  if (!canUseInquisitionPurge(game, action.playerId)) {
    throw new GameActionError(`${action.playerId} cannot use Purge now.`);
  }
  const option = legalInquisitionPurgeOptions(game, action.playerId).find((candidate) => (
    candidate.mode === action.mode
    && (candidate.mode !== 'graveyard_to_deck_draw' || candidate.cardId === action.cardId)
  ));
  if (!option) throw new GameActionError('Choose an available Purge effect and target.');
  return option;
}

function recordPurgeUse(game: GameState, playerId: PlayerID): void {
  const inquisition = game.players[playerId].inquisition!;
  if (inquisition.purgeUseTurn !== game.turn) {
    inquisition.purgeUseTurn = game.turn;
    inquisition.purgesUsedThisTurn = 0;
  }
  inquisition.purgesUsedThisTurn = (inquisition.purgesUsedThisTurn ?? 0) + 1;
}

function removeChosen(cards: CardID[], cardId: CardID): void {
  const index = cards.indexOf(cardId);
  if (index < 0) throw new GameActionError(`${cardId} is no longer available.`);
  cards.splice(index, 1);
}

export function useInquisitionPurge(
  game: GameState,
  action: UseInquisitionPurgeAction,
  random: () => number = Math.random,
): CardID {
  const option = requireLegalOption(game, action);
  const player = game.players[action.playerId];
  const opponent = game.players[opponentId(game, action.playerId)];
  spendFactionResource(game, action.playerId, 'conviction', option.cost, `Purge: ${action.mode}.`);

  let affectedCardId: CardID;
  if (action.mode === 'remove_discard_top') {
    affectedCardId = opponent.zones.discard.pop()!;
    opponent.zones.removed.push(affectedCardId);
    publicLog(
      game,
      action.playerId,
      'inquisition_purge_removed',
      `${player.name} removed the top card of ${opponent.name}'s Discard Pile from the game.`,
      { cardId: affectedCardId, cost: option.cost },
    );
  } else if (action.mode === 'random_hand_to_graveyard') {
    const index = Math.min(Math.floor(random() * opponent.zones.hand.length), opponent.zones.hand.length - 1);
    affectedCardId = opponent.zones.hand.splice(index, 1)[0];
    opponent.zones.graveyard.push(affectedCardId);
    publicLog(
      game,
      action.playerId,
      'inquisition_purge_random_hand',
      `${player.name} forced one random card from ${opponent.name}'s hand into the Graveyard.`,
      { cardId: affectedCardId, cost: option.cost },
    );
  } else {
    affectedCardId = action.cardId!;
    removeChosen(opponent.zones.graveyard, affectedCardId);
    opponent.zones.deck.push(affectedCardId);
    const draw = drawFromDeck(opponent, { count: 1 });
    opponent.zones.hand.push(...draw.drawnCards);
    publicLog(
      game,
      action.playerId,
      'inquisition_purge_recycled',
      `${player.name} moved one card from ${opponent.name}'s Graveyard beneath their Draw Pile, then ${opponent.name} drew one card.`,
      { cardId: affectedCardId, drawnCount: draw.drawnCards.length, cost: option.cost },
    );
    privateLog(
      game,
      opponent.id,
      'inquisition_purge_recycled_private',
      `You drew ${draw.drawnCards.join(', ') || 'no card'} after Purge.`,
      { drawnCards: draw.drawnCards },
    );
  }

  recordPurgeUse(game, action.playerId);
  return affectedCardId;
}
