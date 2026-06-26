import type { GameAction } from './actions';
import {
  applyGameAction as applyGameActionWithoutWinEvaluation,
  type ApplyGameActionResult,
} from './reducer';
import { evaluateWinConditions } from './win';
import type { GameState } from '../types';

export function applyGameAction(game: GameState, action: GameAction): ApplyGameActionResult {
  const result = applyGameActionWithoutWinEvaluation(game, action);
  evaluateWinConditions(result.state);
  return result;
}
