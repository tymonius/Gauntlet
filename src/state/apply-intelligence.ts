import type { GameState } from '../types';
import type { AppStateAction, PlayBattleDrawCardAction } from './actions';
import { applyGameAction as applyBaseGameAction } from './apply';
import {
  applyIntelligenceActionEffect,
  canResolveIntelligenceAction,
  isIntegratedIntelligenceActionCard,
  resolveIntelligenceActionChoice,
} from './intelligence-action-cards';
import {
  openSurveillanceWindowAfterChoice,
  prepareDeferredBattleDrawReveal,
  resolveIntelligenceBattleChoice,
  restoreDeferredBattleDrawReveal,
} from './intelligence-battle';
import { openCensureChoiceAfterAction } from './diplomat-persistent';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { openNextFinancierChoice } from './financier-battle-cards';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openMissionControlWindow, resolveIntelligenceLeaderChoice } from './intelligence-leaders';
import { recordFaceDownCardObservedBeforeReveal } from './intelligence-mission-triggers';
import { openMilitaryAfterRevealWindows } from './military-timing';
import { abortIntelligenceMission, completeIntelligenceMission, completeSpecialOperation, startIntelligenceMission } from './intelligence-missions';
import { runPostActionAutomationPipeline } from './pipeline';
import { applyGameAction as applyReducerGameAction, GameActionError, type ApplyGameActionResult } from './reducer';

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

function applyStandaloneIntelligenceAction(
  game: GameState,
  action: Extract<AppStateAction, { type: 'play_action_card' }>,
): ApplyGameActionResult {
  if (game.pendingMilitaryChoice || game.pendingMilitaryTimingChoice || game.pendingDiplomatChoice || game.pendingFinancierChoice || game.pendingLeaderAbilityWindow) {
    throw new GameActionError('Resolve the pending choice first.');
  }
  if (!canResolveIntelligenceAction(game, action.playerId, action.cardId)) {
    throw new GameActionError(`${action.cardId} cannot resolve in the current state.`);
  }
  const result = applyReducerGameAction(game, action);
  applyIntelligenceActionEffect(result.state, action.playerId, action.cardId);
  if (!result.state.pendingIntelligenceChoice) openCensureChoiceAfterAction(result.state, action.playerId);
  runPostActionAutomationPipeline(result.state);
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (game.pendingIntelligenceChoice && action.type !== 'resolve_intelligence_choice') {
    throw new GameActionError('Resolve the pending Intelligence choice first.');
  }
  if (action.type === 'resolve_intelligence_choice') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    const pending = next.pendingIntelligenceChoice;
    const pendingKind = pending?.kind;
    const wasActionChoice = pendingKind === 'spies_discard' || pendingKind === 'assassins_discard' || pendingKind === 'operational_reassessment';
    if (pendingKind === 'mission_control' || pendingKind === 'fieldcraft') resolveIntelligenceLeaderChoice(next, action);
    else if (wasActionChoice) resolveIntelligenceActionChoice(next, action);
    else resolveIntelligenceBattleChoice(next, action);
    if (pending?.kind === 'surveillance' && action.choice === 'surveil') {
      recordFaceDownCardObservedBeforeReveal(next, action.playerId, pending.battleId, 'surveillance');
    }
    if (!wasActionChoice && pendingKind !== 'mission_control' && pendingKind !== 'fieldcraft') continueAfterIntelligenceReveal(next, previousStage);
    if (wasActionChoice && !next.pendingIntelligenceChoice) openCensureChoiceAfterAction(next, action.playerId);
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
    openMissionControlWindow(next, action.playerId);
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
  if (action.type === 'play_action_card' && isIntegratedIntelligenceActionCard(action.cardId)) {
    return applyStandaloneIntelligenceAction(game, action);
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
