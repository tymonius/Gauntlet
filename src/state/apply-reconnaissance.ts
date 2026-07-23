import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyInterceptedOrdersGameAction } from './apply-intercepted-orders';
import {
  openNextReconnaissanceBattleWindow,
  resolveReconnaissanceBattleChoice,
} from './intelligence-reconnaissance-battle';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'reconnaissance_battle_withdraw') {
    const next = structuredClone(game);
    const result = resolveReconnaissanceBattleChoice(next, action);
    if (result === 'stay') openNextReconnaissanceBattleWindow(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_battle_reveal') {
    const next = structuredClone(game);
    if (openNextReconnaissanceBattleWindow(next)) {
      runPostActionAutomationPipeline(next);
      return { state: next };
    }
  }

  return applyInterceptedOrdersGameAction(game, action);
}
