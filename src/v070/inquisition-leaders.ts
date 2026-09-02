import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  spendV070Conviction,
  v070Conviction,
} from './inquisition';
import {
  startV070Purge,
  v070AnyPurgeAvailable,
  type V070PurgeOptions,
  type V070PurgePrintedCost,
} from './purge';
import type { PlayerId } from './rules';

export function v070GrandInquisitorFinalJudgmentAvailable(
  state: V070GameState,
): PlayerId | null {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || !runtime.aftermathCardsCleared
    || !battle.winner) {
    return null;
  }

  const playerId = battle.winner;
  const player = state.players[playerId];
  const inquisition = player.inquisition;
  if (!inquisition
    || player.leaderId !== 'grand-inquisitor'
    || inquisition.finalJudgmentUsedTurn === state.turnNumber
    || !v070AnyPurgeAvailable(state, playerId, 'final_judgment')) {
    return null;
  }
  return playerId;
}

export function useV070GrandInquisitorFinalJudgment(
  state: V070GameState,
  playerId: PlayerId,
  printedCost: V070PurgePrintedCost,
  options: V070PurgeOptions = {},
): { pendingChoice: boolean } {
  const available = v070GrandInquisitorFinalJudgmentAvailable(state);
  if (available !== playerId) {
    throw new V070GameActionError(
      'Final Judgment is not available for that player.',
    );
  }

  const inquisition = state.players[playerId].inquisition!;
  const result = startV070Purge(
    state,
    playerId,
    printedCost,
    'final_judgment',
    options,
  );
  inquisition.finalJudgmentUsedTurn = state.turnNumber;

  appendV070Event(state, {
    type: 'final_judgment_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      printedCost,
      paidCost: result.paidCost,
      pendingChoice: result.pendingChoice,
    },
  });

  return { pendingChoice: result.pendingChoice };
}

export function v070WitchHunterRelentlessPursuitAvailable(
  state: V070GameState,
): PlayerId | null {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || !runtime.aftermathCardsCleared
    || battle.winner !== battle.defender
    || state.activePlayer !== battle.attacker) {
    return null;
  }

  const playerId = battle.defender;
  const player = state.players[playerId];
  const inquisition = player.inquisition;
  if (!inquisition
    || player.leaderId !== 'witch-hunter'
    || inquisition.relentlessPursuitUsedTurn === state.turnNumber
    || v070Conviction(state, playerId) < 2) {
    return null;
  }
  return playerId;
}

export function useV070WitchHunterRelentlessPursuit(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const available = v070WitchHunterRelentlessPursuitAvailable(state);
  if (available !== playerId) {
    throw new V070GameActionError(
      'Relentless Pursuit is not available for that player.',
    );
  }
  const battle = state.battle!;
  const inquisition = state.players[playerId].inquisition!;

  spendV070Conviction(
    state,
    playerId,
    2,
    'Witch Hunter Relentless Pursuit',
  );
  inquisition.relentlessPursuitUsedTurn = state.turnNumber;
  state.pendingRelentlessPursuit = {
    playerId,
    defeatedAttackerId: battle.attacker,
    triggeredTurn: state.turnNumber,
  };

  appendV070Event(state, {
    type: 'relentless_pursuit_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      defeatedAttackerId: battle.attacker,
      contestedPosition: battle.contestedPosition,
    },
  });
}
