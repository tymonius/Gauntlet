import { intelligenceMissionCardIds } from '../cards';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import type { ResolveIntelligenceChoiceAction } from './actions';
import { startMissionControlMission } from './intelligence-missions';
import { hasFactionResource, spendFactionResource } from './resources';

export const RANGER_FIELDCRAFT_ABILITY_ID = 'ranger-fieldcraft';
export const SPYMASTER_MISSION_CONTROL_ABILITY_ID = 'spymaster-mission-control';

export class IntelligenceLeaderError extends Error {
  constructor(message: string) { super(message); this.name = 'IntelligenceLeaderError'; }
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

function clearPending(game: GameState, resumePriorityPlayer?: PlayerID): void {
  game.pendingIntelligenceChoice = undefined;
  if (game.phase !== 'game_over') game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
}

function abilityUsedThisTurn(game: GameState, playerId: PlayerID, abilityId: string): boolean {
  return game.players[playerId].leaderAbilityUsage?.turn[abilityId] === game.turn;
}

function markAbilityUsedThisTurn(game: GameState, playerId: PlayerID, abilityId: string): void {
  game.players[playerId].leaderAbilityUsage ??= { turn: {}, battle: {} };
  game.players[playerId].leaderAbilityUsage!.turn[abilityId] = game.turn;
}

export function openMissionControlWindow(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'intelligence' || player.leaderName !== 'Spymaster' || !player.intelligence) return false;
  if (game.pendingIntelligenceChoice || player.intelligence.activeMission || player.intelligence.specialOperation) return false;
  if (abilityUsedThisTurn(game, playerId, SPYMASTER_MISSION_CONTROL_ABILITY_ID)) return false;

  const eligibleCardIds = player.zones.hand.filter((cardId) => intelligenceMissionCardIds.has(cardId));
  if (eligibleCardIds.length === 0) return false;

  game.pendingIntelligenceChoice = {
    kind: 'mission_control',
    playerId,
    eligibleCardIds,
    options: ['pass', 'select'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

export function fieldcraftEffectKey(spaceId: SpaceID, effectId: string): string {
  return `${spaceId}:${effectId}`;
}

export function isTerritoryEffectIgnored(game: GameState, playerId: PlayerID, spaceId: SpaceID, effectId: string): boolean {
  const ignored = game.players[playerId]?.intelligence?.ignoredTerritoryEffects;
  return ignored?.turn === game.turn && ignored.effectKeys.includes(fieldcraftEffectKey(spaceId, effectId));
}

export function openFieldcraftWindow(game: GameState, playerId: PlayerID, spaceId: SpaceID, effectId: string): boolean {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'intelligence' || player.leaderName !== 'Ranger' || !player.intelligence) return false;
  if (game.pendingIntelligenceChoice || abilityUsedThisTurn(game, playerId, RANGER_FIELDCRAFT_ABILITY_ID)) return false;
  if (!hasFactionResource(player, 'intel', 1)) return false;
  if (isTerritoryEffectIgnored(game, playerId, spaceId, effectId)) return false;

  game.pendingIntelligenceChoice = {
    kind: 'fieldcraft',
    playerId,
    spaceId,
    effectId,
    options: ['pass', 'ignore'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}

function resolveMissionControl(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'mission_control') throw new IntelligenceLeaderError('There is no Mission Control choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    return;
  }
  if (action.choice !== 'select' || !action.cardId || !pending.eligibleCardIds.includes(action.cardId)) {
    throw new IntelligenceLeaderError('Choose an eligible Mission card or pass Mission Control.');
  }

  startMissionControlMission(game, action.playerId, action.cardId);
  markAbilityUsedThisTurn(game, action.playerId, SPYMASTER_MISSION_CONTROL_ABILITY_ID);
  clearPending(game, pending.resumePriorityPlayer);
}

function resolveFieldcraft(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.kind !== 'fieldcraft') throw new IntelligenceLeaderError('There is no Fieldcraft choice to resolve.');
  if (action.choice === 'pass') {
    clearPending(game, pending.resumePriorityPlayer);
    return;
  }
  if (action.choice !== 'ignore') throw new IntelligenceLeaderError('Choose whether to use Fieldcraft.');

  spendFactionResource(game, action.playerId, 'intel', 1, 'Ranger Fieldcraft');
  markAbilityUsedThisTurn(game, action.playerId, RANGER_FIELDCRAFT_ABILITY_ID);
  const player = game.players[action.playerId];
  const key = fieldcraftEffectKey(pending.spaceId, pending.effectId);
  if (player.intelligence!.ignoredTerritoryEffects?.turn !== game.turn) {
    player.intelligence!.ignoredTerritoryEffects = { turn: game.turn, effectKeys: [] };
  }
  if (!player.intelligence!.ignoredTerritoryEffects!.effectKeys.includes(key)) {
    player.intelligence!.ignoredTerritoryEffects!.effectKeys.push(key);
  }
  log(game, action.playerId, 'ranger_fieldcraft_used', `${player.name} used Fieldcraft to ignore a printed Territory effect until the end of the turn.`, {
    spaceId: pending.spaceId,
    effectId: pending.effectId,
  });
  clearPending(game, pending.resumePriorityPlayer);
}

export function resolveIntelligenceLeaderChoice(game: GameState, action: ResolveIntelligenceChoiceAction): void {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== action.playerId) throw new IntelligenceLeaderError(`${action.playerId} has no pending Intelligence Leader choice.`);
  if (pending.kind === 'mission_control') resolveMissionControl(game, action);
  else if (pending.kind === 'fieldcraft') resolveFieldcraft(game, action);
  else throw new IntelligenceLeaderError('The pending Intelligence choice is not a Leader ability.');
}
