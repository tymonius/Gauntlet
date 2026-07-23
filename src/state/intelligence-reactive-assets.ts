import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { blockBattleHandCard } from './battle-hand-restrictions';
import { openDiplomatTermsWindow } from './diplomat-terms';
import { openMissionControlWindow } from './intelligence-leaders';
import { recordBankedAssetUse } from './intelligence-mission-triggers';
import { finalizeIntelligenceMissionFailure } from './intelligence-missions';
import { openMilitaryPrecommitWindows } from './military-timing';

export const INTELLIGENCE_REACTIVE_ASSETS = {
  exfiltration: 'intelligence-exfiltration',
  interceptedOrders: 'intelligence-intercepted-orders',
  reconnaissance: 'intelligence-reconnaissance',
  deepCover: 'intelligence-deep-cover',
} as const;

export class IntelligenceReactiveAssetError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceReactiveAssetError'; }
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

function privateLog(game: GameState, visibleTo: PlayerID[], actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function removeOne(zone: CardID[], cardId: CardID): void {
  const index = zone.indexOf(cardId);
  if (index < 0) throw new IntelligenceReactiveAssetError(`${cardId} is not in the required zone.`);
  zone.splice(index, 1);
}

function battleParticipant(game: GameState, playerId: PlayerID) {
  const battle = game.battle;
  if (!battle) throw new IntelligenceReactiveAssetError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new IntelligenceReactiveAssetError(`${playerId} is not participating in the battle.`);
}

function opposingBattlePlayer(game: GameState, playerId: PlayerID): PlayerID {
  const battle = game.battle;
  if (!battle) throw new IntelligenceReactiveAssetError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender.playerId : battle.attacker.playerId;
}

function clearPending(game: GameState, resumePriorityPlayer?: PlayerID): void {
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
}

function ownBeforeGauntlet(game: GameState, playerId: PlayerID) {
  return game.board.spaces.find((space) => space.kind === 'endpoint' && space.endpointOwner === playerId && space.endpointRole === 'before_gauntlet');
}

function withdrawalDestination(game: GameState, playerId: PlayerID) {
  const current = game.board.spaces.find((space) => space.occupant === playerId);
  const ownEnd = ownBeforeGauntlet(game, playerId);
  if (!current || !ownEnd) return undefined;
  const direction = Math.sign(ownEnd.index - current.index);
  if (direction === 0) return undefined;
  const destination = game.board.spaces.find((space) => space.index === current.index + direction);
  if (!destination || destination.occupant) return undefined;
  return { current, destination };
}

function withdrawOnePosition(game: GameState, playerId: PlayerID): { from: SpaceID; to: SpaceID } {
  const movement = withdrawalDestination(game, playerId);
  if (!movement) throw new IntelligenceReactiveAssetError('The player cannot withdraw one position.');
  movement.current.occupant = undefined;
  movement.destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = movement.destination.id;
  return { from: movement.current.id, to: movement.destination.id };
}

function continueBattleStart(game: GameState): void {
  if (!game.battle || game.pendingIntelligenceChoice) return;
  if (!openDiplomatTermsWindow(game)) openMilitaryPrecommitWindows(game);
}

export function openExfiltrationWindow(game: GameState, playerId: PlayerID, after: 'complete' | 'abort'): boolean {
  const player = game.players[playerId];
  if (!player?.intelligence || game.pendingIntelligenceChoice) return false;
  if (!player.zones.assetBank.includes(INTELLIGENCE_REACTIVE_ASSETS.exfiltration)) return false;
  if (!withdrawalDestination(game, playerId)) return false;
  game.pendingIntelligenceChoice = { kind: 'exfiltration', playerId, after, options: ['pass', 'use'] };
  game.priorityPlayer = playerId;
  return true;
}

export function openReconnaissanceWindow(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'hand_commit' || game.pendingIntelligenceChoice) return false;
  const playerId = battle.attacker.playerId;
  const player = game.players[playerId];
  const effectKey = `reconnaissance_window:${playerId}`;
  if (!player?.intelligence || !player.zones.assetBank.includes(INTELLIGENCE_REACTIVE_ASSETS.reconnaissance) || battle.effectsResolved.includes(effectKey)) return false;
  battle.effectsResolved.push(effectKey);
  game.pendingIntelligenceChoice = {
    kind: 'reconnaissance',
    playerId,
    battleId: battle.id,
    opponentId: battle.defender.playerId,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

export function openInterceptedOrdersWindow(game: GameState, targetOwner: PlayerID): boolean {
  const battle = game.battle;
  if (!battle || game.pendingIntelligenceChoice) return false;
  const intelligencePlayerId = opposingBattlePlayer(game, targetOwner);
  const intelligencePlayer = game.players[intelligencePlayerId];
  const target = battleParticipant(game, targetOwner);
  const effectKey = `intercepted_orders_window:${intelligencePlayerId}:${targetOwner}`;
  if (!intelligencePlayer?.intelligence
    || !intelligencePlayer.zones.assetBank.includes(INTELLIGENCE_REACTIVE_ASSETS.interceptedOrders)
    || !target.hasDrawnBattleCards
    || target.battleDraw.length === 0
    || battle.effectsResolved.includes(effectKey)) return false;
  battle.effectsResolved.push(effectKey);
  game.pendingIntelligenceChoice = {
    kind: 'intercepted_orders',
    playerId: intelligencePlayerId,
    battleId: battle.id,
    targetOwner,
    battleHand: [...target.battleDraw],
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = intelligencePlayerId;
  return true;
}

function resolveExfiltration(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'exfiltration') throw new IntelligenceReactiveAssetError('There is no Exfiltration choice to resolve.');
  if (action.choice === 'use') {
    const player = game.players[action.playerId];
    removeOne(player.zones.assetBank, INTELLIGENCE_REACTIVE_ASSETS.exfiltration);
    player.zones.discard.push(INTELLIGENCE_REACTIVE_ASSETS.exfiltration);
    const movement = withdrawOnePosition(game, action.playerId);
    publicLog(game, action.playerId, 'intelligence_exfiltration_used', `${player.name} discarded Exfiltration and withdrew.`, movement);
  } else if (action.choice !== 'pass') {
    throw new IntelligenceReactiveAssetError('Choose whether to use Exfiltration.');
  }
  clearPending(game);
  if (pending.after === 'complete') openMissionControlWindow(game, action.playerId);
}

function resolveReconnaissance(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'reconnaissance') throw new IntelligenceReactiveAssetError('There is no Reconnaissance choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    continueBattleStart(game);
    return;
  }
  if (action.choice !== 'use') throw new IntelligenceReactiveAssetError('Choose whether to use Reconnaissance.');
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new IntelligenceReactiveAssetError('The Reconnaissance battle is no longer active.');
  const player = game.players[action.playerId];
  removeOne(player.zones.assetBank, INTELLIGENCE_REACTIVE_ASSETS.reconnaissance);
  player.zones.discard.push(INTELLIGENCE_REACTIVE_ASSETS.reconnaissance);
  recordBankedAssetUse(game, action.playerId, battle.id, INTELLIGENCE_REACTIVE_ASSETS.reconnaissance);
  const inspectedHand = [...game.players[pending.opponentId].zones.hand];
  privateLog(game, [action.playerId], action.playerId, 'intelligence_reconnaissance_hand_inspected', `You looked at ${game.players[pending.opponentId].name}’s hand.`, {
    opponentId: pending.opponentId,
    cards: inspectedHand,
  });
  publicLog(game, action.playerId, 'intelligence_reconnaissance_used', `${player.name} used Reconnaissance before hand commitments.`);
  game.pendingIntelligenceChoice = {
    kind: 'reconnaissance_withdraw',
    playerId: action.playerId,
    battleId: pending.battleId,
    opponentId: pending.opponentId,
    inspectedHand,
    options: ['stay', 'withdraw'],
    resumePriorityPlayer: pending.resumePriorityPlayer,
  };
  game.priorityPlayer = action.playerId;
}

function resolveReconnaissanceWithdrawal(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'reconnaissance_withdraw') throw new IntelligenceReactiveAssetError('There is no Reconnaissance withdrawal choice to resolve.');
  if (action.choice === 'stay') {
    clearPending(game, pending.resumePriorityPlayer);
    continueBattleStart(game);
    return;
  }
  if (action.choice !== 'withdraw') throw new IntelligenceReactiveAssetError('Choose whether to withdraw after Reconnaissance.');
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.attacker.playerId !== action.playerId) throw new IntelligenceReactiveAssetError('The Reconnaissance battle is no longer active.');
  game.battle = undefined;
  game.phase = 'action_after_movement';
  clearPending(game, game.activePlayer);
  publicLog(game, action.playerId, 'intelligence_reconnaissance_withdrew', `${game.players[action.playerId].name} withdrew before cards were committed; the battle ended without a winner.`);
}

