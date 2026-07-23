import type { GameState } from '../types';
import type { StateAction } from './actions';
import { applyGameAction as applyBaseGameAction } from './apply';
import { abortIntelligenceMission, completeIntelligenceMission, completeSpecialOperation, startIntelligenceMission } from './intelligence-missions';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: StateAction): ApplyGameActionResult {
  if (action.type === 'start_intelligence_mission') {
    const next = structuredClone(game);
    startIntelligenceMission(next, action.playerId, action.cardId, action.kind);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  if (action.type === 'complete_intelligence_mission') {
    const next = structuredClone(game);
    completeIntelligenceMission(next, action.playerId);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  if (action.type === 'abort_intelligence_mission') {
    const next = structuredClone(game);
    abortIntelligenceMission(next, action.playerId);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  if (action.type === 'complete_special_operation') {
    const next = structuredClone(game);
    completeSpecialOperation(next, action.playerId);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  return applyBaseGameAction(game, action);
}
