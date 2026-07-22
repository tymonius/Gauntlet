import type { GameAction, StateAction } from './actions';
import {
  applyGameAction as applyGameActionWithoutAutomation,
  GameActionError,
  type ApplyGameActionResult,
} from './reducer';
import {
  resetLeaderAbilityUsageAfterBattle,
  resetLeaderAbilityUsageForNewTurn,
  useLeaderAbility,
} from './leader-abilities';
import { gainFactionResource } from './resources';
import { runPostActionAutomationPipeline } from './pipeline';
import { isOpponentBeyondGauntletSpace, isOwnBeyondGauntletSpace } from './v06-board';
import type { BattleState, GameEvent, GameState, PlayerID, RecentBattleResult } from '../types';

const LAST_STAND_DEFENDER_BONUS_EFFECT = 'last_stand_defender_bonus';
const LAST_STAND_DEFENDER_BONUS = 1;
const MILITARY_COMMAND_TRIGGER = 'military_first_battle_win';

function validateV06EndpointMovement(game: GameState, action: GameAction): void {
  if (game.version !== 'v0.6.0' || action.type !== 'move_player') return;
  const destination = game.board.spaces.find((space) => space.id === action.toSpaceId);
  const origin = game.board.spaces.find((space) => space.occupant === action.playerId);
  if (!destination || !origin) return;
  if (isOwnBeyondGauntletSpace(destination, action.playerId)) {
    throw new GameActionError('A player cannot voluntarily withdraw beyond their own end of the Gauntlet.');
  }
  if (isOpponentBeyondGauntletSpace(destination, action.playerId)) {
    if (!destination.occupant || destination.occupant === action.playerId) {
      throw new GameActionError('A player advances beyond the Gauntlet only to initiate the opponent’s Last Stand.');
    }
    if (origin.kind !== 'territory' || origin.controller !== action.playerId) {
      throw new GameActionError('The final Territory must be captured before initiating the opponent’s Last Stand.');
    }
  }
}

function markLastStand(result: ApplyGameActionResult, action: GameAction): void {
  if (result.state.version !== 'v0.6.0' || action.type !== 'move_player' || !result.state.battle) return;
  const location = result.state.board.spaces.find((space) => space.id === result.state.battle?.location);
  if (!location || !isOpponentBeyondGauntletSpace(location, action.playerId)) return;
  result.state.battle.lastStand = true;
  result.state.battle.tiePolicy = 'defender';
}

function prepareLastStandResolution(game: GameState, action: GameAction): { game: GameState; attacker?: PlayerID; defender?: PlayerID } {
  if (game.version !== 'v0.6.0' || action.type !== 'resolve_battle' || !game.battle?.lastStand) return { game };
  const prepared = structuredClone(game);
  const battle = prepared.battle!;
  if (!battle.effectsResolved.includes(LAST_STAND_DEFENDER_BONUS_EFFECT)) {
    battle.defender.modifiers += LAST_STAND_DEFENDER_BONUS;
    battle.effectsResolved.push(LAST_STAND_DEFENDER_BONUS_EFFECT);
  }
  battle.tiePolicy = 'defender';
  return { game: prepared, attacker: battle.attacker.playerId, defender: battle.defender.playerId };
}

function lastResolvedBattleWinner(game: GameState): PlayerID | undefined {
  const event = [...game.log].reverse().find((candidate) => candidate.type === 'battle_resolved');
  if (!event?.payload || typeof event.payload !== 'object') return undefined;
  return (event.payload as { winner?: PlayerID }).winner;
}

function recentBattleResult(game: GameState, battle: BattleState, winner: PlayerID): RecentBattleResult {
  const location = game.board.spaces.find((space) => space.id === battle.location)!;
  const origin = game.board.spaces.find((space) => space.id === battle.attackerOrigin)!;
  const attackerDirection = location.index > origin.index ? 1 : -1;
  return {
    battleId: battle.id,
    turn: game.turn,
    winner,
    loser: winner === battle.attacker.playerId ? battle.defender.playerId : battle.attacker.playerId,
    attacker: battle.attacker.playerId,
    defender: battle.defender.playerId,
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    retreatDirection: (winner === battle.attacker.playerId ? attackerDirection : -attackerDirection) as -1 | 1,
  };
}

function applyMilitaryCommandTrigger(game: GameState, winner: PlayerID): void {
  const player = game.players[winner];
  if (player?.factionId !== 'military') return;
  player.factionTriggerUsage ??= {};
  if (player.factionTriggerUsage[MILITARY_COMMAND_TRIGGER] === game.turn) return;
  player.factionTriggerUsage[MILITARY_COMMAND_TRIGGER] = game.turn;
  gainFactionResource(game, winner, 'command', 1, 'First battle victory this turn');
}

function recordBattleAftermath(result: ApplyGameActionResult, battle?: BattleState): void {
  if (!battle) return;
  const winner = lastResolvedBattleWinner(result.state);
  if (!winner) return;
  result.state.recentBattleResult = recentBattleResult(result.state, battle, winner);
  applyMilitaryCommandTrigger(result.state, winner);
}

function appendLastStandVictoryLog(game: GameState, winner: PlayerID, defeatedPlayer: PlayerID): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: winner,
    type: 'last_stand_won',
    message: `${game.players[winner].name} won ${game.players[defeatedPlayer].name}’s Last Stand and ran the Gauntlet.`,
    payload: { winner, defeatedPlayer },
    visibility: 'public',
  } satisfies GameEvent);
}

function finalizeLastStandResolution(result: ApplyGameActionResult, attacker?: PlayerID, defender?: PlayerID): void {
  if (!attacker || !defender) return;
  const winner = lastResolvedBattleWinner(result.state);
  if (winner !== attacker) return;
  result.state.winner = attacker;
  result.state.phase = 'game_over';
  result.state.priorityPlayer = attacker;
  result.state.pendingAssetBankDiscards = undefined;
  appendLastStandVictoryLog(result.state, attacker, defender);
}

export function applyGameAction(game: GameState, action: StateAction): ApplyGameActionResult {
  if (action.type === 'use_leader_ability') {
    const next = structuredClone(game);
    useLeaderAbility(next, action.playerId, action.abilityId);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  validateV06EndpointMovement(game, action);
  const prepared = prepareLastStandResolution(game, action);
  const battleBeforeResolution = action.type === 'resolve_battle' && prepared.game.battle
    ? structuredClone(prepared.game.battle)
    : undefined;
  const result = applyGameActionWithoutAutomation(prepared.game, action);
  markLastStand(result, action);
  if (action.type === 'resolve_battle') recordBattleAftermath(result, battleBeforeResolution);
  runPostActionAutomationPipeline(result.state);
  finalizeLastStandResolution(result, prepared.attacker, prepared.defender);
  if (action.type === 'resolve_battle') resetLeaderAbilityUsageAfterBattle(result.state);
  if (action.type === 'end_turn') {
    result.state.recentBattleResult = undefined;
    resetLeaderAbilityUsageForNewTurn(result.state, result.state.activePlayer);
  }
  return result;
}