function resolveInterceptedOrders(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'intercepted_orders') throw new IntelligenceReactiveAssetError('There is no Intercepted Orders choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    return;
  }
  if (action.choice !== 'use') throw new IntelligenceReactiveAssetError('Choose whether to use Intercepted Orders.');
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new IntelligenceReactiveAssetError('The Intercepted Orders battle is no longer active.');
  const player = game.players[action.playerId];
  removeOne(player.zones.assetBank, INTELLIGENCE_REACTIVE_ASSETS.interceptedOrders);
  player.zones.discard.push(INTELLIGENCE_REACTIVE_ASSETS.interceptedOrders);
  recordBankedAssetUse(game, action.playerId, battle.id, INTELLIGENCE_REACTIVE_ASSETS.interceptedOrders);
  privateLog(game, [action.playerId, pending.targetOwner], action.playerId, 'intelligence_intercepted_orders_hand_inspected', `The initial Battle Hand was inspected with Intercepted Orders.`, {
    targetOwner: pending.targetOwner,
    cards: pending.battleHand,
  });
  publicLog(game, action.playerId, 'intelligence_intercepted_orders_used', `${player.name} used Intercepted Orders.`);
  game.pendingIntelligenceChoice = {
    kind: 'intercepted_orders_select',
    playerId: action.playerId,
    battleId: pending.battleId,
    targetOwner: pending.targetOwner,
    battleHandOptions: [...new Set(pending.battleHand)],
    options: ['select'],
    resumePriorityPlayer: pending.resumePriorityPlayer,
  };
  game.priorityPlayer = action.playerId;
}

