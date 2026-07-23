import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFogOfWarGameAction } from './apply-fog-of-war';
import { continueIntelligenceBattle, openSurveillanceWindowAfterChoice } from './intelligence-battle';
import {
  resolveInterceptedOrdersBattleReplacement,
  resolveInterceptedOrdersBattleSelection,
} from './intelligence-intercepted-orders-battle';
import { continueIntelligencePostRevealFlow } from './intelligence-post-reveal-flow';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function continueAfterChoice(game: GameState): void {
  if (game.pendingIntelligenceChoice) return;
  continueIntelligenceBattle(game);
  continueIntelligencePostRevealFlow(game);
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'intercepted_orders_battle_select') {
    const next = structuredClone(game);
    resolveInterceptedOrdersBattleSelection(next, action);
    continueAfterChoice(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'intercepted_orders_battle_replacement') {
    const next = structuredClone(game);
    const replacementCardId = resolveInterceptedOrdersBattleReplacement(next, action);
    if (replacementCardId) {
      openSurveillanceWindowAfterChoice(next, action.playerId, replacementCardId, 'battle_draw');
    }
    continueAfterChoice(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  return applyFogOfWarGameAction(game, action);
}
