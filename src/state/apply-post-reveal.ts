import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyInterceptedOrdersGameAction } from './apply-intercepted-orders';
import { resolveOperationalReassessmentBattleChoice } from './intelligence-operational-reassessment-battle';
import { openNextIntelligencePostRevealWindow } from './intelligence-post-reveal';
import { resolveReconnaissanceBattleChoice } from './intelligence-reconnaissance-battle';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'reconnaissance_battle_withdraw') {
    const next = structuredClone(game);
    const result = resolveReconnaissanceBattleChoice(next, action);
    if (result === 'stay') openNextIntelligencePostRevealWindow(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'operational_reassessment_battle') {
    const next = structuredClone(game);
    resolveOperationalReassessmentBattleChoice(next, action);
    openNextIntelligencePostRevealWindow(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_battle_reveal') {
    const next = structuredClone(game);
    if (openNextIntelligencePostRevealWindow(next)) {
      runPostActionAutomationPipeline(next);
      return { state: next };
    }
  }

  return applyInterceptedOrdersGameAction(game, action);
}
