import type { BattleState, GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applySubversionAssetGameAction } from './apply-subversion-asset';
import {
  beginMysticRiteFromAction,
  reconcileMysticsAfterResolvedBattle,
  reconcileRiteOfCrossingAtTurnStart,
  resolveMysticsChoice,
} from './mystics-rite-integration';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

function resolvedBattleSnapshot(game: GameState): BattleState | undefined {
  return game.battle ? structuredClone(game.battle) : undefined;
}

function continueMysticsAutomation(result: ApplyGameActionResult, priorBattle?: BattleState): ApplyGameActionResult {
  if (priorBattle
    && !result.state.battle
    && result.state.recentBattleResult?.battleId === priorBattle.id) {
    reconcileMysticsAfterResolvedBattle(result.state, priorBattle);
  }
  reconcileRiteOfCrossingAtTurnStart(result.state);
  runPostActionAutomationPipeline(result.state);
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (game.pendingMysticsChoice) {
    if (action.type !== 'resolve_mystics_choice') {
      throw new GameActionError('Resolve the pending Mystics choice first.');
    }
    const next = structuredClone(game);
    resolveMysticsChoice(next, action);
    return continueMysticsAutomation({ state: next });
  }

  if (action.type === 'resolve_mystics_choice') {
    throw new GameActionError(`${action.playerId} has no pending Mystics choice.`);
  }

  if (action.type === 'begin_mystic_rite') {
    const next = structuredClone(game);
    beginMysticRiteFromAction(next, action);
    return continueMysticsAutomation({ state: next });
  }

  const priorBattle = resolvedBattleSnapshot(game);
  const result = applySubversionAssetGameAction(game, action);
  return continueMysticsAutomation(result, priorBattle);
}
