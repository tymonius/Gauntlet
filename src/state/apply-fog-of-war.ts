import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyOperationalReassessmentGameAction } from './apply-operational-reassessment';
import { continueIntelligenceBattle } from './intelligence-battle';
import { resolveFogOfWarBattleChoice } from './intelligence-fog-of-war-battle';
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

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'fog_of_war_return') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    resolveFogOfWarBattleChoice(next, action);
    continueIntelligenceBattle(next);
    openPostRevealWindows(next, previousStage);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  return applyOperationalReassessmentGameAction(game, action);
}
