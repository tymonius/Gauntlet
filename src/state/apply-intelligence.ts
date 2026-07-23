import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyBaseGameAction } from './apply';
import { abortIntelligenceMission, completeIntelligenceMission, completeSpecialOperation, startIntelligenceMission } from './intelligence-missions';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
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
  if (action.type === 'roll_battle_die' && game.battle?.stage === 'dice' && !game.battle.effectsResolved.includes('before_battle_resolution')) {
    throw new GameActionError('Revealed Battle effects must resolve before dice are rolled.');
  }
  return applyBaseGameAction(game, action);
}
