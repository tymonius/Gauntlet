import type { GameAction } from './actions';
import {
  applyGameAction as applyGameActionWithoutAutomation,
  type ApplyGameActionResult,
} from './reducer';
import { runPostActionAutomationPipeline } from './pipeline';
import type { GameState } from '../types';

export function applyGameAction(game: GameState, action: GameAction): ApplyGameActionResult {
  const result = applyGameActionWithoutAutomation(game, action);
  runPostActionAutomationPipeline(result.state);
  return result;
}
