import type { GameState } from '../types';
import type { AppStateAction, PlayBattleDrawCardAction } from './actions';
import { applyGameAction as applyBaseGameAction } from './apply';
import {
  openSurveillanceWindowAfterChoice,
  prepareDeferredBattleDrawReveal,
  resolveIntelligenceBattleChoice,
  restoreDeferredBattleDrawReveal,
} from './intelligence-battle';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { openNextFinancierChoice } from './financier-battle-cards';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openMilitaryAfterRevealWindows } from './military-timing';
import { abortIntelligenceMission, completeIntelligenceMission, completeSpecialOperation, startIntelligenceMission } from './intelligence-missions';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

function continueAfterIntelligenceReveal(game: GameState, previousStage?: string): void {
  if (previousStage === 'dice' || game.battle?.stage !== 'dice') return;
  openMilitaryAfterRevealWindows(game);
  buildFinancierPreDiceChoices(game);
  openNextFinancierChoice(game);
  if (!game.pendingFinancierChoice && !game.financierChoiceQueue?.length) maybeOpenSubsidizeWindow(game);
}

function applyBattleDrawChoice(game: GameState, action: PlayBattleDrawCardAction): ApplyGameActionResult {
  const working = structuredClone(game);
  const deferred = prepareDeferredBattleDrawReveal(working, action);
  const result = applyBaseGameAction(working, action);
  restoreDeferredBattleDrawReveal(result.state, deferred);
  openSurveillanceWindowAfterChoice(result.state, action.playerId, action.cardId, 'battle_draw');
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (game.pendingIntelligenceChoice && action.type !== 'resolve_intelligence_choice') {
    throw new GameActionError('Resolve the pending Intelligence choice first.');
  }
  if (action.type === 'resolve_intelligence_choice') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    resolveIntelligenceBattleChoice(next, action);
    continueAfterIntelligenceReveal(next, previousStage);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
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
  if (action.type === 'play_battle_draw_card') return applyBattleDrawChoice(game, action);

  const result = applyBaseGameAction(game, action);
  if (action.type === 'commit_battle_hand_card') {
    openSurveillanceWindowAfterChoice(result.state, action.playerId, action.cardId, 'hand');
  }
  return result;
}
