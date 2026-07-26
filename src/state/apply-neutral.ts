import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFactionGameAction } from './apply-inquisition';
import { applyContingencyPlanAssetLimitDraw } from './neutral-contingency-plan';
import { applyFealtyBattleEffects } from './neutral-fealty';
import type { ApplyGameActionResult } from './reducer';

/**
 * Outermost card-integration layer for canonical Neutral cards. Neutral effects
 * apply to every faction and therefore sit above the faction-specific stack.
 */
export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  const result = applyFactionGameAction(game, action);

  if (action.type === 'resolve_asset_bank_discard') {
    applyContingencyPlanAssetLimitDraw(result.state, action.playerId, action.cardIds);
  }
  if (action.type === 'resolve_battle_reveal') {
    applyFealtyBattleEffects(result.state);
  }

  return result;
}
