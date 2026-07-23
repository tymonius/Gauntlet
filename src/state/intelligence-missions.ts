import { intelligenceCardsById, intelligenceMissionCardIds } from '../cards';
import type { CardID, GameEvent, GameState, IntelligenceMissionKind, IntelligenceMissionState, PlayerID, PlayerState } from '../types';
import { gainFactionResource, hasFactionResource, spendFactionResource } from './resources';

export class IntelligenceMissionError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceMissionError'; }
}

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function requireIntelligence(game: GameState, playerId: PlayerID): PlayerState {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'intelligence' || !player.intelligence) throw new IntelligenceMissionError(`${playerId} is not an Intelligence player.`);
  return player;
}

function requireActionOpportunity(game: GameState, playerId: PlayerID): PlayerState {
  const player = requireIntelligence(game, playerId);
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId) throw new IntelligenceMissionError('It is not this player’s Action Opportunity.');
  if (game.phase !== 'action_after_movement' || player.actionsRemaining < 1) throw new IntelligenceMissionError('Missions require the Action Opportunity after movement.');
  if (player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) throw new IntelligenceMissionError('This player has already played a card this turn.');
  return player;
}

function consumeAction(player: PlayerState): void {
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
}

function removeOne(source: CardID[], cardId: CardID): boolean {
  const index = source.indexOf(cardId);
  if (index < 0) return false;
  source.splice(index, 1);
  return true;
}

function missionDefinition(cardId: CardID) {
  const card = intelligenceCardsById.get(cardId);
  if (!card || !card.mission || !intelligenceMissionCardIds.has(cardId)) throw new IntelligenceMissionError(`${cardId} is not eligible to become a Mission.`);
  return card;
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.keys(game.players).find((id) => id !== playerId);
  if (!opponent) throw new IntelligenceMissionError('An opponent is required.');
  return opponent;
}

export function specialOperationReady(game: GameState, playerId: PlayerID): boolean {
  const player = requireIntelligence(game, playerId);
  const progress = player.resources?.operation_progress?.value ?? 0;
  return progress > game.players[opponentId(game, playerId)].controlledTerritories.length;
}

export function specialOperationIntelCost(game: GameState, cardId: CardID): number {
  const card = missionDefinition(cardId);
  const territoriesInGauntlet = game.board.spaces.filter((space) => space.kind === 'territory').length;
  return Math.max(territoriesInGauntlet - card.cost, 1);
}

export function startIntelligenceMission(game: GameState, playerId: PlayerID, cardId: CardID, kind: IntelligenceMissionKind): void {
  const player = requireActionOpportunity(game, playerId);
  const card = missionDefinition(cardId);
  if (player.intelligence!.activeMission || player.intelligence!.specialOperation) throw new IntelligenceMissionError('Only one Mission or Special Operation may be active.');
  if (!player.zones.hand.includes(cardId)) throw new IntelligenceMissionError(`${card.name} is not in hand.`);
  if (kind === 'special_operation' && !specialOperationReady(game, playerId)) throw new IntelligenceMissionError('Operation Progress must exceed the opponent’s controlled Territories to start a Special Operation.');

  removeOne(player.zones.hand, cardId);
  const mission: IntelligenceMissionState = { cardId, kind, startedTurn: game.turn, startedLogIndex: game.log.length, requirementSatisfied: false, evidence: [] };
  if (kind === 'normal') player.intelligence!.activeMission = mission;
  else player.intelligence!.specialOperation = mission;
  consumeAction(player);
  log(game, playerId, kind === 'normal' ? 'intelligence_mission_started' : 'intelligence_special_operation_started', `${player.name} started a face-down ${kind === 'normal' ? 'Mission' : 'Special Operation'}.`, { kind });
}

export function startMissionControlMission(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = requireIntelligence(game, playerId);
  const card = missionDefinition(cardId);
  if (player.leaderName !== 'Spymaster') throw new IntelligenceMissionError('Only the Spymaster can use Mission Control.');
  if (player.intelligence!.activeMission || player.intelligence!.specialOperation) throw new IntelligenceMissionError('Only one Mission or Special Operation may be active.');
  if (!removeOne(player.zones.hand, cardId)) throw new IntelligenceMissionError(`${card.name} is not in hand.`);

  player.intelligence!.activeMission = { cardId, kind: 'normal', startedTurn: game.turn, startedLogIndex: game.log.length, requirementSatisfied: false, evidence: [] };
  log(game, playerId, 'spymaster_mission_control_started', `${player.name} used Mission Control to start another face-down Mission.`, { cardId });
}

export function markIntelligenceMissionRequirement(game: GameState, playerId: PlayerID, evidence: string, kind: IntelligenceMissionKind = 'normal'): void {
  const player = requireIntelligence(game, playerId);
  const mission = kind === 'normal' ? player.intelligence!.activeMission : player.intelligence!.specialOperation;
  if (!mission || mission.requirementSatisfied) return;
  mission.requirementSatisfied = true;
  if (!mission.evidence.includes(evidence)) mission.evidence.push(evidence);
  log(game, playerId, 'intelligence_mission_requirement_satisfied', `${player.name} satisfied a ${kind === 'normal' ? 'Mission' : 'Special Operation'} requirement.`, { kind });
}

