import type { GameState, PlayerID } from '../types';
import type {
  AppStateAction,
  FinishMovementAction,
  ResolveNeutralChoiceAction,
  UseNeutralReinforcementsAssetAction,
} from './actions';
import { applyGameAction as applyFactionGameAction } from './apply-inquisition';
import { continueIntelligenceBattle } from './intelligence-battle';
import {
  ADVANCE_GUARD,
  applyAdvanceGuardAction,
  applyAdvanceGuardBattleEffects,
  clearAdvanceGuardMovement,
  moveUsesAdvanceGuardPosition,
  prepareAdvanceGuardAction,
  reconcileAdvanceGuardMove,
  requireAdvanceGuardActionTiming,
  requireAdvanceGuardHandCommitAllowed,
} from './neutral-advance-guard';
import {
  applyConsolidationAction,
  applyConsolidationAfterBattle,
  CONSOLIDATION,
  prepareConsolidationAction,
} from './neutral-consolidation';
import { applyContingencyPlanAssetLimitDraw } from './neutral-contingency-plan';
import {
  applyContrabandAction,
  CONTRABAND,
  prepareContrabandAction,
  resolveContrabandChoice,
} from './neutral-contraband';
import {
  processCounterworksOverlayQueue,
  resolveCounterworksChoice,
} from './neutral-counterworks';
import {
  applyCourtMartialBattleEffects,
  processCourtMartialCleanupQueue,
  queueCourtMartialCleanup,
  resolveCourtMartialChoice,
} from './neutral-court-martial';
import {
  applyConscriptionAction,
  beginConscriptionAssetPlay,
  CONSCRIPTION,
  finishConscriptionAssetPlay,
  prepareConscriptionAction,
  resolveConscriptionChoice,
} from './neutral-conscription';
import {
  captureDecoysAssetSnapshot,
  openNextDecoysChoice,
  registerDecoysAssetExits,
  resolveDecoysChoice,
} from './neutral-decoys';
import {
  applyDisruptionAction,
  DISRUPTION,
  prepareDisruptionAction,
} from './neutral-disruption';
import {
  applyEntrenchmentBattleEffects,
  applyEntrenchmentMovementTrigger,
  clearExpiredEntrenchmentLocks,
  requireEntrenchmentActionAllowed,
} from './neutral-entrenchment';
import { applyFealtyBattleEffects } from './neutral-fealty';
import {
  applyFootholdBattleCleanupDraw,
  applyFootholdBattleEffects,
  openNextFootholdChoice,
  queueFootholdAssetChoices,
  resolveFootholdChoice,
} from './neutral-foothold';
import {
  openPalisadeWallAssetChoice,
  resolvePalisadeWallChoice,
} from './neutral-palisade-wall';
import {
  applyForcedMarchAction,
  applyForcedMarchBattleEffects,
  clearRestrictedMovementForTurnTransition,
  finishRemainingMovement,
  FORCED_MARCH,
  forcedMarchMoveWouldInitiateBattle,
  reconcileForcedMarchMove,
  requireBattleCapableMovement,
  requireForcedMarchActionTiming,
} from './neutral-forced-march';
import {
  applyNewRecruitsAction,
  applyNewRecruitsBattleEffects,
  NEW_RECRUITS,
  prepareNewRecruitsAction,
} from './neutral-new-recruits';
import {
  applyPathfindersAction,
  applyPathfindersBattleEffects,
  PATHFINDERS,
  preparePathfindersAction,
} from './neutral-pathfinders';
import {
  applyRallyingCryAction,
  applyRallyingCryBattleEffects,
  prepareRallyingCryAction,
  RALLYING_CRY,
} from './neutral-rallying-cry';
import {
  applyRedemptionBattleReturns,
  captureDiscardSnapshot,
  openNextRedemptionChoice,
  prepareRedemptionBattleResolution,
  redemptionEffectSourcePlayer,
  registerRedemptionDiscardEntries,
  resolveRedemptionChoice,
} from './neutral-redemption';
import {
  clearReinforcementsActionOpportunity,
  consumeReinforcementsActionOpportunity,
  prepareReinforcementsBattleReveal,
  resolveReinforcementsChoice,
  useReinforcementsAsset,
} from './neutral-reinforcements';
import {
  applyRequisitionAction,
  openNextRequisitionChoice,
  prepareRequisitionAction,
  queueRequisitionBattleChoices,
  REQUISITION,
  resolveRequisitionChoice,
} from './neutral-requisition';
import {
  applySabotageAction,
  prepareSabotageAction,
  reconcileSabotageAssetState,
  restoreSabotagedAssetsAtTurnStart,
  SABOTAGE,
} from './neutral-sabotage';
import {
  applySalvageAction,
  openNextSalvageChoice,
  prepareSalvageAction,
  queueSalvageBattleChoices,
  resolveSalvageChoice,
  SALVAGE,
} from './neutral-salvage';
import {
  applyScorchedEarthBattleRuins,
  openNextScorchedEarthChoice,
  queueScorchedEarthAssetChoices,
  resolveScorchedEarthChoice,
} from './neutral-scorched-earth';
import {
  applyStandGroundBattleEffects,
  resolveStandGroundChoice,
} from './neutral-stand-ground';
import {
  applyStrategicWithdrawalAction,
  prepareStrategicWithdrawalAction,
  resolveStrategicWithdrawalChoice,
  STRATEGIC_WITHDRAWAL,
} from './neutral-strategic-withdrawal';
import {
  applyTacticalPlanningAction,
  prepareTacticalPlanningAction,
  resolveTacticalPlanningChoice,
  TACTICAL_PLANNING,
} from './neutral-tactical-planning';
import {
  applyValorAssetDraw,
  openNextValorReroll,
  resolveValorChoice,
} from './neutral-valor';
import {
  applySeditionBattleBonuses,
  prepareSeditionBattleReveal,
  queueSeditionActionChoice,
  resolveSeditionChoice,
  SEDITION,
} from './neutral-sedition';
import {
  applyRousingSpeechBattleEffects,
  captureRousingSpeechAssetSnapshot,
  openNextRousingSpeechChoice,
  registerRousingSpeechAssetTriggers,
  resolveRousingSpeechChoice,
} from './neutral-rousing-speech';
import {
  applyReservesAction,
  applyReservesBattleTopdecks,
  prepareReservesAction,
  prepareReservesBattleResolution,
  RESERVES,
  resolveReservesChoice,
} from './neutral-reserves';
import {
  applyScoutingReportAction,
  prepareScoutingReportAction,
  resolveScoutingReportChoice,
  SCOUTING_REPORT,
} from './neutral-scouting-report';
import {
  openNextSuppliesChoice,
  queueSuppliesAfterNormalDraw,
  queueSuppliesBattleEffects,
  resolveSuppliesChoice,
} from './neutral-supplies';
import { activeBankedAssetCopies } from './banked-assets';
import { type ApplyGameActionResult, GameActionError } from './reducer';
import {
  clearExpiredPathfindersSuppressions,
  territoryPrintedEffectIsActive,
} from './territory-printed-effects';

