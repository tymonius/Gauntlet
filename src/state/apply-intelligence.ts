import type { BattleParticipantState, CardID, GameState, PlayerID } from '../types';
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
import { availableBattleHandCards } from './battle-hand-restrictions';
import { applyBattleDiceRoll, clearBattleDiceForReroll } from './battle-dice';
import { openCensureChoiceAfterAction } from './diplomat-persistent';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { openNextFinancierChoice } from './financier-battle-cards';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openMissionControlWindow, resolveIntelligenceLeaderChoice } from './intelligence-leaders';
import { recordFaceDownCardObservedBeforeReveal } from './intelligence-mission-triggers';
import {
  INTELLIGENCE_REACTIVE_ASSETS,
  openExfiltrationWindow,
  openInterceptedOrdersWindow,
  openReconnaissanceWindow,
  resolveIntelligenceReactiveAssetChoice,
} from './intelligence-reactive-assets';
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

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in the battle.`);
}

function isolateSelectedBattleHandCard(game: GameState, playerId: PlayerID, cardId: CardID): Map<CardID, CardID> {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  const participant = participantFor(game, playerId);
  if (!availableBattleHandCards(battle, participant).includes(cardId)) {
    throw new GameActionError(`${cardId} cannot be chosen from this Battle Hand.`);
  }
  const blockedCount = (battle.blockedBattleDrawCards?.[playerId] ?? []).filter((candidate) => candidate === cardId).length;
  let occurrence = 0;
  let keptSelectable = false;
  const sentinels = new Map<CardID, CardID>();
  participant.battleDraw = participant.battleDraw.map((candidate, index) => {
    if (candidate !== cardId) return candidate;
    occurrence += 1;
    if (occurrence > blockedCount && !keptSelectable) {
      keptSelectable = true;
      return candidate;
    }
    const sentinel = `__isolated_battle_hand_${playerId}_${index}_${cardId}`;
    sentinels.set(sentinel, cardId);
    return sentinel;
  });
  return sentinels;
}

function restoreIsolatedBattleHandCards(game: GameState, playerId: PlayerID, sentinels: Map<CardID, CardID>): void {
  if (!game.battle || sentinels.size === 0) return;
  const participant = participantFor(game, playerId);
  participant.battleDraw = participant.battleDraw.map((cardId) => sentinels.get(cardId) ?? cardId);
}

function applyBattleDrawChoice(game: GameState, action: PlayBattleDrawCardAction): ApplyGameActionResult {
  const working = structuredClone(game);
  const deferred = prepareDeferredBattleDrawReveal(working, action);
  const sentinels = isolateSelectedBattleHandCard(working, action.playerId, action.cardId);
  const result = applyBaseGameAction(working, action);
  restoreIsolatedBattleHandCards(result.state, action.playerId, sentinels);
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

function isIntelligenceActionChoice(kind?: string): boolean {
  return kind === 'spies_discard' || kind === 'assassins_discard' || kind === 'operational_reassessment';
}

function isIntelligenceReactiveAssetChoice(kind?: string): boolean {
  return kind === 'exfiltration'
    || kind === 'reconnaissance'
    || kind === 'reconnaissance_withdraw'
    || kind === 'intercepted_orders'
    || kind === 'intercepted_orders_select'
    || kind === 'deep_cover';
}

function preemptAutomaticBattleStartWindowsForReconnaissance(game: GameState): void {
  const battle = game.battle;
  if (!battle) return;
  const attacker = game.players[battle.attacker.playerId];
  if (!attacker?.intelligence || !attacker.zones.assetBank.includes(INTELLIGENCE_REACTIVE_ASSETS.reconnaissance)) return;
  game.pendingDiplomatChoice = undefined;
  game.pendingMilitaryTimingChoice = undefined;
  game.militaryTimingChoiceQueue = undefined;
  game.priorityPlayer = battle.attacker.playerId;
  openReconnaissanceWindow(game);
}

function validateInterferenceReplacement(game: GameState, action: Extract<AppStateAction, { type: 'resolve_intelligence_choice' }>): void {
  const pending = game.pendingIntelligenceChoice;
  if (pending?.kind !== 'interference_replacement' || pending.source !== 'battle_draw' || action.choice !== 'select' || !action.cardId) return;
  const battle = game.battle;
  if (!battle || !availableBattleHandCards(battle, participantFor(game, pending.playerId)).includes(action.cardId)) {
    throw new GameActionError(`${action.cardId} cannot be chosen from this Battle Hand.`);
  }
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (game.pendingIntelligenceChoice && action.type !== 'resolve_intelligence_choice') {
    throw new GameActionError('Resolve the pending Intelligence choice first.');
  }
  if (action.type === 'resolve_intelligence_choice') {
    validateInterferenceReplacement(game, action);
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    const pending = next.pendingIntelligenceChoice;
    const pendingKind = pending?.kind;
    const wasActionChoice = isIntelligenceActionChoice(pendingKind);
    const wasReactiveAssetChoice = isIntelligenceReactiveAssetChoice(pendingKind);
    if (pendingKind === 'mission_control' || pendingKind === 'fieldcraft') resolveIntelligenceLeaderChoice(next, action);
    else if (wasActionChoice) resolveIntelligenceActionChoice(next, action);
    else if (wasReactiveAssetChoice) resolveIntelligenceReactiveAssetChoice(next, action);
    else resolveIntelligenceBattleChoice(next, action);
    if (pending?.kind === 'surveillance' && action.choice === 'surveil') {
      recordFaceDownCardObservedBeforeReveal(next, action.playerId, pending.battleId, 'surveillance');
    }
    if (!wasActionChoice && !wasReactiveAssetChoice && pendingKind !== 'mission_control' && pendingKind !== 'fieldcraft') {
      continueAfterIntelligenceReveal(next, previousStage);
    }
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
    if (!openExfiltrationWindow(next, action.playerId, 'complete')) openMissionControlWindow(next, action.playerId);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  if (action.type === 'abort_intelligence_mission') {
    const next = structuredClone(game);
    abortIntelligenceMission(next, action.playerId);
    openExfiltrationWindow(next, action.playerId, 'abort');
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
  if (action.type === 'roll_battle_die') {
    if (game.battle?.stage === 'dice' && !game.battle.effectsResolved.includes('before_battle_resolution')) {
      throw new GameActionError('Revealed Battle effects must resolve before dice are rolled.');
    }
    return applyBattleDiceRoll(game, action);
  }
  if (action.type === 'play_battle_draw_card') return applyBattleDrawChoice(game, action);

  const hadBattle = Boolean(game.battle);
  const result = applyBaseGameAction(game, action);
  if (action.type === 'move_player' && !hadBattle && result.state.battle) preemptAutomaticBattleStartWindowsForReconnaissance(result.state);
  if (action.type === 'commit_battle_hand_card') {
    openSurveillanceWindowAfterChoice(result.state, action.playerId, action.cardId, 'hand');
  }
  if (action.type === 'draw_battle_cards') openInterceptedOrdersWindow(result.state, action.playerId);
  if (action.type === 'resolve_battle' && result.state.battle?.stage === 'dice') {
    clearBattleDiceForReroll(result.state.battle.attacker);
    clearBattleDiceForReroll(result.state.battle.defender);
  }
  return result;
}
