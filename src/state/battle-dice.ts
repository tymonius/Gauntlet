import type { BattleParticipantState, GameEvent, GameState, PlayerID } from '../types';
import type { RollBattleDieAction } from './actions';
import { GameActionError, type ApplyGameActionResult } from './reducer';

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function appendPublicLog(game: GameState, actor: PlayerID, message: string, payload: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type: 'roll_battle_dice',
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

export function netBattleDiceAdjustment(participant: BattleParticipantState): number {
  return (participant.advantage ?? 0) - (participant.disadvantage ?? 0);
}

export function battleDiceCount(participant: BattleParticipantState): number {
  return 1 + Math.abs(netBattleDiceAdjustment(participant));
}

export function selectBattleDieResult(participant: BattleParticipantState, values: number[]): number {
  const net = netBattleDiceAdjustment(participant);
  if (net > 0) return Math.max(...values);
  if (net < 0) return Math.min(...values);
  return values[0];
}

export function deterministicBattleDiceValues(participant: BattleParticipantState, selectedResult: number): number[] {
  const count = battleDiceCount(participant);
  const net = netBattleDiceAdjustment(participant);
  if (net > 0) return [selectedResult, ...Array(count - 1).fill(1)];
  if (net < 0) return [selectedResult, ...Array(count - 1).fill(6)];
  return [selectedResult];
}

function randomValues(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

function validateValues(values: number[], expectedCount: number): void {
  if (values.length !== expectedCount) {
    throw new GameActionError(`This battle roll requires exactly ${expectedCount} dice.`);
  }
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw new GameActionError('Every battle die value must be an integer from 1 to 6.');
  }
}

export function applyBattleDiceRoll(game: GameState, action: RollBattleDieAction): ApplyGameActionResult {
  if (game.phase !== 'battle' || !game.battle || game.battle.stage !== 'dice') {
    throw new GameActionError('Battle dice are not currently open.');
  }
  const next = structuredClone(game);
  const participant = participantFor(next, action.playerId);
  if (participant.diceRoll !== undefined) throw new GameActionError(`${next.players[action.playerId].name} has already rolled.`);

  const count = battleDiceCount(participant);
  const values = action.values
    ? [...action.values]
    : action.value !== undefined
      ? count === 1
        ? [action.value]
        : deterministicBattleDiceValues(participant, action.value)
      : randomValues(count);
  validateValues(values, count);
  const selected = selectBattleDieResult(participant, values);
  participant.diceRolls = values;
  participant.diceRoll = selected;

  const net = netBattleDiceAdjustment(participant);
  const mode = net > 0 ? 'advantage' : net < 0 ? 'disadvantage' : 'normal';
  appendPublicLog(next, action.playerId, `${next.players[action.playerId].name} rolled ${values.join(', ')} and used ${selected}.`, {
    values,
    selected,
    advantage: participant.advantage ?? 0,
    disadvantage: participant.disadvantage ?? 0,
    net,
    mode,
  });

  if (next.battle.attacker.diceRoll !== undefined && next.battle.defender.diceRoll !== undefined) {
    next.battle.stage = 'resolution';
  }
  return { state: next };
}

export function clearBattleDiceForReroll(participant: BattleParticipantState): void {
  participant.diceRolls = undefined;
  participant.diceRoll = undefined;
}
