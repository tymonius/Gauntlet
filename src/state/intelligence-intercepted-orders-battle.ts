import { cardCanBePlayedAt } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import {
  availableBattleHandCards,
  blockBattleHandCard,
  removeAvailableBattleHandCard,
} from './battle-hand-restrictions';
import { markBattleCardsObservedBeforeNormalReveal } from './battle-observation';
import { recordFaceDownCardObservedBeforeReveal } from './intelligence-mission-triggers';

const INTERCEPTED_ORDERS = 'intelligence-intercepted-orders';

export class InterceptedOrdersBattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterceptedOrdersBattleError';
  }
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

function privateLog(
  game: GameState,
  visibleTo: PlayerID[],
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
    visibility: 'private',
    visibleTo,
  } satisfies GameEvent);
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function used(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled);
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new InterceptedOrdersBattleError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new InterceptedOrdersBattleError(`${playerId} is not participating in this battle.`);
}

function opponentParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new InterceptedOrdersBattleError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function selectedBattleHandCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return participant.battleDrawPlayed.filter((card) => used(card) && card.origin === 'battle_draw');
}

export function resolveInterceptedOrdersPreRevealCard(
  game: GameState,
  participant: BattleParticipantState,
  card: BattlePlayedCard,
): boolean {
  const battle = game.battle;
  if (!battle || game.pendingIntelligenceChoice) return false;
  if (!active(card)
    || card.cardId !== INTERCEPTED_ORDERS
    || card.earlyEffectResolved) return false;

  card.faceDown = false;
  card.earlyEffectResolved = true;
  publicLog(
    game,
    participant.playerId,
    'intelligence_intercepted_orders_revealed_early',
    `${game.players[participant.playerId].name} revealed Intercepted Orders before the normal battle reveal.`,
  );

  const opponent = opponentParticipant(game, participant.playerId);
  const selectedCards = selectedBattleHandCards(opponent);
  const unselectedCards = [...opponent.battleDraw];
  if (selectedCards.length === 0 && unselectedCards.length === 0) return false;

  const selectedCardIds = selectedCards.map((candidate) => candidate.cardId);
  markBattleCardsObservedBeforeNormalReveal(game, opponent.playerId, selectedCardIds);
  if (selectedCardIds.length > 0) {
    recordFaceDownCardObservedBeforeReveal(game, participant.playerId, battle.id, 'Intercepted Orders');
  }
  privateLog(
    game,
    [participant.playerId],
    participant.playerId,
    'intelligence_intercepted_orders_battle_hand_inspected',
    `You inspected ${game.players[opponent.playerId].name}'s Battle Hand.`,
    { selectedCardIds, unselectedCardIds: unselectedCards },
  );

  game.pendingIntelligenceChoice = {
    kind: 'intercepted_orders_battle_select',
    playerId: participant.playerId,
    opponentId: opponent.playerId,
    battleId: battle.id,
    selectedCardIds,
    unselectedCardIds: unselectedCards,
    options: ['select_selected', 'select_unselected'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = participant.playerId;
  return true;
}

function legalReplacementCards(
  game: GameState,
  participant: BattleParticipantState,
): CardID[] {
  const battle = game.battle!;
  return availableBattleHandCards(battle, participant)
    .filter((cardId) => cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw'));
}

function clearPending(game: GameState, resumePriorityPlayer?: PlayerID): void {
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
}

export function resolveInterceptedOrdersBattleSelection(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'intercepted_orders_battle_select' || pending.playerId !== action.playerId) {
    throw new InterceptedOrdersBattleError(`${action.playerId} has no pending Intercepted Orders Battle choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new InterceptedOrdersBattleError('The Intercepted Orders choice no longer matches the active battle.');
  }
  if (!action.cardId) throw new InterceptedOrdersBattleError('Choose one card from the inspected Battle Hand.');

  const opponent = participantFor(game, pending.opponentId);
  let selectedWasInBattle = false;
  if (action.choice === 'select_selected') {
    if (!pending.selectedCardIds.includes(action.cardId)) {
      throw new InterceptedOrdersBattleError('Choose one of the selected Battle Hand cards.');
    }
    const index = opponent.battleDrawPlayed.findIndex((candidate) => (
      used(candidate)
      && candidate.origin === 'battle_draw'
      && candidate.cardId === action.cardId
    ));
    if (index < 0) throw new InterceptedOrdersBattleError('That selected card is no longer in the battle.');
    const [returned] = opponent.battleDrawPlayed.splice(index, 1);
    opponent.battleDraw.unshift(returned.cardId);
    blockBattleHandCard(battle, opponent.playerId, returned.cardId);
    selectedWasInBattle = true;
  } else if (action.choice === 'select_unselected') {
    if (!pending.unselectedCardIds.includes(action.cardId)
      || !opponent.battleDraw.includes(action.cardId)) {
      throw new InterceptedOrdersBattleError('Choose one of the unselected Battle Hand cards.');
    }
    blockBattleHandCard(battle, opponent.playerId, action.cardId);
  } else {
    throw new InterceptedOrdersBattleError('Choose a selected or unselected Battle Hand card.');
  }

  privateLog(
    game,
    [action.playerId, opponent.playerId],
    action.playerId,
    'intelligence_intercepted_orders_card_prohibited_private',
    `${action.cardId} cannot be used during this battle.`,
    { cardId: action.cardId, selectedWasInBattle },
  );
  publicLog(
    game,
    action.playerId,
    'intelligence_intercepted_orders_card_prohibited',
    `${game.players[action.playerId].name} prohibited one opposing Battle Hand card.`,
    { opponentId: opponent.playerId, selectedWasInBattle },
  );

  if (!selectedWasInBattle) {
    clearPending(game, pending.resumePriorityPlayer);
    return;
  }

  const eligibleCardIds = legalReplacementCards(game, opponent);
  if (eligibleCardIds.length === 0) {
    opponent.passedBattleDrawPlay = true;
    clearPending(game, pending.resumePriorityPlayer);
    return;
  }

  game.pendingIntelligenceChoice = {
    kind: 'intercepted_orders_battle_replacement',
    playerId: opponent.playerId,
    intelligencePlayerId: action.playerId,
    battleId: battle.id,
    prohibitedCardId: action.cardId,
    eligibleCardIds: [...new Set(eligibleCardIds)],
    options: ['pass', 'select'],
    resumePriorityPlayer: pending.resumePriorityPlayer,
  };
  game.priorityPlayer = opponent.playerId;
}

export function resolveInterceptedOrdersBattleReplacement(
  game: GameState,
  action: ResolveIntelligenceChoiceAction,
): CardID | undefined {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'intercepted_orders_battle_replacement' || pending.playerId !== action.playerId) {
    throw new InterceptedOrdersBattleError(`${action.playerId} has no pending Intercepted Orders replacement choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new InterceptedOrdersBattleError('The Intercepted Orders replacement no longer matches the active battle.');
  }

  const participant = participantFor(game, action.playerId);
  let replacementCardId: CardID | undefined;
  if (action.choice === 'pass') {
    participant.passedBattleDrawPlay = true;
  } else if (action.choice === 'select') {
    if (!action.cardId || !pending.eligibleCardIds.includes(action.cardId)) {
      throw new InterceptedOrdersBattleError('Choose an eligible replacement card or pass.');
    }
    if (!removeAvailableBattleHandCard(battle, participant, action.cardId)) {
      throw new InterceptedOrdersBattleError('That replacement is no longer available in the Battle Hand.');
    }
    participant.battleDrawPlayed.push({
      cardId: action.cardId,
      owner: action.playerId,
      origin: 'battle_draw',
      faceDown: true,
      canceled: false,
    });
    participant.passedBattleDrawPlay = false;
    replacementCardId = action.cardId;
    publicLog(
      game,
      action.playerId,
      'intelligence_intercepted_orders_replacement_selected',
      `${game.players[action.playerId].name} selected another face-down Battle Hand card.`,
    );
  } else {
    throw new InterceptedOrdersBattleError('Choose an eligible replacement card or pass.');
  }

  clearPending(game, pending.resumePriorityPlayer);
  return replacementCardId;
}
