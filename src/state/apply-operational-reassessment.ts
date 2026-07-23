import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applySpiesGameAction } from './apply-spies';
import {
  moveOperationalReassessmentReplacementsToGraveyard,
  openNextOperationalReassessmentBattleWindow,
  operationalReassessmentReplacementCards,
  resolveOperationalReassessmentBattleChoice,
} from './intelligence-operational-reassessment-battle';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'operational_reassessment_battle') {
    const next = structuredClone(game);
    resolveOperationalReassessmentBattleChoice(next, action);
    openNextOperationalReassessmentBattleWindow(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_battle_reveal') {
    const next = structuredClone(game);
    if (openNextOperationalReassessmentBattleWindow(next)) {
      runPostActionAutomationPipeline(next);
      return { state: next };
    }
    return applySpiesGameAction(game, action);
  }

  if (action.type === 'resolve_battle') {
    const replacements = operationalReassessmentReplacementCards(game);
    const result = applySpiesGameAction(game, action);
    moveOperationalReassessmentReplacementsToGraveyard(result.state, replacements);
    return result;
  }

  return applySpiesGameAction(game, action);
}
