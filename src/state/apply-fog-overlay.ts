import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applySleeperNetworkGameAction } from './apply-sleeper-network';
import {
  activateFogOfWarOverlayForBattle,
  prioritizeFogOfWarOverlayChoice,
  requireFogOfWarOverlayOrder,
} from './intelligence-fog-overlay';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  requireFogOfWarOverlayOrder(game, action);
  const previousBattleId = game.battle?.id;
  const result = applySleeperNetworkGameAction(game, action);

  if (result.state.battle && result.state.battle.id !== previousBattleId) {
    activateFogOfWarOverlayForBattle(result.state);
  }
  prioritizeFogOfWarOverlayChoice(result.state);
  return result;
}
