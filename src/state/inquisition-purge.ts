import { v06CanonicalContent } from '../content';
import type {
  CardID,
  GameEvent,
  GameState,
  InquisitionPurgeMode,
  PlayerID,
} from '../types';
import type {
  ResolveInquisitionChoiceAction,
  UseInquisitionPurgeAction,
} from './actions';
import { GameActionError } from './reducer';
import { spendFactionResource } from './resources';

export interface InquisitionPurgeOption {
  mode: InquisitionPurgeMode;
  cost: 1 | 2 | 3 | 4;
  cardId?: CardID;
  cardIds?: CardID[];
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

function cardValue(cardId: CardID): number {
  return v06CanonicalContent.cardsById.get(cardId)?.cost ?? 0;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function canUseInquisitionPurge(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (!player?.inquisition || player.factionId !== 'inquisition') return false;
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId) return false;
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return false;
  if (hasBlockingWindow(game)) return false;
  if (player.actionsRemaining < 1 || player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) return false;
  return (player.resources?.conviction?.value ?? 0) > 0;
}

function discardSelections(cards: CardID[]): CardID[][] {
  const options: CardID[][] = [];
  for (let first = 0; first < cards.length; first += 1) {
    if (cardValue(cards[first]) <= 2) options.push([cards[first]]);
    for (let second = first + 1; second < cards.length; second += 1) {
      const selected = [cards[first], cards[second]];
      if (selected.reduce((sum, cardId) => sum + cardValue(cardId), 0) <= 2) options.push(selected);
    }
  }
  return options;
}

export function legalInquisitionPurgeOptions(game: GameState, playerId: PlayerID): InquisitionPurgeOption[] {
  if (!canUseInquisitionPurge(game, playerId)) return [];
  const conviction = game.players[playerId].resources?.conviction?.value ?? 0;
  const opponent = game.players[opponentId(game, playerId)];
  const options: InquisitionPurgeOption[] = [];

  if (conviction >= 1) {
    if (opponent.zones.discard.length > 0) {
      options.push({ mode: 'discard_top_to_graveyard', cost: 1 });
      options.push(...discardSelections(opponent.zones.discard).map((cardIds) => ({
        mode: 'discard_value_to_graveyard' as const,
        cost: 1 as const,
        cardIds,
      })));
    }
  }
  if (conviction >= 2) {
    options.push(...opponent.zones.assetBank.map((cardId) => ({
      mode: 'asset_to_graveyard' as const,
      cost: 2 as const,
      cardId,
    })));
  }
  if (conviction >= 3 && opponent.zones.hand.length > 0) {
    options.push({ mode: 'opponent_choose_hand_to_graveyard', cost: 3 });
  }
  if (conviction >= 4) {
    options.push(...opponent.zones.hand.map((cardId) => ({
      mode: 'choose_hand_to_graveyard' as const,
      cost: 4 as const,
      cardId,
    })));
  }
  return options;
}

function sameMultiset(left: readonly CardID[] | undefined, right: readonly CardID[] | undefined): boolean {
  if (!left || !right || left.length !== right.length) return false;
  const remaining = [...right];
  for (const cardId of left) {
    const index = remaining.indexOf(cardId);
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

function requireLegalOption(game: GameState, action: UseInquisitionPurgeAction): InquisitionPurgeOption {
  if (!canUseInquisitionPurge(game, action.playerId)) {
    throw new GameActionError(`${action.playerId} cannot use Purge now.`);
  }
  const option = legalInquisitionPurgeOptions(game, action.playerId).find((candidate) => (
    candidate.mode === action.mode
    && (candidate.cardId === undefined || candidate.cardId === action.cardId)
    && (candidate.cardIds === undefined || sameMultiset(candidate.cardIds, action.cardIds))
  ));
  if (!option) throw new GameActionError('Choose an available canonical Purge effect and target.');
  return option;
}

function consumeActionOpportunity(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
}

function removeSelections(cards: CardID[], selected: readonly CardID[]): void {
  for (const cardId of selected) {
    const index = cards.indexOf(cardId);
    if (index < 0) throw new GameActionError(`${cardId} is no longer available for Purge.`);
    cards.splice(index, 1);
  }
}

export function useInquisitionPurge(game: GameState, action: UseInquisitionPurgeAction): CardID[] {
  const option = requireLegalOption(game, action);
  const player = game.players[action.playerId];
  const opponent = game.players[opponentId(game, action.playerId)];
  spendFactionResource(game, action.playerId, 'conviction', option.cost, `Purge: ${action.mode}.`);
  consumeActionOpportunity(game, action.playerId);

  if (action.mode === 'discard_top_to_graveyard') {
    const cardId = opponent.zones.discard.shift()!;
    opponent.zones.graveyard.push(cardId);
    publicLog(game, action.playerId, 'inquisition_purge_discard_top', `${player.name} moved the top card of ${opponent.name}'s Discard Pile to the Graveyard.`, { cardId, cost: 1 });
    return [cardId];
  }

  if (action.mode === 'discard_value_to_graveyard') {
    const cardIds = [...(action.cardIds ?? [])];
    removeSelections(opponent.zones.discard, cardIds);
    opponent.zones.graveyard.push(...cardIds);
    publicLog(game, action.playerId, 'inquisition_purge_discard_value', `${player.name} moved ${cardIds.length} chosen card${cardIds.length === 1 ? '' : 's'} from ${opponent.name}'s Discard Pile to the Graveyard.`, { cardIds, totalValue: cardIds.reduce((sum, cardId) => sum + cardValue(cardId), 0), cost: 1 });
    return cardIds;
  }

  if (action.mode === 'asset_to_graveyard') {
    const cardId = action.cardId!;
    removeSelections(opponent.zones.assetBank, [cardId]);
    opponent.zones.graveyard.push(cardId);
    publicLog(game, action.playerId, 'inquisition_purge_asset', `${player.name} moved one of ${opponent.name}'s Assets to the Graveyard.`, { cardId, cost: 2 });
    return [cardId];
  }

  if (action.mode === 'opponent_choose_hand_to_graveyard') {
    game.pendingInquisitionChoice = {
      kind: 'purge_hand_choice',
      playerId: opponent.id,
      inquisitorId: action.playerId,
      handOptions: [...opponent.zones.hand],
      cost: 3,
      options: ['select'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = opponent.id;
    publicLog(game, action.playerId, 'inquisition_purge_hand_choice_opened', `${player.name} ordered ${opponent.name} to choose one card from hand for the Graveyard.`, { cost: 3 });
    return [];
  }

  const cardId = action.cardId!;
  removeSelections(opponent.zones.hand, [cardId]);
  opponent.zones.graveyard.push(cardId);
  publicLog(game, action.playerId, 'inquisition_purge_hand_selected', `${player.name} chose one card from ${opponent.name}'s hand for the Graveyard.`, { cardId, cost: 4 });
  privateLog(game, action.playerId, 'inquisition_purge_hand_selected_private', `You chose ${cardId} from ${opponent.name}'s hand.`, { cardId });
  return [cardId];
}

export function resolveInquisitionChoice(game: GameState, action: ResolveInquisitionChoiceAction): CardID {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'purge_hand_choice' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Inquisition choice.`);
  }
  if (!pending.handOptions.includes(action.cardId) || !game.players[action.playerId].zones.hand.includes(action.cardId)) {
    throw new GameActionError('Choose a card that remains in your hand for Purge.');
  }
  removeSelections(game.players[action.playerId].zones.hand, [action.cardId]);
  game.players[action.playerId].zones.graveyard.push(action.cardId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  publicLog(game, pending.inquisitorId, 'inquisition_purge_hand_choice_resolved', `${game.players[action.playerId].name} chose one card from hand for the Graveyard.`, { cardId: action.cardId, cost: 3 });
  privateLog(game, action.playerId, 'inquisition_purge_hand_choice_private', `You chose ${action.cardId} for Purge.`, { cardId: action.cardId });
  return action.cardId;
}
