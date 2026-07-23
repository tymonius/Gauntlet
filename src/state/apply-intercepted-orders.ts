import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFogOfWarGameAction } from './apply-fog-of-war';
import { continueIntelligenceBattle, openSurveillanceWindowAfterChoice } from './intelligence-battle';
import {
  resolveInterceptedOrdersBattleReplacement,
  resolveInterceptedOrdersBattleSelection,
} from './intelligence-intercepted-orders-battle';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { openNextFinancierChoice } from './financier-battle-cards';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openMilitaryAfterRevealWindows } from './military-timing';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function openPostRevealWindows(game: GameState, previousStage?: string): void {
  if (previousStage === 'dice' || game.battle?.stage !== 'dice') return;
  openMilitaryAfterRevealWindows(game);
  buildFinancierPreDiceChoices(game);
  openNextFinancierChoice(game);
  if (!game.pendingFinancierChoice && !game.financierChoiceQueue?.length) maybeOpenSubsidizeWindow(game);
}

function continueAfterChoice(game: GameState, previousStage?: string): void {
  if (game.pendingIntelligenceChoice) return;
  continueIntelligenceBattle(game);
  openPostRevealWindows(game, previousStage);
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'intercepted_orders_battle_select') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    resolveInterceptedOrdersBattleSelection(next, action);
    continueAfterChoice(next, previousStage);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'intercepted_orders_battle_replacement') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    const replacementCardId = resolveInterceptedOrdersBattleReplacement(next, action);
    if (replacementCardId) {
      openSurveillanceWindowAfterChoice(next, action.playerId, replacementCardId, 'battle_draw');
    }
    continueAfterChoice(next, previousStage);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  return applyFogOfWarGameAction(game, action);
}
