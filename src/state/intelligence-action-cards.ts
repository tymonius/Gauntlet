import { intelligenceMissionCardIds } from '../cards';
import type { CardID, GameEvent, GameState, PlayerID, PlayerState } from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { recordOpponentHandLookOutsideBattle } from './intelligence-mission-triggers';

export const INTELLIGENCE_ACTION_CARDS = {
  spies: 'intelligence-spies',
  operationalReassessment: 'intelligence-operational-reassessment',
  assassins: 'intelligence-assassins',
} as const;

export class IntelligenceActionCardError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceActionCardError'; }
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

function requireIntelligence(game: GameState, playerId: PlayerID): PlayerState {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'intelligence' || !player.intelligence) {
    throw new IntelligenceActionCardError(`${playerId} is not an Intelligence player.`);
  }
  return player;
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.keys(game.players).find((candidate) => candidate !== playerId);
  if (!opponent) throw new IntelligenceActionCardError('An opponent is required.');
  return opponent;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function clearPending(game: GameState): void {
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
}

export function isIntegratedIntelligenceActionCard(cardId: CardID): boolean {
  return Object.values(INTELLIGENCE_ACTION_CARDS).includes(cardId as never);
}

export function canResolveIntelligenceAction(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (!isIntegratedIntelligenceActionCard(cardId)) return true;
  const player = game.players[playerId];
  if (player?.factionId !== 'intelligence' || !player.intelligence) return false;
  if (cardId === INTELLIGENCE_ACTION_CARDS.operationalReassessment) return Boolean(player.intelligence.activeMission);
  return true;
}

function playSpies(game: GameState, playerId: PlayerID): void {
  const player = requireIntelligence(game, playerId);
  const opponent = game.players[opponentId(game, playerId)];
  const inspectedHand = [...opponent.zones.hand];
  recordOpponentHandLookOutsideBattle(game, playerId, 'Spies');
  privateLog(game, playerId, 'intelligence_spies_hand_inspected', `You looked at ${opponent.name}’s hand.`, {
    opponentId: opponent.id,
    cards: inspectedHand,
  });
  publicLog(game, playerId, 'intelligence_spies_used', `${player.name} used Spies to inspect ${opponent.name}’s hand.`);

  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);
  publicLog(game, playerId, 'intelligence_spies_drew', `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Spies.`, {
    count: draw.drawnCards.length,
    reshuffled: draw.reshuffled,
    exhausted: draw.exhausted,
  });

  if (player.zones.hand.length > 0) {
    game.pendingIntelligenceChoice = {
      kind: 'spies_discard',
      playerId,
      opponentId: opponent.id,
      inspectedHand,
      handOptions: [...new Set(player.zones.hand)],
      options: ['select'],
    };
    game.priorityPlayer = playerId;
  }
}

function playAssassins(game: GameState, playerId: PlayerID): void {
  const player = requireIntelligence(game, playerId);
  const opponent = game.players[opponentId(game, playerId)];
  const inspectedHand = [...opponent.zones.hand];
  recordOpponentHandLookOutsideBattle(game, playerId, 'Assassins');
  privateLog(game, playerId, 'intelligence_assassins_hand_inspected', `You looked at ${opponent.name}’s hand.`, {
    opponentId: opponent.id,
    cards: inspectedHand,
  });
  publicLog(game, playerId, 'intelligence_assassins_used', `${player.name} used Assassins to inspect ${opponent.name}’s hand.`);

  if (inspectedHand.length > 0) {
    game.pendingIntelligenceChoice = {
      kind: 'assassins_discard',
      playerId,
      opponentId: opponent.id,
      opponentHandOptions: [...new Set(inspectedHand)],
      options: ['select'],
    };
    game.priorityPlayer = playerId;
  }
}

