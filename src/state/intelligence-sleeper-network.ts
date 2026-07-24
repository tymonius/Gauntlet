import { getCardPlayRule } from '../cards';
import type {
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SleeperNetworkState,
} from '../types';
import type { ActionCardTarget, ResolveIntelligenceChoiceAction } from './actions';

export const SLEEPER_NETWORK = 'intelligence-sleeper-network';

export class SleeperNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SleeperNetworkError';
  }
}

export interface SleeperNetworkResolution {
  kind: 'none' | 'end_turn' | 'play_card';
  cardId?: CardID;
  targets?: ActionCardTarget[];
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function network(game: GameState, playerId: PlayerID): SleeperNetworkState | undefined {
  return game.players[playerId]?.intelligence?.sleeperNetwork;
}

function requireNetwork(game: GameState, playerId: PlayerID): SleeperNetworkState {
  const state = network(game, playerId);
  if (!state) throw new SleeperNetworkError(`${playerId} has no Sleeper Network.`);
  return state;
}

function capacity(game: GameState, playerId: PlayerID): number {
  return game.players[playerId].controlledTerritories.length;
}

function hasPendingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function actionCanResolve(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (cardId === SLEEPER_NETWORK) return false;
  const rule = getCardPlayRule(cardId);
  if (!rule?.timings.includes('action') || !rule.allowedOrigins.includes('hand')) return false;
  if (cardId === 'intelligence-operational-reassessment') {
    return Boolean(game.players[playerId].intelligence?.activeMission);
  }
  return true;
}

export function legalSleeperNetworkActionCards(game: GameState, playerId: PlayerID): CardID[] {
  const state = network(game, playerId);
  if (!state) return [];
  return [...new Set(state.cards.filter((cardId) => actionCanResolve(game, playerId, cardId)))];
}

export function canResolveSleeperNetworkAction(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  return Boolean(
    player?.factionId === 'intelligence'
    && player.intelligence
    && !player.intelligence.sleeperNetwork
    && player.zones.hand.length >= 2,
  );
}

export function beginSleeperNetwork(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (!player?.intelligence || player.factionId !== 'intelligence') {
    throw new SleeperNetworkError(`${playerId} is not an Intelligence player.`);
  }
  if (player.intelligence.sleeperNetwork) throw new SleeperNetworkError('A Sleeper Network is already in play.');
  if (!player.zones.assetBank.includes(SLEEPER_NETWORK)) {
    throw new SleeperNetworkError('Sleeper Network was not banked by the Action play.');
  }
  if (player.zones.hand.length < 1) throw new SleeperNetworkError('Sleeper Network requires one other card from hand.');

  player.intelligence.sleeperNetwork = { cards: [], bankedTurn: game.turn };
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_initial_card',
    playerId,
    eligibleCardIds: [...new Set(player.zones.hand)],
    options: ['select'],
  };
  game.priorityPlayer = playerId;
  publicLog(game, playerId, 'intelligence_sleeper_network_banked', `${player.name} banked Sleeper Network with one hidden card.`);
}

function attachFromHand(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = game.players[playerId];
  const state = requireNetwork(game, playerId);
  if (!removeOne(player.zones.hand, cardId)) throw new SleeperNetworkError(`${cardId} is no longer in hand.`);
  state.cards.push(cardId);
  privateLog(game, playerId, 'intelligence_sleeper_network_card_added', `You placed ${cardId} face down beneath Sleeper Network.`, { cardId });
  publicLog(game, playerId, 'intelligence_sleeper_network_loaded', `${player.name} placed a card face down beneath Sleeper Network.`, { cardCount: state.cards.length });
}

export function maybeOpenSleeperNetworkEndTurnWindow(game: GameState, playerId: PlayerID): boolean {
  if (hasPendingWindow(game) || game.activePlayer !== playerId) return false;
  const state = network(game, playerId);
  const player = game.players[playerId];
  if (!state || state.activation || state.bankedTurn >= game.turn || state.endOfferTurn === game.turn) return false;
  state.endOfferTurn = game.turn;
  if (state.cards.length >= capacity(game, playerId) || player.zones.hand.length === 0) return false;
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_add_card',
    playerId,
    eligibleCardIds: [...new Set(player.zones.hand)],
    options: ['pass', 'select'],
  };
  game.priorityPlayer = playerId;
  return true;
}