export function completeIntelligenceMission(game: GameState, playerId: PlayerID): void {
  const intelligencePlayer = requireIntelligence(game, playerId);
  const mission = intelligencePlayer.intelligence!.activeMission;
  if (!mission) throw new IntelligenceMissionError('There is no Active Mission to complete.');
  if (mission.startedTurn === game.turn) throw new IntelligenceMissionError('A Mission cannot complete during the turn it begins.');
  const player = requireActionOpportunity(game, playerId);
  if (!mission.requirementSatisfied) throw new IntelligenceMissionError('The Mission requirement has not been satisfied.');
  const card = missionDefinition(mission.cardId);

  player.intelligence!.activeMission = undefined;
  player.zones.discard.push(mission.cardId);
  gainFactionResource(game, playerId, 'operation_progress', 1, `Completed ${card.name}`);
  gainFactionResource(game, playerId, 'intel', card.cost, `Completed ${card.name}`);
  consumeAction(player);
  log(game, playerId, 'intelligence_mission_completed', `${player.name} completed ${card.name}.`, { cardId: mission.cardId, intelGained: card.cost, operationProgressGained: 1, evidence: mission.evidence });
}

export function abortIntelligenceMission(game: GameState, playerId: PlayerID): void {
  const player = requireActionOpportunity(game, playerId);
  const mission = player.intelligence!.activeMission;
  if (!mission) throw new IntelligenceMissionError('There is no Active Mission to abort.');
  const card = missionDefinition(mission.cardId);
  spendFactionResource(game, playerId, 'intel', card.cost, `Abort ${card.name}`);
  player.intelligence!.activeMission = undefined;
  player.zones.discard.push(mission.cardId);
  consumeAction(player);
  log(game, playerId, 'intelligence_mission_aborted', `${player.name} aborted ${card.name}.`, { cardId: mission.cardId, intelSpent: card.cost });
}

export function failIntelligenceMission(game: GameState, playerId: PlayerID, kind: IntelligenceMissionKind, reason: string): void {
  const player = requireIntelligence(game, playerId);
  const mission = kind === 'normal' ? player.intelligence!.activeMission : player.intelligence!.specialOperation;
  if (!mission) return;
  if (kind === 'normal') player.intelligence!.activeMission = undefined;
  else player.intelligence!.specialOperation = undefined;
  player.zones.graveyard.push(mission.cardId);
  log(game, playerId, kind === 'normal' ? 'intelligence_mission_failed' : 'intelligence_special_operation_failed', `${player.name}’s ${kind === 'normal' ? 'Mission' : 'Special Operation'} failed.`, { cardId: mission.cardId, reason });
}

export function completeSpecialOperation(game: GameState, playerId: PlayerID): void {
  const player = requireActionOpportunity(game, playerId);
  const operation = player.intelligence!.specialOperation;
  if (!operation) throw new IntelligenceMissionError('There is no Special Operation to complete.');
  if (!specialOperationReady(game, playerId)) throw new IntelligenceMissionError('The Special Operation is no longer ready.');
  if (!operation.requirementSatisfied) throw new IntelligenceMissionError('The Special Operation requirement has not been satisfied.');
  const cost = specialOperationIntelCost(game, operation.cardId);
  if (!hasFactionResource(player, 'intel', cost)) throw new IntelligenceMissionError(`Completing this Special Operation requires ${cost} Intel.`);

  spendFactionResource(game, playerId, 'intel', cost, 'Complete Special Operation');
  player.intelligence!.specialOperation = undefined;
  player.zones.discard.push(operation.cardId);
  consumeAction(player);
  game.winner = playerId;
  game.phase = 'game_over';
  game.priorityPlayer = playerId;
  game.battle = undefined;
  game.pendingAssetBankDiscards = undefined;
  game.pendingMilitaryChoice = undefined;
  game.pendingMilitaryTimingChoice = undefined;
  game.pendingDiplomatChoice = undefined;
  game.pendingFinancierChoice = undefined;
  game.pendingLeaderAbilityWindow = undefined;
  log(game, playerId, 'intelligence_special_operation_completed', `${player.name} completed a Special Operation and won the game.`, { cardId: operation.cardId, intelSpent: cost, evidence: operation.evidence });
}

export function reconcileIntelligenceState(game: GameState): void {
  if (game.phase === 'game_over') return;
  for (const player of Object.values(game.players)) {
    if (player.factionId !== 'intelligence' || !player.intelligence?.specialOperation) continue;
    if (!specialOperationReady(game, player.id)) failIntelligenceMission(game, player.id, 'special_operation', 'Operation Progress no longer exceeds the opponent’s controlled Territories.');
  }
}