function playOperationalReassessment(game: GameState, playerId: PlayerID): void {
  const player = requireIntelligence(game, playerId);
  const mission = player.intelligence!.activeMission;
  if (!mission) throw new IntelligenceActionCardError('Operational Reassessment requires an Active Mission.');

  player.intelligence!.activeMission = undefined;
  player.zones.hand.push(mission.cardId);
  privateLog(game, playerId, 'intelligence_reassessment_mission_returned', `You returned ${mission.cardId} to your hand.`, { cardId: mission.cardId });
  publicLog(game, playerId, 'intelligence_reassessment_used', `${player.name} returned their face-down Active Mission to hand.`);

  const eligibleCardIds = [...new Set(player.zones.hand.filter((cardId) => cardId !== mission.cardId && intelligenceMissionCardIds.has(cardId)))];
  if (eligibleCardIds.length > 0) {
    game.pendingIntelligenceChoice = {
      kind: 'operational_reassessment',
      playerId,
      returnedMissionCardId: mission.cardId,
      eligibleCardIds,
      options: ['select'],
    };
    game.priorityPlayer = playerId;
  }
}

export function applyIntelligenceActionEffect(game: GameState, playerId: PlayerID, cardId: CardID): void {
  if (cardId === INTELLIGENCE_ACTION_CARDS.spies) playSpies(game, playerId);
  else if (cardId === INTELLIGENCE_ACTION_CARDS.operationalReassessment) playOperationalReassessment(game, playerId);
  else if (cardId === INTELLIGENCE_ACTION_CARDS.assassins) playAssassins(game, playerId);
}

function resolveSpiesDiscard(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'spies_discard') throw new IntelligenceActionCardError('There is no Spies discard choice to resolve.');
  if (action.choice !== 'select' || !action.cardId || !pending.handOptions.includes(action.cardId)) {
    throw new IntelligenceActionCardError('Choose one card to discard for Spies.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) throw new IntelligenceActionCardError('That card is no longer in hand.');
  player.zones.discard.push(action.cardId);
  publicLog(game, action.playerId, 'intelligence_spies_discarded', `${player.name} discarded one card for Spies.`, { cardId: action.cardId });
  clearPending(game);
}

function resolveAssassinsDiscard(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'assassins_discard') throw new IntelligenceActionCardError('There is no Assassins discard choice to resolve.');
  if (action.choice !== 'select' || !action.cardId || !pending.opponentHandOptions.includes(action.cardId)) {
    throw new IntelligenceActionCardError('Choose one inspected opposing card for Assassins.');
  }
  const opponent = game.players[pending.opponentId];
  if (!removeOne(opponent.zones.hand, action.cardId)) throw new IntelligenceActionCardError('That card is no longer in the opponent’s hand.');
  opponent.zones.discard.push(action.cardId);
  publicLog(game, action.playerId, 'intelligence_assassins_discarded', `${game.players[action.playerId].name} discarded ${action.cardId} from ${opponent.name}’s hand.`, {
    opponentId: opponent.id,
    cardId: action.cardId,
  });
  clearPending(game);
}

function resolveOperationalReassessment(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'operational_reassessment') throw new IntelligenceActionCardError('There is no Operational Reassessment choice to resolve.');
  if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) {
    throw new IntelligenceActionCardError('Choose another eligible Intelligence card as the Active Mission.');
  }
  const player = requireIntelligence(game, action.playerId);
  if (!removeOne(player.zones.hand, action.cardId)) throw new IntelligenceActionCardError('That Mission card is no longer in hand.');
  player.intelligence!.activeMission = {
    cardId: action.cardId,
    kind: 'normal',
    startedTurn: game.turn,
    startedLogIndex: game.log.length,
    requirementSatisfied: false,
    evidence: [],
  };
  privateLog(game, action.playerId, 'intelligence_reassessment_mission_started', `You placed ${action.cardId} face down as your Active Mission.`, { cardId: action.cardId });
  publicLog(game, action.playerId, 'intelligence_reassessment_completed', `${player.name} placed another card face down as their Active Mission.`);
  clearPending(game);
}

export function resolveIntelligenceActionChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== action.playerId) throw new IntelligenceActionCardError(`${action.playerId} has no pending Intelligence Action choice.`);
  if (pending.kind === 'spies_discard') resolveSpiesDiscard(game, action);
  else if (pending.kind === 'assassins_discard') resolveAssassinsDiscard(game, action);
  else if (pending.kind === 'operational_reassessment') resolveOperationalReassessment(game, action);
  else throw new IntelligenceActionCardError('The pending Intelligence choice is not an Action-card choice.');
}