export type NeutralAppStateAction = AppStateAction | FinishMovementAction | ResolveNeutralChoiceAction | UseNeutralReinforcementsAssetAction;

function continueNeutralChoices(game: GameState): void {
  processCounterworksOverlayQueue(game);
  if (game.pendingNeutralChoice) return;
  processCourtMartialCleanupQueue(game);
  if (game.pendingNeutralChoice) return;
  openPalisadeWallAssetChoice(game);
  openNextDecoysChoice(game);
  openNextRequisitionChoice(game);
  openNextRousingSpeechChoice(game);
  openNextScorchedEarthChoice(game);
  openNextSalvageChoice(game);
  openNextSuppliesChoice(game);
  openNextFootholdChoice(game);
  openNextRedemptionChoice(game);
  openNextValorReroll(game);
}

function latestResolvedBattleWinner(game: GameState): PlayerID | undefined {
  const event = [...game.log].reverse().find((candidate) => candidate.type === 'battle_resolved');
  return (event?.payload as { winner?: PlayerID } | undefined)?.winner;
}

/**
 * Outermost card-integration layer for canonical Neutral cards. Neutral effects
 * apply to every faction and therefore sit above the faction-specific stack.
 */
export function applyGameAction(game: GameState, action: NeutralAppStateAction): ApplyGameActionResult {
  if (game.pendingNeutralChoice?.kind === 'conscription_action' && action.type === 'play_action_card') {
    const next = structuredClone(game);
    const snapshot = beginConscriptionAssetPlay(next, action);
    const result = applyGameAction(next, action);
    finishConscriptionAssetPlay(result.state, action.playerId, snapshot);
    return result;
  }
  if (game.pendingNeutralChoice) {
    if (action.type !== 'resolve_neutral_choice') {
      throw new GameActionError('Resolve the pending Neutral choice first.');
    }
    const next = structuredClone(game);
    const pendingKind = game.pendingNeutralChoice.kind;
    const resolved = pendingKind === 'decoys_asset'
      ? (resolveDecoysChoice(next, action), {})
      : pendingKind.startsWith('supplies_')
        ? (resolveSuppliesChoice(next, action), {})
        : pendingKind === 'foothold_asset'
          ? (resolveFootholdChoice(next, action), {})
          : pendingKind === 'palisade_wall_asset'
            ? (resolvePalisadeWallChoice(next, action), {})
            : pendingKind === 'reinforcements_battle'
              ? resolveReinforcementsChoice(next, action)
              : pendingKind === 'requisition_battle'
                ? (resolveRequisitionChoice(next, action), {})
                : pendingKind.startsWith('rousing_speech_')
                  ? (resolveRousingSpeechChoice(next, action), {})
                  : pendingKind.startsWith('sedition_')
                    ? resolveSeditionChoice(next, action)
                    : pendingKind === 'stand_ground_movement'
                      ? resolveStandGroundChoice(next, action)
                      : pendingKind === 'strategic_withdrawal_battle'
                        ? resolveStrategicWithdrawalChoice(next, action)
                        : pendingKind === 'tactical_planning_action'
                          ? (resolveTacticalPlanningChoice(next, action), {})
                          : pendingKind === 'conscription_action'
                            ? (resolveConscriptionChoice(next, action), {})
                          : pendingKind === 'contraband_battle'
                            ? resolveContrabandChoice(next, action)
                            : pendingKind.startsWith('counterworks_')
                              ? resolveCounterworksChoice(next, action)
                              : pendingKind.startsWith('court_martial_')
                                ? (resolveCourtMartialChoice(next, action), {})
                          : pendingKind === 'valor_battle'
                            ? (resolveValorChoice(next, action), {})
                    : pendingKind === 'scorched_earth_asset'
                      ? (resolveScorchedEarthChoice(next, action), {})
                      : pendingKind.startsWith('salvage_')
                      ? (resolveSalvageChoice(next, action), {})
                      : pendingKind.startsWith('scouting_report_')
                      ? resolveScoutingReportChoice(next, action)
                      : pendingKind.startsWith('reserves_')
                        ? resolveReservesChoice(next, action)
                        : resolveRedemptionChoice(next, action);
    if ('deferredBattleAction' in resolved && resolved.deferredBattleAction) {
      return applyGameAction(next, resolved.deferredBattleAction);
    }
    const deferredMilitaryAction = 'deferredMilitaryAction' in resolved
      ? resolved.deferredMilitaryAction as NeutralAppStateAction | undefined
      : undefined;
    if (deferredMilitaryAction) {
      return applyGameAction(next, deferredMilitaryAction);
    }
    if ('resumeBattleReveal' in resolved && resolved.resumeBattleReveal) {
      continueIntelligenceBattle(next);
    }
    reconcileSabotageAssetState(next);
    continueNeutralChoices(next);
    return { state: next };
  }
  if (action.type === 'resolve_neutral_choice') {
    throw new GameActionError(`${action.playerId} has no pending Neutral choice.`);
  }

  if (action.type === 'use_neutral_reinforcements_asset') {
    const next = structuredClone(game);
    useReinforcementsAsset(next, action);
    reconcileSabotageAssetState(next);
    return { state: next };
  }

  if (action.type === 'resolve_battle_reveal') {
    const prepared = structuredClone(game);
    if (prepareReinforcementsBattleReveal(prepared, action)) return { state: prepared };
    if (prepareSeditionBattleReveal(prepared, action)) return { state: prepared };
    game = prepared;
  }

  if (action.type === 'finish_movement') {
    const next = structuredClone(game);
    finishRemainingMovement(next, action.playerId);
    clearAdvanceGuardMovement(next, action.playerId);
    reconcileSabotageAssetState(next);
    return { state: next };
  }

  if (game.phase === 'turn_start') {
    const restored = structuredClone(game);
    restoreSabotagedAssetsAtTurnStart(restored);
    reconcileSabotageAssetState(restored);
    game = restored;
  }

  const rousingSpeechAssetsBefore = captureRousingSpeechAssetSnapshot(game);
  const effectSourcePlayerId = redemptionEffectSourcePlayer(game, action);
  const discardBefore = effectSourcePlayerId ? captureDiscardSnapshot(game) : undefined;
  const assetsBefore = effectSourcePlayerId ? captureDecoysAssetSnapshot(game) : undefined;
  const priorBattle = game.battle ? structuredClone(game.battle) : undefined;
  const priorBattleId = priorBattle?.id;
  const priorBattleController = priorBattle
    ? game.board.spaces.find((space) => space.id === priorBattle.location)?.controller
    : undefined;
  const contingencyPlanActiveCopiesBefore = action.type === 'resolve_asset_bank_discard'
    ? activeBankedAssetCopies(game, action.playerId, 'neutral-contingency-plan')
    : 0;
  const normalDraw = action.type === 'draw_card' && game.phase === 'turn_start';
  const movementOriginSpaceId = action.type === 'move_player'
    ? game.board.spaces.find((space) => space.occupant === action.playerId)?.id
    : undefined;

  if (action.type === 'play_action_card') {
    requireEntrenchmentActionAllowed(game, action.playerId);
  }
  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    requireForcedMarchActionTiming(game, action.playerId);
  }
  if (action.type === 'play_action_card' && action.cardId === ADVANCE_GUARD) {
    requireAdvanceGuardActionTiming(game, action.playerId);
  }
  if (action.type === 'commit_battle_hand_card') {
    requireAdvanceGuardHandCommitAllowed(game, action.playerId);
  }
  const preparedAdvanceGuard = action.type === 'play_action_card' && action.cardId === ADVANCE_GUARD
    ? prepareAdvanceGuardAction(game, action)
    : undefined;
  const preparedConsolidation = action.type === 'play_action_card' && action.cardId === CONSOLIDATION
    ? prepareConsolidationAction(game, action)
    : undefined;
  const preparedDisruption = action.type === 'play_action_card' && action.cardId === DISRUPTION
    ? prepareDisruptionAction(game, action)
    : undefined;
  const preparedNewRecruits = action.type === 'play_action_card' && action.cardId === NEW_RECRUITS
    ? prepareNewRecruitsAction(game, action)
    : undefined;
  const preparedPathfinders = action.type === 'play_action_card' && action.cardId === PATHFINDERS
    ? preparePathfindersAction(game, action)
    : undefined;
  const preparedRallyingCry = action.type === 'play_action_card' && action.cardId === RALLYING_CRY
    ? prepareRallyingCryAction(game, action)
    : undefined;
  const preparedRequisition = action.type === 'play_action_card' && action.cardId === REQUISITION
    ? prepareRequisitionAction(game, action)
    : undefined;
  const preparedReserves = action.type === 'play_action_card' && action.cardId === RESERVES
    ? prepareReservesAction(game, action)
    : undefined;
  const preparedScoutingReport = action.type === 'play_action_card' && action.cardId === SCOUTING_REPORT
    ? prepareScoutingReportAction(game, action)
    : undefined;
  const preparedSabotage = action.type === 'play_action_card' && action.cardId === SABOTAGE
    ? prepareSabotageAction(game, action)
    : undefined;
  const preparedSalvage = action.type === 'play_action_card' && action.cardId === SALVAGE
    ? prepareSalvageAction(game, action)
    : undefined;
  const preparedStrategicWithdrawal = action.type === 'play_action_card' && action.cardId === STRATEGIC_WITHDRAWAL
    ? prepareStrategicWithdrawalAction(game, action)
    : undefined;
  const preparedTacticalPlanning = action.type === 'play_action_card' && action.cardId === TACTICAL_PLANNING
    ? prepareTacticalPlanningAction(game, action)
    : undefined;
  const preparedConscription = action.type === 'play_action_card' && action.cardId === CONSCRIPTION
    ? prepareConscriptionAction(game, action)
    : undefined;
  const preparedContraband = action.type === 'play_action_card' && action.cardId === CONTRABAND
    ? prepareContrabandAction(game, action)
    : undefined;

  const restrictedBefore = action.type === 'move_player'
    ? game.players[action.playerId]?.nonBattleMovementRemaining ?? 0
    : 0;
  const usedAdvanceGuardPosition = action.type === 'move_player'
    ? moveUsesAdvanceGuardPosition(game, action.playerId)
    : false;
  const initiatedBattle = action.type === 'move_player'
    ? forcedMarchMoveWouldInitiateBattle(game, action.playerId, action.toSpaceId)
    : false;
  if (action.type === 'move_player') {
    requireBattleCapableMovement(game, action.playerId, action.toSpaceId);
  }

  let gameForApplication = game;
  if (action.type === 'resolve_battle') {
    const prepared = structuredClone(game);
    if (prepareRedemptionBattleResolution(prepared, action)) {
      return { state: prepared };
    }
    if (prepareReservesBattleResolution(prepared, action)) {
      return { state: prepared };
    }
    gameForApplication = prepared;
  }

  const result = applyFactionGameAction(gameForApplication, action);

  if (action.type === 'play_action_card') {
    consumeReinforcementsActionOpportunity(result.state, action.playerId);
  }

  if (action.type === 'play_action_card' && preparedAdvanceGuard) {
    applyAdvanceGuardAction(result.state, action.playerId, preparedAdvanceGuard);
  }
  if (action.type === 'play_action_card' && preparedConsolidation) {
    const drawnCards = applyConsolidationAction(result.state, action.playerId, preparedConsolidation);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedDisruption) {
    applyDisruptionAction(result.state, action.playerId, preparedDisruption);
  }
  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    applyForcedMarchAction(result.state, action.playerId);
  }
  if (action.type === 'play_action_card' && preparedNewRecruits) {
    const drawnCards = applyNewRecruitsAction(result.state, action.playerId, preparedNewRecruits);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedPathfinders) {
    applyPathfindersAction(result.state, action.playerId, preparedPathfinders);
  }
  if (action.type === 'play_action_card' && preparedRallyingCry) {
    const drawnCards = applyRallyingCryAction(result.state, action.playerId, preparedRallyingCry);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedRequisition) {
    const drawnCards = applyRequisitionAction(result.state, action.playerId, preparedRequisition);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedReserves) {
    const drawnCards = applyReservesAction(result.state, action.playerId, preparedReserves);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedScoutingReport) {
    applyScoutingReportAction(result.state, action.playerId, preparedScoutingReport);
  }
  if (action.type === 'play_action_card' && preparedSabotage) {
    applySabotageAction(result.state, action.playerId, preparedSabotage);
  }
  if (action.type === 'play_action_card' && preparedSalvage) {
    applySalvageAction(result.state, action.playerId, preparedSalvage);
  }
  if (action.type === 'play_action_card' && preparedStrategicWithdrawal) {
    applyStrategicWithdrawalAction(result.state, action.playerId, preparedStrategicWithdrawal);
  }
  if (action.type === 'play_action_card' && preparedTacticalPlanning) {
    const drawnCards = applyTacticalPlanningAction(result.state, action.playerId, preparedTacticalPlanning);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedConscription) {
    const drawnCards = applyConscriptionAction(result.state, action.playerId, preparedConscription);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedContraband) {
    applyContrabandAction(result.state, action.playerId, preparedContraband);
  }
  if (action.type === 'play_action_card' && action.cardId === SEDITION) {
    queueSeditionActionChoice(result.state, action.playerId);
  }
  if (action.type === 'move_player') {
    const battle = result.state.battle;
    if (battle?.attackerHandCommitVisibleTo) {
      const destination = result.state.board.spaces.find((space) => space.id === action.toSpaceId);
      if (!territoryPrintedEffectIsActive(result.state, destination, action.playerId)) {
        battle.attackerHandCommitVisibleTo = undefined;
      }
    }
    reconcileForcedMarchMove(result.state, action.playerId, initiatedBattle, restrictedBefore);
    reconcileAdvanceGuardMove(
      result.state,
      action.playerId,
      usedAdvanceGuardPosition,
      initiatedBattle,
    );
    applyEntrenchmentMovementTrigger(
      result.state,
      action.playerId,
      movementOriginSpaceId,
      action.toSpaceId,
      initiatedBattle,
    );
  }
  if (action.type === 'end_turn') {
    clearReinforcementsActionOpportunity(result.state, action.playerId);
    clearRestrictedMovementForTurnTransition(result.state, action.playerId);
    clearAdvanceGuardMovement(result.state, action.playerId);
    clearExpiredPathfindersSuppressions(result.state);
    clearExpiredEntrenchmentLocks(result.state);
    restoreSabotagedAssetsAtTurnStart(result.state);
  }
  if (action.type === 'resolve_asset_bank_discard') {
    applyContingencyPlanAssetLimitDraw(
      result.state,
      action.playerId,
      action.cardIds,
      contingencyPlanActiveCopiesBefore,
    );
  }
  if (action.type === 'resolve_battle_reveal') {
    applySeditionBattleBonuses(result.state);
    applyStandGroundBattleEffects(result.state);
    applyAdvanceGuardBattleEffects(result.state);
    applyEntrenchmentBattleEffects(result.state);
    applyCourtMartialBattleEffects(result.state);
    applyFealtyBattleEffects(result.state);
    applyFootholdBattleEffects(result.state);
    applyForcedMarchBattleEffects(result.state);
    applyNewRecruitsBattleEffects(result.state);
    applyPathfindersBattleEffects(result.state);
    applyRallyingCryBattleEffects(result.state);
    applyRousingSpeechBattleEffects(result.state);
    queueRequisitionBattleChoices(result.state);
  }
  if (action.type === 'resolve_battle' && priorBattle && priorBattleId && !result.state.battle) {
    const winnerId = latestResolvedBattleWinner(result.state);
    queueCourtMartialCleanup(result.state, priorBattle, winnerId);
    applyValorAssetDraw(result.state, priorBattle, winnerId);
    applyScorchedEarthBattleRuins(
      result.state,
      priorBattle,
      priorBattleController,
      winnerId,
    );
    queueScorchedEarthAssetChoices(
      result.state,
      priorBattle,
      priorBattleController,
      winnerId,
    );
    applyConsolidationAfterBattle(
      result.state,
      priorBattle,
      priorBattleController,
      winnerId,
    );
    applyFootholdBattleCleanupDraw(
      result.state,
      priorBattle,
      priorBattleController,
      winnerId,
    );
    queueFootholdAssetChoices(
      result.state,
      priorBattle,
      priorBattleController,
      winnerId,
    );
    applyRedemptionBattleReturns(result.state, priorBattleId);
    applyReservesBattleTopdecks(result.state, priorBattleId);
    queueSalvageBattleChoices(result.state, priorBattle, winnerId);
    queueSuppliesBattleEffects(result.state, priorBattle);
  }
  if (normalDraw) {
    queueSuppliesAfterNormalDraw(result.state, action.playerId);
  }

  reconcileSabotageAssetState(result.state);
  registerRousingSpeechAssetTriggers(
    result.state,
    rousingSpeechAssetsBefore,
    action.playerId,
  );
  if (assetsBefore) {
    registerDecoysAssetExits(result.state, assetsBefore, effectSourcePlayerId);
  }
  if (discardBefore) {
    registerRedemptionDiscardEntries(result.state, discardBefore, effectSourcePlayerId);
  }
  continueNeutralChoices(result.state);
  return result;
}