function resolveInterceptedOrdersSelection(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'intercepted_orders_select') throw new IntelligenceReactiveAssetError('There is no Intercepted Orders card choice to resolve.');
  if (action.choice !== 'select' || !action.cardId || !pending.battleHandOptions.includes(action.cardId)) {
    throw new IntelligenceReactiveAssetError('Choose one card from the inspected Battle Hand.');
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new IntelligenceReactiveAssetError('The Intercepted Orders battle is no longer active.');
  blockBattleHandCard(battle, pending.targetOwner, action.cardId);
  privateLog(game, [action.playerId, pending.targetOwner], action.playerId, 'intelligence_intercepted_orders_card_blocked', `${action.cardId} cannot be chosen from the Battle Hand during this battle.`, {
    targetOwner: pending.targetOwner,
    cardId: action.cardId,
  });
  publicLog(game, action.playerId, 'intelligence_intercepted_orders_card_selected', `${game.players[action.playerId].name} prohibited one card from the opposing Battle Hand.`);
  clearPending(game, pending.resumePriorityPlayer);
}

function resolveDeepCover(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'deep_cover') throw new IntelligenceReactiveAssetError('There is no Deep Cover choice to resolve.');
  const player = game.players[action.playerId];
  const mission = player.intelligence?.activeMission;
  if (!mission || mission.cardId !== pending.missionCardId) throw new IntelligenceReactiveAssetError('The threatened Active Mission is no longer present.');
  if (action.choice === 'pass') {
    clearPending(game);
    finalizeIntelligenceMissionFailure(game, action.playerId, 'normal', pending.reason);
    return;
  }
  if (action.choice !== 'use') throw new IntelligenceReactiveAssetError('Choose whether to use Deep Cover.');
  removeOne(player.zones.assetBank, INTELLIGENCE_REACTIVE_ASSETS.deepCover);
  player.zones.graveyard.push(INTELLIGENCE_REACTIVE_ASSETS.deepCover);
  player.intelligence!.activeMission = undefined;
  player.zones.hand.push(mission.cardId);
  privateLog(game, [action.playerId], action.playerId, 'intelligence_deep_cover_mission_saved', `You returned ${mission.cardId} to your hand with Deep Cover.`, { cardId: mission.cardId });
  publicLog(game, action.playerId, 'intelligence_deep_cover_used', `${player.name} put Deep Cover in the Graveyard and returned their threatened Mission to hand.`);
  clearPending(game);
}

export function resolveIntelligenceReactiveAssetChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== action.playerId) throw new IntelligenceReactiveAssetError(`${action.playerId} has no pending reactive Intelligence Asset choice.`);
  if (pending.kind === 'exfiltration') resolveExfiltration(game, action);
  else if (pending.kind === 'reconnaissance') resolveReconnaissance(game, action);
  else if (pending.kind === 'reconnaissance_withdraw') resolveReconnaissanceWithdrawal(game, action);
  else if (pending.kind === 'intercepted_orders') resolveInterceptedOrders(game, action);
  else if (pending.kind === 'intercepted_orders_select') resolveInterceptedOrdersSelection(game, action);
  else if (pending.kind === 'deep_cover') resolveDeepCover(game, action);
  else throw new IntelligenceReactiveAssetError('The pending Intelligence choice is not a reactive Asset choice.');
}