export function maybeOpenSleeperNetworkStartTurnWindow(game: GameState): boolean {
  if (game.phase !== 'turn_start' || hasPendingWindow(game)) return false;
  const playerId = game.activePlayer;
  const state = network(game, playerId);
  if (!state || state.activation || state.bankedTurn >= game.turn || state.startOfferTurn === game.turn) return false;
  if (!game.players[playerId].zones.assetBank.includes(SLEEPER_NETWORK)) return false;
  state.startOfferTurn = game.turn;
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_activate',
    playerId,
    options: ['pass', 'activate'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function openCapacityChoice(game: GameState, playerId: PlayerID): boolean {
  const state = network(game, playerId);
  if (!state || state.activation || hasPendingWindow(game)) return false;
  const discardCount = Math.max(state.cards.length - capacity(game, playerId), 0);
  if (discardCount === 0) return false;
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_capacity',
    playerId,
    discardCount,
    cardOptions: [...new Set(state.cards)],
    options: ['select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function discardAttachments(game: GameState, playerId: PlayerID, cardIds: CardID[], reason: string): void {
  if (cardIds.length === 0) return;
  game.players[playerId].zones.discard.push(...cardIds);
  privateLog(game, playerId, 'intelligence_sleeper_network_cards_discarded', `You discarded ${cardIds.join(', ')} from beneath Sleeper Network.`, { cardIds, reason });
  publicLog(game, playerId, 'intelligence_sleeper_network_cards_cleared', `${game.players[playerId].name} discarded ${cardIds.length} card${cardIds.length === 1 ? '' : 's'} from beneath Sleeper Network.`, { count: cardIds.length, reason });
}

function moveNetworkCard(game: GameState, playerId: PlayerID, destination: 'discard' | 'graveyard' | 'removed'): void {
  const player = game.players[playerId];
  removeOne(player.zones.assetBank, SLEEPER_NETWORK);
  player.zones[destination].push(SLEEPER_NETWORK);
}

function finishNetwork(game: GameState, playerId: PlayerID, reason: string): void {
  const player = game.players[playerId];
  const state = player.intelligence?.sleeperNetwork;
  if (!state) return;
  discardAttachments(game, playerId, [...state.cards], reason);
  const resume = state.activation?.resumePriorityPlayer;
  player.intelligence!.sleeperNetwork = undefined;
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resume ?? game.activePlayer;
}

function openActivationPlayChoice(game: GameState, playerId: PlayerID): boolean {
  const state = requireNetwork(game, playerId);
  const eligibleCardIds = legalSleeperNetworkActionCards(game, playerId);
  if (eligibleCardIds.length === 0) {
    finishNetwork(game, playerId, 'no_legal_action_cards');
    return false;
  }
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_play_card',
    playerId,
    eligibleCardIds,
    options: ['select'],
    resumePriorityPlayer: state.activation?.resumePriorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function beginActivation(game: GameState, playerId: PlayerID, resumePriorityPlayer?: PlayerID): void {
  const state = requireNetwork(game, playerId);
  moveNetworkCard(game, playerId, 'graveyard');
  state.activation = { mode: 'activate', resumePriorityPlayer };
  game.pendingIntelligenceChoice = undefined;
  publicLog(game, playerId, 'intelligence_sleeper_network_activated', `${game.players[playerId].name} put Sleeper Network in the Graveyard and revealed the cards beneath it.`, { cardCount: state.cards.length });
  openActivationPlayChoice(game, playerId);
}

export function beginCompromisedSleeperNetwork(
  game: GameState,
  playerId: PlayerID,
  opposingActorId: PlayerID,
  removalDestination: 'discard' | 'graveyard' | 'removed' = 'discard',
): boolean {
  if (hasPendingWindow(game)) return false;
  const state = network(game, playerId);
  if (!state || state.activation || !game.players[playerId].zones.assetBank.includes(SLEEPER_NETWORK)) return false;
  const eligibleCardIds = legalSleeperNetworkActionCards(game, playerId);
  state.activation = {
    mode: 'compromised',
    opposingActorId,
    removalDestination,
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_compromised',
    playerId,
    opposingActorId,
    eligibleCardIds,
    removalDestination,
    options: ['pass', 'select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  publicLog(game, opposingActorId, 'intelligence_sleeper_network_compromised', `${game.players[playerId].name}'s Sleeper Network was compromised by an opposing effect.`);
  return true;
}

function finalizeCompromised(game: GameState, playerId: PlayerID): void {
  const state = requireNetwork(game, playerId);
  const destination = state.activation?.removalDestination ?? 'discard';
  moveNetworkCard(game, playerId, destination);
  finishNetwork(game, playerId, 'compromised');
}

export function continueSleeperNetworkActivation(game: GameState, playerId: PlayerID): boolean {
  if (hasPendingWindow(game)) return false;
  const state = network(game, playerId);
  if (!state?.activation) return false;
  if (state.activation.mode === 'compromised') {
    finalizeCompromised(game, playerId);
    return false;
  }
  return openActivationPlayChoice(game, playerId);
}

export function reconcileSleeperNetworks(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const state = player.intelligence?.sleeperNetwork;
    if (!state) continue;
    if (!state.activation && !player.zones.assetBank.includes(SLEEPER_NETWORK)) {
      finishNetwork(game, player.id, 'network_left_play');
      continue;
    }
  }
  if (!hasPendingWindow(game)) {
    for (const player of Object.values(game.players)) {
      if (openCapacityChoice(game, player.id)) return;
    }
  }
}

export function isSleeperNetworkChoice(kind?: string): boolean {
  return kind === 'sleeper_network_initial_card'
    || kind === 'sleeper_network_add_card'
    || kind === 'sleeper_network_capacity'
    || kind === 'sleeper_network_activate'
    || kind === 'sleeper_network_play_card'
    || kind === 'sleeper_network_compromised';
}

export function resolveSleeperNetworkChoice(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): SleeperNetworkResolution {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== action.playerId || !isSleeperNetworkChoice(pending.kind)) {
    throw new SleeperNetworkError(`${action.playerId} has no pending Sleeper Network choice.`);
  }

  if (pending.kind === 'sleeper_network_initial_card') {
    if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose one card from hand to place beneath Sleeper Network.');
    attachFromHand(game, action.playerId, action.cardId);
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = game.activePlayer;
    return { kind: 'none' };
  }

  if (pending.kind === 'sleeper_network_add_card') {
    game.pendingIntelligenceChoice = undefined;
    if (action.choice === 'select') {
      if (!action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose an eligible card from hand.');
      attachFromHand(game, action.playerId, action.cardId);
    } else if (action.choice !== 'pass') throw new SleeperNetworkError('Choose whether to add a card to Sleeper Network.');
    return { kind: 'end_turn' };
  }

  if (pending.kind === 'sleeper_network_capacity') {
    if (action.choice !== 'select' || !action.cardId || !pending.cardOptions.includes(action.cardId)) throw new SleeperNetworkError('Choose a card beneath Sleeper Network to discard.');
    const state = requireNetwork(game, action.playerId);
    if (!removeOne(state.cards, action.cardId)) throw new SleeperNetworkError('That card is no longer beneath Sleeper Network.');
    game.players[action.playerId].zones.discard.push(action.cardId);
    privateLog(game, action.playerId, 'intelligence_sleeper_network_capacity_discard', `You discarded ${action.cardId} to restore Sleeper Network capacity.`, { cardId: action.cardId });
    game.pendingIntelligenceChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    return { kind: 'none' };
  }

  if (pending.kind === 'sleeper_network_activate') {
    if (action.choice === 'pass') {
      game.pendingIntelligenceChoice = undefined;
      game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
      return { kind: 'none' };
    }
    if (action.choice !== 'activate') throw new SleeperNetworkError('Choose whether to activate Sleeper Network.');
    beginActivation(game, action.playerId, pending.resumePriorityPlayer);
    return { kind: 'none' };
  }

  if (pending.kind === 'sleeper_network_play_card') {
    if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose a legally resolvable Action card beneath Sleeper Network.');
    const state = requireNetwork(game, action.playerId);
    if (!removeOne(state.cards, action.cardId)) throw new SleeperNetworkError('That card is no longer beneath Sleeper Network.');
    game.pendingIntelligenceChoice = undefined;
    return { kind: 'play_card', cardId: action.cardId, targets: action.targets };
  }

  if (pending.kind === 'sleeper_network_compromised') {
    if (action.choice === 'pass') {
      game.pendingIntelligenceChoice = undefined;
      finalizeCompromised(game, action.playerId);
      return { kind: 'none' };
    }
    if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) throw new SleeperNetworkError('Choose one legally resolvable Action card beneath the compromised Sleeper Network or pass.');
    const state = requireNetwork(game, action.playerId);
    if (!removeOne(state.cards, action.cardId)) throw new SleeperNetworkError('That card is no longer beneath Sleeper Network.');
    game.pendingIntelligenceChoice = undefined;
    return { kind: 'play_card', cardId: action.cardId, targets: action.targets };
  }

  throw new SleeperNetworkError('Unhandled Sleeper Network choice.');
}
