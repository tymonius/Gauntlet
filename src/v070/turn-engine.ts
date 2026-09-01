import { v070CanonicalContent } from '../content/v070';
import {
  advanceV070TurnPhase,
  applyV070MovementChoice,
  beginEffectGrantedV070Movement,
  beginNormalV070Movement,
  canInitiateV070LastStand,
  currentV070MovementStep,
  createV070BattleOnset,
  createV070LastStandOnset,
  createV070TurnState,
  grantCurrentPhaseV070Actions,
  queueNormalV070MovementStep,
  spendV070Action,
  type MovementChoice,
  type PlayerId,
  type TurnPhase,
} from './rules';
import {
  V070GameActionError,
  appendV070Event,
  deterministicV070Shuffle,
  type V070GameState,
  type V070PlayerState,
} from './engine';
import {
  advanceV070FrontLine,
  nextV070FrontLineTarget,
} from './front-line';
import { insertV070TerritoryAtPlayerEnd } from './gauntlet';
import {
  placeV070Speculation,
  resolveV070SpeculationsAtTurnStart,
  v070SpeculationTargetPositions,
} from './speculation';
import {
  armV070AccursedWager,
  attachV070AccursedWagersToBattle,
  expireV070AccursedWagersAtTurnEnd,
} from './accursed-wager';
import {
  V070_DEMILITARIZED_ZONE_ID,
  cardIdForV070Overlay,
  expireV070TerritoryTurnRestrictions,
  openV070StartTurnOverlayChoice,
  placeV070OverlayFromPendingAction,
  resolveV070OverlayEntryRequirements,
  resolveV070StartTurnOverlayChoice,
  v070DmzBlocksEntryThisTurn,
  v070OverlaysAt,
} from './overlays';
import {
  completeV070CensureChoice,
  currentV070CensureChoice,
  openV070CensureChoicesForActionPlay,
} from './sanctions';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';
import { drawV070Cards, type V070DrawResult } from './card-draw';
export { drawV070Cards, type V070DrawResult } from './card-draw';
import {
  bankV070AssetFromPendingAction,
  bankV070AssetWithInherentAction,
  discardV070AssetAsAction,
  discardV070AssetByEffect,
  assertV070ForcedAssetChoicesSupported,
  discardV070AssetVoluntarily,
  pendingBankReplacementV070AssetInstanceIds,
  removeV070AssetForced,
  returnV070AssetVoluntarilyToHand,
  voluntarilyDiscardableV070AssetInstanceIds,
  voluntarilyReturnableV070AssetInstanceIds,
} from './assets';
import {
  bindV070CardFromPlayerZone,
  bindV070PendingActionCard,
} from './bindings';
import {
  applyV070BlasphemyForActionPlay,
  gainV070Conviction,
  isV070ArcaneCard,
  spendV070Conviction,
  v070Conviction,
} from './inquisition';
import { preventV070OpposingHandReveal } from './counterintelligence';
import {
  faceUpV070AssetInstanceIds,
  isV070AssetFaceUp,
  restoreV070AssetsAtTurnStart,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';
import {
  applyV070FinancierAfterCapture,
  buyV070Deed,
  buyV070DeedWithCollateral,
  clampAllV070CapitalToLimits,
  consumeV070FinancialCapacityAction,
  gainV070Capital,
  isV070FinancierPlayer,
  makeV070DeedUnowned,
  markV070FinancierFeatureActionSpent,
  placeV070CardInTreasury,
  removeV070CardFromTreasury,
  v070DeedCost,
  v070DeedOwner,
  v070DeedsOwned,
  v070FinancialCapacityAvailable,
  v070FinancierFeatureActionSpentThisTurn,
} from './financiers';
import {
  isV070IntelligencePlayer,
  returnV070ActiveMissionToHand,
  startV070MissionFromHand,
  v070MissionEligibleHandInstanceIds,
} from './intelligence';

export type V070TurnAction =
  | { type: 'resolve_capture'; playerId: PlayerId }
  | { type: 'draw_turn_card'; playerId: PlayerId }
  | { type: 'pass_opening'; playerId: PlayerId }
  | {
      type: 'bank_asset';
      playerId: PlayerId;
      cardInstanceId: string;
      replaceAssetInstanceId?: string;
    }
  | {
      type: 'discard_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | { type: 'play_action_card'; playerId: PlayerId; cardInstanceId: string }
  | {
      type: 'intelligence_start_mission';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'financier_place_treasury';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'financier_buy_deed';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | {
      type: 'financier_play_market';
      playerId: PlayerId;
      cardInstanceId: string;
      roll: number;
    }
  | {
      type: 'choose_owned_deed_target';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | {
      type: 'choose_treasury_card_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_deed_purchase_choice';
      playerId: PlayerId;
      territoryPosition?: number;
    }
  | {
      type: 'choose_margin_loan_collateral_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_conscription_banking_action';
      playerId: PlayerId;
      targetInstanceId?: string;
    }
  | {
      type: 'choose_leveraged_buyout_deed_target';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | {
      type: 'resolve_leveraged_buyout_collateral';
      playerId: PlayerId;
      collateralInstanceIds: readonly string[];
    }
  | {
      type: 'choose_speculation_territory_target';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | {
      type: 'choose_capital_gains_treasury_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_operational_reassessment_mission_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_clemency_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_clemency_choice';
      playerId: PlayerId;
      choice: 'recycle' | 'leave';
    }
  | {
      type: 'choose_recovery_action_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_hand_destination_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_controlled_asset_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_sequestration_keep_asset';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_fates_toll_cost';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_battlefield_promotion_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_sabotage_asset_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_controlled_territory_move_target';
      playerId: PlayerId;
      territoryPosition: number;
      discardInstanceId?: string;
    }
  | {
      type: 'choose_burning_at_stake_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_confession_gambit_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_hellfire_amount';
      playerId: PlayerId;
      amount: number;
    }
  | {
      type: 'resolve_penance_choice';
      playerId: PlayerId;
      choice: 'graveyard' | 'conviction';
      cardInstanceId?: string;
    }
  | {
      type: 'resolve_scouting_report_choice';
      playerId: PlayerId;
      source: 'own_draw' | 'opponent_draw' | 'opponent_hand';
    }
  | {
      type: 'choose_territory_overlay_target';
      playerId: PlayerId;
      territoryPosition: number;
    }
  | {
      type: 'choose_forced_asset_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_pending_asset_bank_replacement';
      playerId: PlayerId;
      replaceAssetInstanceId: string;
    }
  | {
      type: 'choose_soul_for_soul_targets';
      playerId: PlayerId;
      handInstanceId: string;
      graveyardInstanceId: string;
    }
  | {
      type: 'choose_accusation_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_accusation_choice';
      playerId: PlayerId;
      destination: 'draw_top' | 'graveyard';
    }
  | {
      type: 'choose_guilt_by_association_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_excommunication_targets';
      playerId: PlayerId;
      targetInstanceIds: readonly string[];
    }
  | {
      type: 'choose_opponent_hand_discard_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_dark_omens_graveyard_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_act_of_faith_graveyard_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_threefold_vision_distribution';
      playerId: PlayerId;
      handInstanceId: string;
      discardInstanceId: string;
      graveyardInstanceId: string;
    }
  | {
      type: 'choose_anathema_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_reserve_force_bind_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_extraordinary_rendition_bind_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_sleeper_network_bind_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_necromancy_action';
      playerId: PlayerId;
      mode: 'recycle' | 'reclaim';
      targetInstanceIds?: readonly string[];
    }
  | {
      type: 'resolve_manifest_destiny_sacrifice';
      playerId: PlayerId;
      assetInstanceIds: readonly string[];
    }
  | {
      type: 'resolve_censure_choice';
      playerId: PlayerId;
      sanctionInstanceId: string;
      choice: 'discard' | 'draw';
      discardInstanceId?: string;
    }
  | {
      type: 'choose_movement';
      playerId: PlayerId;
      choice: MovementChoice;
      discardInstanceId?: string;
    }
  | {
      type: 'resolve_start_turn_overlay_choice';
      playerId: PlayerId;
      choice: 'discard' | 'withdraw';
      discardInstanceId?: string;
    }
  | { type: 'pass_denouement'; playerId: PlayerId }
  | { type: 'complete_cleanup'; playerId: PlayerId; discardInstanceIds?: readonly string[] };

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  if (action.type === 'resolve_clemency_choice'
    || action.type === 'choose_forced_asset_target'
    || action.type === 'resolve_accusation_choice'
    || action.type === 'choose_sequestration_keep_asset'
    || action.type === 'resolve_penance_choice') {
    requirePlayingGame(state);
  } else {
    requirePlayingTurn(state, action.playerId);
  }
  if (state.battle) {
    throw new V070GameActionError('Resolve the active battle before continuing the turn.');
  }
  if (state.pendingTurnChoice && action.type !== 'resolve_start_turn_overlay_choice') {
    throw new V070GameActionError('Resolve the pending start-of-turn Overlay choice first.');
  }
  if (state.pendingSanctionChoices.length > 0) {
    const pending = state.pendingSanctionChoices[0];
    const resolvingCensure = pending.kind === 'censure_action'
      && action.type === 'resolve_censure_choice';
    if (!resolvingCensure) {
      throw new V070GameActionError('Resolve the pending Sanction choice first.');
    }
  }
  if (state.pendingActionEffectChoice) {
    const pending = state.pendingActionEffectChoice;
    const validContinuation = (
      pending.kind === 'clemency_target'
      && action.type === 'choose_clemency_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'clemency_response'
      && action.type === 'resolve_clemency_choice'
      && action.playerId === pending.playerId
    ) || (
      (
        pending.kind === 'arcane_knowledge_target'
        || pending.kind === 'contraband_target'
        || pending.kind === 'salvage_recovery_target'
        || pending.kind === 'divine_mercy_target'
      )
      && action.type === 'choose_recovery_action_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'hand_destination_target'
      && action.type === 'choose_hand_destination_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'controlled_asset_target'
      && action.type === 'choose_controlled_asset_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'sequestration_keep_asset'
      && action.type === 'choose_sequestration_keep_asset'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'fates_toll_cost'
      && action.type === 'choose_fates_toll_cost'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'battlefield_promotion_target'
      && action.type === 'choose_battlefield_promotion_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'sabotage_asset_target'
      && action.type === 'choose_sabotage_asset_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'controlled_territory_move_target'
      && action.type === 'choose_controlled_territory_move_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'burning_at_stake_tie'
      && action.type === 'choose_burning_at_stake_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'confession_gambit_target'
      && action.type === 'choose_confession_gambit_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'hellfire_conviction_amount'
      && action.type === 'choose_hellfire_amount'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'penance_choice'
      && action.type === 'resolve_penance_choice'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'scouting_report_source'
      && action.type === 'resolve_scouting_report_choice'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'territory_overlay_target'
      && action.type === 'choose_territory_overlay_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'forced_asset_target'
      && action.type === 'choose_forced_asset_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'pending_asset_bank_replacement'
      && action.type === 'choose_pending_asset_bank_replacement'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'soul_for_soul_targets'
      && action.type === 'choose_soul_for_soul_targets'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'accusation_target'
      && action.type === 'choose_accusation_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'accusation_response'
      && action.type === 'resolve_accusation_choice'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'guilt_by_association_target'
      && action.type === 'choose_guilt_by_association_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'excommunication_targets'
      && action.type === 'choose_excommunication_targets'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'opponent_hand_discard_target'
      && action.type === 'choose_opponent_hand_discard_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'dark_omens_graveyard_target'
      && action.type === 'choose_dark_omens_graveyard_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'act_of_faith_graveyard_target'
      && action.type === 'choose_act_of_faith_graveyard_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'threefold_vision_distribution'
      && action.type === 'resolve_threefold_vision_distribution'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'anathema_target'
      && action.type === 'choose_anathema_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'reserve_force_bind_target'
      && action.type === 'choose_reserve_force_bind_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'extraordinary_rendition_bind_target'
      && action.type === 'choose_extraordinary_rendition_bind_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'sleeper_network_bind_target'
      && action.type === 'choose_sleeper_network_bind_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'necromancy_mode'
      && action.type === 'resolve_necromancy_action'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'manifest_destiny_sacrifice'
      && action.type === 'resolve_manifest_destiny_sacrifice'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'margin_loan_collateral_target'
      && action.type === 'choose_margin_loan_collateral_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'conscription_banking_action'
      && action.type === 'resolve_conscription_banking_action'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'leveraged_buyout_deed_target'
      && action.type === 'choose_leveraged_buyout_deed_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'leveraged_buyout_collateral'
      && action.type === 'resolve_leveraged_buyout_collateral'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'speculation_territory_target'
      && action.type === 'choose_speculation_territory_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'capital_gains_treasury_target'
      && action.type === 'choose_capital_gains_treasury_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'operational_reassessment_mission_target'
      && action.type === 'choose_operational_reassessment_mission_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'owned_deed_target'
      && action.type === 'choose_owned_deed_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'treasury_card_target'
      && action.type === 'choose_treasury_card_target'
      && action.playerId === pending.playerId
    ) || (
      pending.kind === 'deed_purchase_choice'
      && action.type === 'resolve_deed_purchase_choice'
      && action.playerId === pending.playerId
    );
    if (!validContinuation) {
      throw new V070GameActionError('Resolve the pending printed Action effect choice first.');
    }
  }
  if (state.pendingActionCard
    && state.pendingSanctionChoices.length === 0
    && ![
      'resolve_censure_choice',
      'choose_clemency_target',
      'resolve_clemency_choice',
      'choose_recovery_action_target',
      'choose_hand_destination_target',
      'choose_controlled_asset_target',
      'choose_sequestration_keep_asset',
      'choose_fates_toll_cost',
      'choose_battlefield_promotion_target',
      'choose_sabotage_asset_target',
      'choose_controlled_territory_move_target',
      'choose_burning_at_stake_target',
      'choose_confession_gambit_target',
      'choose_hellfire_amount',
      'resolve_penance_choice',
      'resolve_scouting_report_choice',
      'choose_territory_overlay_target',
      'choose_forced_asset_target',
      'choose_pending_asset_bank_replacement',
      'choose_soul_for_soul_targets',
      'choose_accusation_target',
      'resolve_accusation_choice',
      'choose_guilt_by_association_target',
      'choose_excommunication_targets',
      'choose_opponent_hand_discard_target',
      'choose_dark_omens_graveyard_target',
      'choose_act_of_faith_graveyard_target',
      'resolve_threefold_vision_distribution',
      'choose_anathema_target',
      'choose_reserve_force_bind_target',
      'choose_extraordinary_rendition_bind_target',
      'choose_sleeper_network_bind_target',
      'resolve_necromancy_action',
      'resolve_manifest_destiny_sacrifice',
      'choose_margin_loan_collateral_target',
      'resolve_conscription_banking_action',
      'choose_leveraged_buyout_deed_target',
      'resolve_leveraged_buyout_collateral',
      'choose_speculation_territory_target',
      'choose_capital_gains_treasury_target',
      'choose_operational_reassessment_mission_target',
      'choose_owned_deed_target',
      'choose_treasury_card_target',
      'resolve_deed_purchase_choice',
    ].includes(action.type)) {
    throw new V070GameActionError('Resolve the pending Action card before continuing the turn.');
  }

  const activeTurnState = state.turnState;
  if (activeTurnState?.movementSequenceOpen
    && activeTurnState.movementSequenceSource === 'effect'
    && action.type !== 'choose_movement') {
    throw new V070GameActionError(
      'Resolve the effect-granted movement sequence before continuing the turn.',
    );
  }

  const next = structuredClone(state) as V070GameState;

  switch (action.type) {
    case 'resolve_capture':
      resolveCapture(next, action.playerId);
      break;
    case 'draw_turn_card':
      drawTurnCard(next, action.playerId);
      break;
    case 'pass_opening':
      passOpening(next, action.playerId);
      break;
    case 'bank_asset':
      bankAsset(next, action.playerId, action.cardInstanceId, action.replaceAssetInstanceId);
      break;
    case 'discard_asset':
      discardAsset(next, action.playerId, action.assetInstanceId);
      break;
    case 'play_action_card':
      playActionCard(next, action.playerId, action.cardInstanceId);
      break;
    case 'intelligence_start_mission':
      intelligenceStartMission(
        next,
        action.playerId,
        action.cardInstanceId,
      );
      break;
    case 'financier_place_treasury':
      financierPlaceTreasury(next, action.playerId, action.cardInstanceId);
      break;
    case 'financier_buy_deed':
      financierBuyDeed(next, action.playerId, action.territoryPosition);
      break;
    case 'financier_play_market':
      financierPlayMarket(
        next,
        action.playerId,
        action.cardInstanceId,
        action.roll,
      );
      break;
    case 'choose_owned_deed_target':
      chooseOwnedDeedTarget(
        next,
        action.playerId,
        action.territoryPosition,
      );
      break;
    case 'choose_treasury_card_target':
      chooseTreasuryCardTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'resolve_deed_purchase_choice':
      resolveDeedPurchaseChoice(
        next,
        action.playerId,
        action.territoryPosition,
      );
      break;
    case 'choose_margin_loan_collateral_target':
      chooseMarginLoanCollateralTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'resolve_conscription_banking_action':
      resolveConscriptionBankingAction(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_leveraged_buyout_deed_target':
      chooseLeveragedBuyoutDeedTarget(
        next,
        action.playerId,
        action.territoryPosition,
      );
      break;
    case 'resolve_leveraged_buyout_collateral':
      resolveLeveragedBuyoutCollateral(
        next,
        action.playerId,
        action.collateralInstanceIds,
      );
      break;
    case 'choose_speculation_territory_target':
      chooseSpeculationTerritoryTarget(
        next,
        action.playerId,
        action.territoryPosition,
      );
      break;
    case 'choose_capital_gains_treasury_target':
      chooseCapitalGainsTreasuryTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_operational_reassessment_mission_target':
      chooseOperationalReassessmentMissionTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_clemency_target':
      chooseClemencyTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'resolve_clemency_choice':
      resolveClemencyChoice(next, action.playerId, action.choice);
      break;
    case 'choose_recovery_action_target':
      chooseRecoveryActionTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_hand_destination_target':
      chooseHandDestinationTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_controlled_asset_target':
      chooseControlledAssetTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_sequestration_keep_asset':
      chooseSequestrationKeepAsset(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_fates_toll_cost':
      chooseFatesTollCost(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_battlefield_promotion_target':
      chooseBattlefieldPromotionTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_sabotage_asset_target':
      chooseSabotageAssetTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_controlled_territory_move_target':
      chooseControlledTerritoryMoveTarget(
        next,
        action.playerId,
        action.territoryPosition,
        action.discardInstanceId,
      );
      break;
    case 'choose_burning_at_stake_target':
      chooseBurningAtStakeTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_confession_gambit_target':
      chooseConfessionGambitTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_hellfire_amount':
      chooseHellfireAmount(
        next,
        action.playerId,
        action.amount,
      );
      break;
    case 'resolve_penance_choice':
      resolvePenanceChoice(
        next,
        action.playerId,
        action.choice,
        action.cardInstanceId,
      );
      break;
    case 'resolve_scouting_report_choice':
      resolveScoutingReportChoice(next, action.playerId, action.source);
      break;
    case 'choose_territory_overlay_target':
      chooseTerritoryOverlayTarget(next, action.playerId, action.territoryPosition);
      break;
    case 'choose_forced_asset_target':
      chooseForcedAssetTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_pending_asset_bank_replacement':
      choosePendingAssetBankReplacement(
        next,
        action.playerId,
        action.replaceAssetInstanceId,
      );
      break;
    case 'choose_soul_for_soul_targets':
      chooseSoulForSoulTargets(
        next,
        action.playerId,
        action.handInstanceId,
        action.graveyardInstanceId,
      );
      break;
    case 'choose_accusation_target':
      chooseAccusationTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'resolve_accusation_choice':
      resolveAccusationChoice(next, action.playerId, action.destination);
      break;
    case 'choose_guilt_by_association_target':
      chooseGuiltByAssociationTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_excommunication_targets':
      chooseExcommunicationTargets(
        next,
        action.playerId,
        action.targetInstanceIds,
      );
      break;
    case 'choose_opponent_hand_discard_target':
      chooseOpponentHandDiscardTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_dark_omens_graveyard_target':
      chooseDarkOmensGraveyardTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_act_of_faith_graveyard_target':
      chooseActOfFaithGraveyardTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'resolve_threefold_vision_distribution':
      resolveThreefoldVisionDistribution(
        next,
        action.playerId,
        action.handInstanceId,
        action.discardInstanceId,
        action.graveyardInstanceId,
      );
      break;
    case 'choose_anathema_target':
      chooseAnathemaTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_reserve_force_bind_target':
      chooseReserveForceBindTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'choose_extraordinary_rendition_bind_target':
      chooseExtraordinaryRenditionBindTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'choose_sleeper_network_bind_target':
      chooseSleeperNetworkBindTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      break;
    case 'resolve_necromancy_action':
      resolveNecromancyAction(
        next,
        action.playerId,
        action.mode,
        action.targetInstanceIds ?? [],
      );
      break;
    case 'resolve_manifest_destiny_sacrifice':
      resolveManifestDestinySacrifice(
        next,
        action.playerId,
        action.assetInstanceIds,
      );
      break;
    case 'resolve_censure_choice':
      resolveCensureChoice(
        next,
        action.playerId,
        action.sanctionInstanceId,
        action.choice,
        action.discardInstanceId,
      );
      break;
    case 'choose_movement':
      chooseMovement(next, action.playerId, action.choice, action.discardInstanceId);
      break;
    case 'resolve_start_turn_overlay_choice':
      resolveV070StartTurnOverlayChoice(
        next,
        action.playerId,
        action.choice,
        action.discardInstanceId,
      );
      break;
    case 'pass_denouement':
      passDenouement(next, action.playerId);
      break;
    case 'complete_cleanup':
      completeCleanup(next, action.playerId, action.discardInstanceIds ?? []);
      break;
  }

  return next;
}

function resolveCapture(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'capture');
  const target = nextV070FrontLineTarget(state, playerId);

  if (target) {
    const position = requirePosition(state.players[playerId]);
    const supportsCapture = playerId === 'A'
      ? position >= target.position
      : position <= target.position;

    if (supportsCapture && target.controller === otherPlayer(playerId)) {
      const advance = advanceV070FrontLine(state, playerId, 1, 'normal_capture');

      if (advance.reachedOpponentEnd) {
        state.stage = 'ended';
        state.winner = playerId;
        state.turnState = null;
        appendV070Event(state, {
          type: 'game_won',
          actor: playerId,
          visibility: 'public',
          payload: { route: 'final_territory_capture' },
        });
        return;
      }
    }
  }

  const diplomat = state.players[playerId].diplomats;
  const peaceTreatyThreshold = v070CanonicalContent.content.faction_rules.diplomats.peace_treaty_threshold;
  if (diplomat && diplomat.ratifiedProposals.length >= peaceTreatyThreshold) {
    state.stage = 'ended';
    state.winner = playerId;
    state.turnState = null;
    appendV070Event(state, {
      type: 'game_won',
      actor: playerId,
      visibility: 'public',
      payload: { route: 'peace_treaty', ratifiedProposals: diplomat.ratifiedProposals.length },
    });
    return;
  }

  applyV070FinancierAfterCapture(state, playerId);

  state.turnState = advanceV070TurnPhase(requireTurnState(state));
  appendPhaseEvent(state);
}

function drawTurnCard(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'draw');
  const result = drawV070Cards(state, playerId, 1, 'turn_draw');
  const player = state.players[playerId];
  player.zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'turn_card_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'turn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
      },
    });
  }

  state.turnState = advanceV070TurnPhase(requireTurnState(state));
  appendPhaseEvent(state);
}

function bankAsset(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  replaceAssetInstanceId?: string,
): void {
  spendTurnAction(state, playerId);

  bankV070AssetWithInherentAction(
    state,
    playerId,
    cardInstanceId,
    replaceAssetInstanceId,
  );
}

function discardAsset(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): void {
  spendTurnAction(state, playerId);

  discardV070AssetAsAction(state, playerId, assetInstanceId);
}

function spendTurnAction(
  state: V070GameState,
  playerId: PlayerId,
  financierFeatureName?: string,
): void {
  const turnState = requireTurnState(state);
  const financierFeature = Boolean(financierFeatureName);

  try {
    state.turnState = spendV070Action(turnState);
    if (financierFeature) {
      markV070FinancierFeatureActionSpent(
        state,
        playerId,
        financierFeatureName!,
      );
    }
    return;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'That Action cannot be spent now.';

    if (message !== 'No Actions remain this turn.'
      || !v070FinancialCapacityAvailable(state, playerId)) {
      throw new V070GameActionError(message);
    }

    if (!financierFeature
      && !v070FinancierFeatureActionSpentThisTurn(state, playerId)) {
      throw new V070GameActionError(
        'Financial Capacity’s additional Action requires at least one Action this turn to be spent on a Financier Faction Feature.',
      );
    }

    try {
      state.turnState = spendV070Action({
        ...turnState,
        actionsAvailable: turnState.actionsAvailable + 1,
      });
    } catch (capacityError) {
      throw new V070GameActionError(
        capacityError instanceof Error
          ? capacityError.message
          : 'Financial Capacity cannot provide another Action in this phase.',
      );
    }

    consumeV070FinancialCapacityAction(state, playerId);
    if (financierFeature) {
      markV070FinancierFeatureActionSpent(
        state,
        playerId,
        financierFeatureName!,
      );
    }
  }
}

function requireIntelligenceDenouement(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requirePhase(state, 'denouement');
  if (!isV070IntelligencePlayer(state, playerId)) {
    throw new V070GameActionError(
      `${playerId} is not using the Intelligence faction.`,
    );
  }
}

function intelligenceStartMission(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  requireIntelligenceDenouement(state, playerId);
  const intelligence = state.players[playerId].intelligence!;
  if (intelligence.activeMission) {
    throw new V070GameActionError(
      'You may have only one Active Mission.',
    );
  }
  if (intelligence.specialOperation) {
    throw new V070GameActionError(
      'You cannot start a Mission while a Special Operation is active.',
    );
  }
  if (!v070MissionEligibleHandInstanceIds(state, playerId)
    .includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Start Mission requires an eligible Intelligence Mission card from your Hand.',
    );
  }

  spendTurnAction(state, playerId);
  startV070MissionFromHand(
    state,
    playerId,
    cardInstanceId,
    'Start Mission Faction Feature',
  );
}

function requireFinancierDenouement(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requirePhase(state, 'denouement');
  if (!isV070FinancierPlayer(state, playerId)) {
    throw new V070GameActionError(
      `${playerId} is not using the Financiers faction.`,
    );
  }
}

function financierPlaceTreasury(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  requireFinancierDenouement(state, playerId);
  if (!state.players[playerId].zones.hand.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Treasury requires one card from your Hand.',
    );
  }

  spendTurnAction(state, playerId, 'Treasury');
  placeV070CardInTreasury(
    state,
    playerId,
    cardInstanceId,
    'Financier Treasury Faction Feature',
  );
}

function financierBuyDeed(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  requireFinancierDenouement(state, playerId);
  const territory = territoryAt(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError(
      'A Deed purchase must target a Territory in the Gauntlet.',
    );
  }

  const cost = v070DeedCost(
    state,
    playerId,
    territory.territoryInstanceId,
  );
  const capital = state.players[playerId].financiers!.capital;
  if (capital < cost) {
    throw new V070GameActionError(
      `That Deed costs ${cost} Capital but only ${capital} is available.`,
    );
  }

  spendTurnAction(state, playerId, 'Buy / Buy Out Deed');
  buyV070Deed(
    state,
    playerId,
    territory.territoryInstanceId,
    'Financier Buy / Buy Out Deed Faction Feature',
  );
}

function financierPlayMarket(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  roll: number,
): void {
  requireFinancierDenouement(state, playerId);
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new V070GameActionError(
      'Play the Market requires an unmodified d6 result.',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(cardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError(
      'Play the Market requires one card from your Hand.',
    );
  }
  const cardId = state.cardInstances[cardInstanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Play the Market requires a known card instance.',
    );
  }

  spendTurnAction(state, playerId, 'Play the Market');

  player.zones.hand.splice(handIndex, 1);
  player.zones.discardPile.push(cardInstanceId);
  appendV070Event(state, {
    type: 'play_the_market_rolled',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      cardId,
      value: card.cost,
      roll,
    },
  });

  if (roll === 1) {
    player.zones.discardPile.pop();
    player.zones.graveyard.push(cardInstanceId);
    appendV070Event(state, {
      type: 'play_the_market_card_graveyarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        cardInstanceId,
        cardId,
      },
    });
    return;
  }

  const gain = roll <= 3
    ? 1
    : roll <= 5
      ? card.cost
      : card.cost * 2;
  gainV070Capital(
    state,
    playerId,
    gain,
    `Play the Market roll ${roll}`,
  );
}

export const V070_EXECUTABLE_ACTION_CARD_IDS = [
  'neutral-rallying-cry',
  'neutral-advance-guard',
  'neutral-arcane-knowledge',
  'neutral-capital-punishment',
  'neutral-consolidation',
  'neutral-conscription',
  'neutral-contraband',
  'neutral-disruption',
  'neutral-forced-march',
  'mystics-fate-s-toll',
  'military-battlefield-promotion',
  'military-encampment',
  'military-give-chase',
  'neutral-insurrection',
  'neutral-landslide',
  'neutral-manifest-destiny',
  'neutral-new-recruits',
  'neutral-phantom-passage',
  'neutral-revolution',
  'neutral-reserves',
  'neutral-requisition',
  'neutral-salvage',
  'neutral-sabotage',
  'neutral-scouting-report',
  'neutral-sedition',
  'neutral-sequestration',
  'neutral-strategic-withdrawal',
  'neutral-tactical-planning',
  'diplomats-clemency',
  'diplomats-detente',
  'financiers-capital-gains',
  'financiers-compound-interest',
  'financiers-corner-the-market',
  'financiers-divestment',
  'financiers-foreclosure',
  'financiers-leveraged-buyout',
  'financiers-liquidation',
  'financiers-margin-loan',
  'financiers-monetary-crisis',
  'financiers-speculation',
  'financiers-tariffs',
  'financiers-war-bonds',
  'inquisition-accusation',
  'inquisition-anathema',
  'inquisition-burning-at-the-stake',
  'inquisition-confession',
  'inquisition-divine-mercy',
  'inquisition-excommunication',
  'inquisition-hellfire',
  'inquisition-penance',
  'inquisition-act-of-faith',
  'inquisition-guilt-by-association',
  'intelligence-assassins',
  'intelligence-extraordinary-rendition',
  'intelligence-operational-reassessment',
  'intelligence-regime-change',
  'intelligence-sleeper-network',
  'intelligence-spies',
  'military-high-command',
  'military-invasion',
  'military-reserve-force',
  'mystics-accursed-wager',
  'mystics-circle-of-bones',
  'mystics-dark-omens',
  'mystics-necromancy',
  'mystics-paths-of-shadow',
  'mystics-nature-s-altar',
  'mystics-sacrifice-recovery',
  'mystics-soul-for-soul',
  'mystics-spirit-hollow',
  'mystics-threefold-vision',
] as const;

interface V070ActionPlayOptions {
  spendAction?: boolean;
  source?: string;
  sourceActionInstanceId?: string;
}

function playActionCard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  options: V070ActionPlayOptions = {},
): void {
  const turnState = requireTurnState(state);
  if (turnState.phase !== 'opening' && turnState.phase !== 'denouement') {
    throw new V070GameActionError(
      'A printed Action card may normally be played only during Opening or Denouement.',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(cardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError('An Action card must be played from Hand.');
  }

  const instance = state.cardInstances[cardInstanceId];
  const card = instance ? v070CanonicalContent.cardsById.get(instance.cardId) : undefined;
  if (!instance || instance.owner !== playerId || !card) {
    throw new V070GameActionError('Unknown or incorrectly owned Action card instance.');
  }
  if (!card.effects.some(effect => effect.label === 'Action')) {
    throw new V070GameActionError('That card has no printed Action effect.');
  }
  if (!(V070_EXECUTABLE_ACTION_CARD_IDS as readonly string[]).includes(card.id)) {
    throw new V070GameActionError(
      `The printed Action effect of ${card.name} is not yet executable in v0.7.0.`,
    );
  }
  if (card.id === 'diplomats-clemency'
    && state.players[otherPlayer(playerId)].zones.graveyard.length === 0) {
    throw new V070GameActionError(
      'Clemency requires at least one card in the opponent’s Graveyard.',
    );
  }
  if (card.id === 'neutral-arcane-knowledge'
    && player.zones.graveyard.length === 0) {
    throw new V070GameActionError(
      'Arcane Knowledge requires at least one card in your Graveyard.',
    );
  }
  if (card.id === 'neutral-contraband'
    && player.zones.discardPile.length === 0) {
    throw new V070GameActionError(
      'Contraband requires at least one card in your Discard Pile.',
    );
  }
  if ((card.id === 'neutral-advance-guard'
      || card.id === 'neutral-forced-march')
    && turnState.phase !== 'opening') {
    throw new V070GameActionError(
      `${card.name} may be played only during Opening.`,
    );
  }
  if (card.id === 'neutral-capital-punishment') {
    const opponentId = otherPlayer(playerId);
    if (!wonBattleThisTurn(state, playerId)) {
      throw new V070GameActionError(
        'Capital Punishment may be played only if you won a battle this turn.',
      );
    }
    if (state.players[opponentId].zones.assetBank.length === 0) {
      throw new V070GameActionError(
        'Capital Punishment requires the opponent to control at least one Asset.',
      );
    }
    assertV070ForcedAssetChoicesSupported(state, opponentId);
  }
  if (card.id === 'neutral-consolidation'
    && !capturedTerritoryThisTurn(state, playerId)) {
    throw new V070GameActionError(
      'Consolidation may be played only if you captured a Territory this turn.',
    );
  }
  if (card.id === 'neutral-disruption'
    && state.players[otherPlayer(playerId)].zones.hand.length === 0) {
    throw new V070GameActionError(
      'Disruption requires at least one card in the opponent’s Hand.',
    );
  }
  if (card.id === 'neutral-manifest-destiny') {
    const candidates = manifestDestinyAssetCandidateInstanceIds(
      state,
      playerId,
    );
    const otherHandCount = Math.max(0, player.zones.hand.length - 1);
    if (candidates.length === 0) {
      throw new V070GameActionError(
        'Manifest Destiny requires at least one Asset that can leave play.',
      );
    }
    if (otherHandCount + candidates.length < 3) {
      throw new V070GameActionError(
        'Manifest Destiny requires at least three other cards total between your Hand and selected Assets.',
      );
    }
  }
  if (card.id === 'neutral-salvage'
    && player.zones.discardPile.length === 0) {
    throw new V070GameActionError(
      'Salvage requires at least one card in your Discard Pile.',
    );
  }
  if (card.id === 'military-battlefield-promotion') {
    if (turnState.phase !== 'denouement') {
      throw new V070GameActionError(
        'Battlefield Promotion may be played only during Denouement.',
      );
    }
    if (battlefieldPromotionCandidateInstanceIds(state, playerId).length === 0) {
      throw new V070GameActionError(
        'Battlefield Promotion requires a Tactic you chose in a battle you won this turn that is still in your Discard Pile.',
      );
    }
  }
  if (card.id === 'military-give-chase') {
    if (turnState.phase !== 'denouement') {
      throw new V070GameActionError(
        'Give Chase may be played only during Denouement.',
      );
    }
    if (!wonInitiatedBattleThisTurn(state, playerId)) {
      throw new V070GameActionError(
        'Give Chase requires a battle you initiated and won this turn.',
      );
    }
  }
  if (card.id === 'mystics-fate-s-toll'
    && player.zones.hand.length < 2) {
    throw new V070GameActionError(
      "Fate's Toll requires one other card in your Hand.",
    );
  }
  if (card.id === 'neutral-new-recruits'
    && player.zones.hand.length < 2) {
    throw new V070GameActionError(
      'New Recruits requires one other card in your Hand.',
    );
  }
  if (card.id === 'neutral-requisition'
    && voluntarilyDiscardableV070AssetInstanceIds(state, playerId).length === 0) {
    throw new V070GameActionError(
      'Requisition requires one Asset you can voluntarily discard.',
    );
  }
  if (card.id === 'neutral-strategic-withdrawal'
    && voluntarilyReturnableV070AssetInstanceIds(state, playerId).length === 0) {
    throw new V070GameActionError(
      'Strategic Withdrawal requires one Asset you can return to your Hand.',
    );
  }
  if (card.id === 'neutral-sabotage'
    && faceUpV070AssetInstanceIds(
      state,
      otherPlayer(playerId),
    ).length === 0) {
    throw new V070GameActionError(
      'Sabotage requires at least one face-up opposing Asset.',
    );
  }
  if ((card.id === 'neutral-phantom-passage'
      || card.id === 'mystics-paths-of-shadow')
    && controlledTerritoryMovementCandidatePositions(
      state,
      playerId,
      card.id === 'neutral-phantom-passage',
      cardInstanceId,
    ).length === 0) {
    throw new V070GameActionError(
      `${card.name} requires another controlled Territory you can legally move to.`,
    );
  }
  if (card.id === 'neutral-scouting-report'
    && availableScoutingReportSources(state, playerId).length === 0) {
    throw new V070GameActionError(
      'Scouting Report requires a nonempty Draw Pile or opposing Hand to reveal.',
    );
  }
  if (card.id === 'neutral-landslide'
    && availableLandslidePositions(state).length === 0) {
    throw new V070GameActionError(
      'Landslide requires a Territory that does not already have a Landslide.',
    );
  }
  if (isLocalPlacementOverlayActionCardId(card.id)
    && availableLocalPlacementOverlayPositions(
      state,
      playerId,
      card.id,
    ).length === 0) {
    throw new V070GameActionError(
      noLocalPlacementOverlayTargetMessage(card.id),
    );
  }
  if (card.id === 'neutral-sedition') {
    const opponentId = otherPlayer(playerId);
    if (state.players[opponentId].zones.assetBank.length === 0) {
      throw new V070GameActionError(
        'Sedition requires the opponent to control at least one Asset.',
      );
    }
    assertV070ForcedAssetChoicesSupported(state, opponentId);
  }
  if (card.id === 'mystics-soul-for-soul') {
    if (player.zones.hand.length < 2) {
      throw new V070GameActionError(
        'Soul for Soul requires one other card in your Hand.',
      );
    }
    if (player.zones.graveyard.length === 0) {
      throw new V070GameActionError(
        'Soul for Soul requires one card in your Graveyard.',
      );
    }
  }
  if (card.id === 'inquisition-divine-mercy'
    && state.players[otherPlayer(playerId)].zones.graveyard.length === 0) {
    throw new V070GameActionError(
      'Divine Mercy requires at least one card in the opponent’s Graveyard.',
    );
  }
  if (card.id === 'inquisition-accusation'
    && state.players[otherPlayer(playerId)].zones.discardPile.length === 0) {
    throw new V070GameActionError(
      'Accusation requires at least one card in the opponent’s Discard Pile.',
    );
  }
  if (card.id === 'inquisition-guilt-by-association'
    && state.players[otherPlayer(playerId)].zones.discardPile.length === 0) {
    throw new V070GameActionError(
      'Guilt by Association requires at least one card in the opponent’s Discard Pile.',
    );
  }
  if (card.id === 'inquisition-excommunication'
    && !state.players[otherPlayer(playerId)].zones.discardPile.some(
      instanceId => v070CardValue(state, instanceId) <= 5,
    )) {
    throw new V070GameActionError(
      'Excommunication requires at least one opposing Discard card with value 5 or less.',
    );
  }
  if (card.id === 'intelligence-assassins'
    && state.players[otherPlayer(playerId)].zones.hand.length === 0) {
    throw new V070GameActionError(
      'Assassins requires at least one card in the opponent’s Hand.',
    );
  }
  if (card.id === 'inquisition-act-of-faith'
    && state.players[otherPlayer(playerId)].zones.drawPile.length === 0) {
    throw new V070GameActionError(
      'Act of Faith requires at least one card in the opponent’s Draw Pile.',
    );
  }
  if (card.id === 'inquisition-anathema') {
    if (state.players[otherPlayer(playerId)].zones.discardPile.length === 0) {
      throw new V070GameActionError(
        'Anathema requires at least one card in the opponent’s Discard Pile.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(
      state,
      playerId,
      cardInstanceId,
    );
  }
  if (card.id === 'military-reserve-force') {
    const eligible = player.zones.hand.some(instanceId => {
      if (instanceId === cardInstanceId) return false;
      const candidateId = state.cardInstances[instanceId]?.cardId;
      const candidate = candidateId
        ? v070CanonicalContent.cardsById.get(candidateId)
        : undefined;
      return candidate?.effects.some(effect =>
        effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
      ) ?? false;
    });
    if (!eligible) {
      throw new V070GameActionError(
        'Reserve Force requires another Tactic-eligible card in your Hand.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(state, playerId, cardInstanceId);
  }
  if (card.id === 'intelligence-operational-reassessment') {
    if (!isV070IntelligencePlayer(state, playerId)) {
      throw new V070GameActionError(
        'Operational Reassessment requires the Intelligence faction.',
      );
    }
    if (!state.players[playerId].intelligence!.activeMission) {
      throw new V070GameActionError(
        'Operational Reassessment requires an Active Mission.',
      );
    }
    if (v070MissionEligibleHandInstanceIds(
      state,
      playerId,
      [cardInstanceId],
    ).length === 0) {
      throw new V070GameActionError(
        'Operational Reassessment requires another eligible Intelligence Mission card in your Hand.',
      );
    }
  }
  if (card.id === 'intelligence-extraordinary-rendition') {
    if (state.players[otherPlayer(playerId)].zones.hand.length === 0) {
      throw new V070GameActionError(
        'Extraordinary Rendition requires at least one card in the opponent’s Hand.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(state, playerId, cardInstanceId);
  }
  if (card.id === 'intelligence-sleeper-network') {
    if (player.zones.hand.length < 2) {
      throw new V070GameActionError(
        'Sleeper Network requires one other card in your Hand to bind.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(state, playerId, cardInstanceId);
  }
  if ([
      'financiers-capital-gains',
      'financiers-corner-the-market',
      'financiers-divestment',
      'financiers-foreclosure',
      'financiers-leveraged-buyout',
      'financiers-liquidation',
      'financiers-margin-loan',
      'financiers-speculation',
    ].includes(card.id)
    && !isV070FinancierPlayer(state, playerId)) {
    throw new V070GameActionError(
      `${card.name} requires the Financiers faction economy.`,
    );
  }
  if (card.id === 'financiers-leveraged-buyout'
    && leveragedBuyoutAffordableDeedPositions(
      state,
      playerId,
      cardInstanceId,
    ).length === 0) {
    throw new V070GameActionError(
      'Leveraged Buyout requires at least one Deed you can currently purchase with Capital and available collateral.',
    );
  }
  if (card.id === 'financiers-capital-gains'
    && state.players[playerId].financiers!.treasury.length === 0) {
    throw new V070GameActionError(
      'Capital Gains requires at least one card in your Treasury.',
    );
  }
  if (card.id === 'financiers-speculation'
    && v070SpeculationTargetPositions(state, playerId).length === 0) {
    throw new V070GameActionError(
      'Speculation requires a Territory you neither control nor occupy.',
    );
  }
  if (card.id === 'financiers-divestment'
    && ownedDeedCandidatePositions(state, playerId).length === 0) {
    throw new V070GameActionError(
      'Divestment requires at least one Deed you own.',
    );
  }
  if (card.id === 'financiers-liquidation'
    && state.players[playerId].financiers!.treasury.length === 0) {
    throw new V070GameActionError(
      'Liquidation requires at least one card in your Treasury.',
    );
  }
  if (card.id === 'financiers-margin-loan') {
    if (marginLoanCollateralCandidateInstanceIds(
      state,
      playerId,
      cardInstanceId,
    ).length === 0) {
      throw new V070GameActionError(
        'Margin Loan requires one other card in your Hand or Treasury as collateral.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(
      state,
      playerId,
      cardInstanceId,
    );
  }
  if (card.id === 'financiers-foreclosure') {
    if (turnState.phase !== 'denouement') {
      throw new V070GameActionError(
        'Foreclosure may be played only during Denouement.',
      );
    }
    if (foreclosureTargetPosition(state, playerId) === null) {
      throw new V070GameActionError(
        'Foreclosure requires the next opposing Territory beyond your Front Line to be unoccupied and its Deed to be yours.',
      );
    }
  }
  if (card.id === 'mystics-threefold-vision'
    && player.zones.drawPile.length < 3) {
    throw new V070GameActionError(
      'Threefold Vision requires at least three cards in your Draw Pile.',
    );
  }
  if (isSimpleBankingActionCardId(card.id)) {
    pendingBankReplacementV070AssetInstanceIds(
      state,
      playerId,
      cardInstanceId,
    );
  }

  if (options.spendAction !== false) {
    spendTurnAction(state, playerId);
  }

  player.zones.hand.splice(handIndex, 1);
  state.pendingActionCard = {
    playerId,
    instanceId: cardInstanceId,
    cardId: card.id,
    phase: turnState.phase,
  };

  appendV070Event(state, {
    type: 'action_card_played',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: card.id,
      phase: turnState.phase,
      actionsRemaining: requireTurnState(state).actionsAvailable,
      ...(options.spendAction === false
        ? {
            actionSpent: false,
            source: options.source ?? 'effect',
            sourceActionInstanceId: options.sourceActionInstanceId ?? null,
          }
        : {}),
    },
  });
  applyV070BlasphemyForActionPlay(
    state,
    playerId,
    card.id,
  );

  const censureCount = openV070CensureChoicesForActionPlay(
    state,
    playerId,
    cardInstanceId,
  );
  if (censureCount === 0) continuePendingActionCard(state);
}

function actionEffectBanksItsOwnCard(cardId: string): boolean {
  const card = v070CanonicalContent.cardsById.get(cardId);
  const action = card?.effects.find(effect => effect.label === 'Action');
  return action ? /\bbank this card\b/i.test(action.text) : false;
}

function conscriptionBankingActionCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    if (!cardId
      || !actionEffectBanksItsOwnCard(cardId)
      || !(V070_EXECUTABLE_ACTION_CARD_IDS as readonly string[]).includes(cardId)) {
      return false;
    }

    try {
      const probe = structuredClone(state) as V070GameState;
      probe.pendingActionEffectChoice = null;
      playActionCard(
        probe,
        playerId,
        instanceId,
        {
          spendAction: false,
          source: 'Conscription legality probe',
        },
      );
      return true;
    } catch {
      return false;
    }
  });
}

function openConscriptionBankingActionChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const candidates = conscriptionBankingActionCandidateInstanceIds(
    state,
    playerId,
  );
  if (candidates.length === 0) {
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'conscription_banking_action',
    playerId,
    sourceActionInstanceId,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'conscription_banking_action',
      playerId,
      sourceActionInstanceId,
      purpose: 'Conscription',
      optional: true,
      candidateCount: candidates.length,
    },
  });
  appendV070Event(state, {
    type: 'action_effect_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind: 'conscription_banking_action',
      sourceActionInstanceId,
      purpose: 'Conscription',
      targetInstanceIds: [...candidates],
    },
  });
}

function resolveConscriptionBankingAction(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId?: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'conscription_banking_action'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-conscription') {
    throw new V070GameActionError(
      'No Conscription immediate banking Action choice is pending for that player.',
    );
  }

  if (targetInstanceId === undefined) {
    state.pendingActionEffectChoice = null;
    finishPendingActionCard(state);
    return;
  }

  if (!choice.candidateInstanceIds.includes(targetInstanceId)
    || !conscriptionBankingActionCandidateInstanceIds(
      state,
      playerId,
    ).includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Conscription must choose a currently legal Hand card whose Action effect banks it, or pass.',
    );
  }

  const sourceActionInstanceId = pending.instanceId;
  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);

  playActionCard(
    state,
    playerId,
    targetInstanceId,
    {
      spendAction: false,
      source: 'Conscription',
      sourceActionInstanceId,
    },
  );
}

function resolveCensureChoice(
  state: V070GameState,
  playerId: PlayerId,
  sanctionInstanceId: string,
  choice: 'discard' | 'draw',
  discardInstanceId?: string,
): void {
  const pending = currentV070CensureChoice(state, playerId);
  if (pending.sanctionInstanceId !== sanctionInstanceId) {
    throw new V070GameActionError('Resolve Sanctions: Censure choices in trigger order.');
  }
  if (!state.pendingActionCard
    || state.pendingActionCard.instanceId !== pending.sourceActionInstanceId) {
    throw new V070GameActionError('The Censure trigger is missing its pending Action card.');
  }

  if (choice === 'discard') {
    if (!discardInstanceId) {
      throw new V070GameActionError('Sanctions: Censure requires one chosen Hand discard.');
    }
    const hand = state.players[playerId].zones.hand;
    const index = hand.indexOf(discardInstanceId);
    if (index < 0) {
      throw new V070GameActionError('Sanctions: Censure must discard a card from Hand.');
    }
    hand.splice(index, 1);
    state.players[playerId].zones.discardPile.push(discardInstanceId);
    appendV070Event(state, {
      type: 'card_discarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: discardInstanceId,
        cardId: state.cardInstances[discardInstanceId]?.cardId,
        purpose: 'Sanctions: Censure',
      },
    });
  } else {
    if (discardInstanceId) {
      throw new V070GameActionError('The +1 Card Censure choice does not discard a Hand card.');
    }
    drawIntoHand(state, playerId, 1, 'Sanctions: Censure');
  }

  completeV070CensureChoice(
    state,
    playerId,
    sanctionInstanceId,
    choice,
    discardInstanceId,
  );

  if (state.pendingSanctionChoices.length === 0) {
    continuePendingActionCard(state);
  }
}

function continuePendingActionCard(state: V070GameState): void {
  const pending = state.pendingActionCard;
  if (!pending) throw new V070GameActionError('No Action card is pending resolution.');
  if (state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError('Resolve all Censure choices before the Action effect.');
  }
  if (state.pendingActionEffectChoice) {
    throw new V070GameActionError('Resolve the pending printed Action effect choice first.');
  }

  switch (pending.cardId) {
    case 'neutral-rallying-cry':
      drawIntoHand(state, pending.playerId, 1, 'Rallying Cry');
      finishPendingActionCard(state);
      return;
    case 'neutral-advance-guard':
      state.turnState = queueNormalV070MovementStep(
        requireTurnState(state),
        {
          source: 'Advance Guard',
          choiceRestriction: 'any',
          battleRestriction: 'allowed_no_gambit',
        },
      );
      appendV070Event(state, {
        type: 'movement_step_granted',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          purpose: 'Advance Guard',
          sourceActionInstanceId: pending.instanceId,
          choiceRestriction: 'any',
          battleRestriction: 'allowed_no_gambit',
        },
      });
      finishPendingActionCard(state);
      return;
    case 'neutral-forced-march':
      state.turnState = queueNormalV070MovementStep(
        requireTurnState(state),
        {
          source: 'Forced March',
          choiceRestriction: 'any',
          battleRestriction: 'prohibited',
        },
      );
      appendV070Event(state, {
        type: 'movement_step_granted',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          purpose: 'Forced March',
          sourceActionInstanceId: pending.instanceId,
          choiceRestriction: 'any',
          battleRestriction: 'prohibited',
        },
      });
      finishPendingActionCard(state);
      return;
    case 'neutral-arcane-knowledge':
      state.pendingActionEffectChoice = {
        kind: 'arcane_knowledge_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendActionTargetChoicePending(state, pending.playerId, pending.instanceId, 'arcane_knowledge_target');
      return;
    case 'neutral-capital-punishment': {
      const opponentId = otherPlayer(pending.playerId);
      if (state.players[opponentId].zones.assetBank.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Capital Punishment',
            reason: 'required_opposing_asset_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      assertV070ForcedAssetChoicesSupported(state, opponentId);
      state.pendingActionEffectChoice = {
        kind: 'forced_asset_target',
        playerId: pending.playerId,
        assetOwnerId: opponentId,
        actionOwnerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Capital Punishment',
        destination: 'graveyard',
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'forced_asset_target',
          playerId: pending.playerId,
          assetOwnerId: opponentId,
          actionOwnerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Capital Punishment',
          destination: 'graveyard',
          targetInstanceIds: [...state.players[opponentId].zones.assetBank],
        },
      });
      return;
    }
    case 'neutral-consolidation':
      drawIntoHand(state, pending.playerId, 2, 'Consolidation');
      finishPendingActionCard(state);
      return;
    case 'neutral-conscription':
      drawIntoHand(state, pending.playerId, 1, 'Conscription');
      openConscriptionBankingActionChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'neutral-contraband':
      state.pendingActionEffectChoice = {
        kind: 'contraband_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendActionTargetChoicePending(state, pending.playerId, pending.instanceId, 'contraband_target');
      return;
    case 'neutral-disruption':
      resolveDisruptionAction(state, pending.playerId, pending.instanceId);
      finishPendingActionCard(state);
      return;
    case 'military-invasion':
      if (pending.phase === 'opening') {
        state.turnState = queueNormalV070MovementStep(
          requireTurnState(state),
          {
            source: 'Invasion',
            choiceRestriction: 'advance_only',
            battleRestriction: 'allowed',
          },
        );
        state.turnState = queueNormalV070MovementStep(
          requireTurnState(state),
          {
            source: 'Invasion',
            choiceRestriction: 'advance_only',
            battleRestriction: 'allowed',
          },
        );
        appendV070Event(state, {
          type: 'movement_steps_granted',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            amount: 2,
            purpose: 'Invasion',
            sourceActionInstanceId: pending.instanceId,
            phase: pending.phase,
            choiceRestriction: 'advance_only',
            battleRestriction: 'allowed',
          },
        });
      } else {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Invasion',
            reason: 'movement_phase_already_passed',
          },
        });
      }
      finishPendingActionCard(state);
      return;
    case 'military-give-chase':
      state.turnState = beginEffectGrantedV070Movement(
        requireTurnState(state),
        1,
        {
          source: 'Give Chase',
          choiceRestriction: 'advance_required',
          battleRestriction: 'allowed',
        },
      );
      appendV070Event(state, {
        type: 'movement_step_granted',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          purpose: 'Give Chase',
          sourceActionInstanceId: pending.instanceId,
          phase: pending.phase,
          separateSequence: true,
          choiceRestriction: 'advance_required',
          battleRestriction: 'allowed',
        },
      });
      finishPendingActionCard(state, 'graveyard');
      return;
    case 'military-battlefield-promotion': {
      const candidates = battlefieldPromotionCandidateInstanceIds(
        state,
        pending.playerId,
      );
      if (candidates.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Battlefield Promotion',
            reason: 'required_winning_battle_tactic_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'battlefield_promotion_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        candidateInstanceIds: [...candidates],
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'battlefield_promotion_target',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Battlefield Promotion',
          targetInstanceIds: [...candidates],
        },
      });
      return;
    }
    case 'mystics-fate-s-toll':
      if (state.players[pending.playerId].zones.hand.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: "Fate's Toll",
            reason: 'required_hand_cost_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'fates_toll_cost',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'fates_toll_cost',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: "Fate's Toll",
          candidateCount: state.players[pending.playerId].zones.hand.length,
        },
      });
      appendV070Event(state, {
        type: 'action_effect_choice_options',
        actor: pending.playerId,
        visibility: pending.playerId,
        payload: {
          kind: 'fates_toll_cost',
          sourceActionInstanceId: pending.instanceId,
          purpose: "Fate's Toll",
          targetInstanceIds: [
            ...state.players[pending.playerId].zones.hand,
          ],
        },
      });
      return;
    case 'neutral-insurrection':
      resolveInsurrectionAction(state, pending.playerId, pending.instanceId);
      finishPendingActionCard(state);
      return;
    case 'neutral-manifest-destiny':
      openManifestDestinySacrificeChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'neutral-landslide': {
      const positions = availableLandslidePositions(state);
      if (positions.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Landslide',
            reason: 'required_territory_target_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'territory_overlay_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Landslide',
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'territory_overlay_target',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Landslide',
          territoryPositions: positions,
        },
      });
      return;
    }
    case 'military-encampment':
    case 'mystics-circle-of-bones':
    case 'mystics-nature-s-altar':
    case 'mystics-spirit-hollow':
      openLocalPlacementOverlayActionChoice(
        state,
        pending.playerId,
        pending.instanceId,
        pending.cardId,
      );
      return;
    case 'neutral-new-recruits':
      if (!openHandDestinationChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'New Recruits',
        'discard',
        2,
      )) {
        finishPendingActionCard(state);
      }
      return;
    case 'neutral-phantom-passage':
      openControlledTerritoryMovementChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Phantom Passage',
        true,
        'graveyard',
      );
      return;
    case 'neutral-revolution':
      resolveRevolutionAction(state, pending.playerId);
      finishPendingActionCard(state);
      return;
    case 'neutral-reserves':
      drawIntoHand(state, pending.playerId, 1, 'Second Line');
      if (!openHandDestinationChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Second Line',
        'draw_top',
      )) {
        finishPendingActionCard(state);
      }
      return;
    case 'neutral-requisition':
      state.pendingActionEffectChoice = {
        kind: 'controlled_asset_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Requisition',
        operation: 'voluntary_discard',
        drawAfter: 2,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'controlled_asset_target',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Requisition',
          operation: 'voluntary_discard',
        },
      });
      return;
    case 'neutral-strategic-withdrawal':
      state.pendingActionEffectChoice = {
        kind: 'controlled_asset_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Strategic Withdrawal',
        operation: 'voluntary_return_hand',
        drawAfter: 0,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'controlled_asset_target',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Strategic Withdrawal',
          operation: 'voluntary_return_hand',
          targetInstanceIds: voluntarilyReturnableV070AssetInstanceIds(
            state,
            pending.playerId,
          ),
        },
      });
      return;
    case 'neutral-salvage':
      state.pendingActionEffectChoice = {
        kind: 'salvage_recovery_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendActionTargetChoicePending(
        state,
        pending.playerId,
        pending.instanceId,
        'salvage_recovery_target',
      );
      return;
    case 'neutral-sabotage': {
      const opponentId = otherPlayer(pending.playerId);
      const candidates = faceUpV070AssetInstanceIds(state, opponentId);
      if (candidates.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Sabotage',
            reason: 'required_face_up_opposing_asset_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'sabotage_asset_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'sabotage_asset_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Sabotage',
          targetInstanceIds: [...candidates],
        },
      });
      return;
    }
    case 'neutral-scouting-report':
      if (availableScoutingReportSources(state, pending.playerId).length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Scouting Report',
            reason: 'required_reveal_source_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'scouting_report_source',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'scouting_report_source',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          sources: availableScoutingReportSources(state, pending.playerId),
        },
      });
      return;
    case 'neutral-sequestration':
      startSequestrationAction(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'neutral-sedition': {
      const opponentId = otherPlayer(pending.playerId);
      if (state.players[opponentId].zones.assetBank.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Sedition',
            reason: 'required_opposing_asset_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      assertV070ForcedAssetChoicesSupported(state, opponentId);
      state.pendingActionEffectChoice = {
        kind: 'forced_asset_target',
        playerId: opponentId,
        assetOwnerId: opponentId,
        actionOwnerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Sedition',
        destination: 'discard',
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: opponentId,
        visibility: 'public',
        payload: {
          kind: 'forced_asset_target',
          playerId: opponentId,
          assetOwnerId: opponentId,
          actionOwnerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Sedition',
          destination: 'discard',
          targetInstanceIds: [...state.players[opponentId].zones.assetBank],
        },
      });
      return;
    }
    case 'neutral-tactical-planning':
      drawIntoHand(state, pending.playerId, 2, 'Tactical Planning');
      if (!openHandDestinationChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Tactical Planning',
        'draw_bottom',
      )) {
        finishPendingActionCard(state);
      }
      return;
    case 'mystics-soul-for-soul':
      if (state.players[pending.playerId].zones.hand.length === 0
        || state.players[pending.playerId].zones.graveyard.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Soul for Soul',
            reason: 'required_exchange_target_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'soul_for_soul_targets',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'soul_for_soul_targets',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
        },
      });
      return;
    case 'inquisition-burning-at-the-stake':
      resolveBurningAtStakeAction(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'inquisition-confession':
      resolveConfessionAction(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'inquisition-hellfire': {
      const maximum = v070Conviction(state, pending.playerId);
      if (maximum === 0) {
        appendV070Event(state, {
          type: 'hellfire_resolved',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            convictionSpent: 0,
            graveyardedInstanceIds: [],
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'hellfire_conviction_amount',
        playerId: pending.playerId,
        opponentId: otherPlayer(pending.playerId),
        sourceActionInstanceId: pending.instanceId,
        maximum,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'hellfire_conviction_amount',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Hellfire',
          minimum: 0,
          maximum,
        },
      });
      return;
    }
    case 'inquisition-penance': {
      const opponentId = otherPlayer(pending.playerId);
      if (state.players[opponentId].zones.hand.length === 0) {
        gainV070Conviction(
          state,
          pending.playerId,
          1,
          'Penance',
        );
        appendV070Event(state, {
          type: 'penance_resolved',
          actor: opponentId,
          visibility: 'public',
          payload: {
            actionOwnerId: pending.playerId,
            sourceActionInstanceId: pending.instanceId,
            choice: 'conviction',
            automatic: true,
          },
        });
        finishPendingActionCard(state);
        return;
      }

      state.pendingActionEffectChoice = {
        kind: 'penance_choice',
        playerId: opponentId,
        actionOwnerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: opponentId,
        visibility: 'public',
        payload: {
          kind: 'penance_choice',
          playerId: opponentId,
          actionOwnerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Penance',
          options: ['graveyard', 'conviction'],
          handCount: state.players[opponentId].zones.hand.length,
        },
      });
      return;
    }
    case 'inquisition-divine-mercy': {
      const opponentId = otherPlayer(pending.playerId);
      state.pendingActionEffectChoice = {
        kind: 'divine_mercy_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'divine_mercy_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Divine Mercy',
          targetInstanceIds: [
            ...state.players[opponentId].zones.graveyard,
          ],
        },
      });
      return;
    }
    case 'inquisition-accusation': {
      const opponentId = otherPlayer(pending.playerId);
      if (state.players[opponentId].zones.discardPile.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Accusation',
            reason: 'required_opponent_discard_target_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'accusation_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'accusation_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          targetInstanceIds: [...state.players[opponentId].zones.discardPile],
        },
      });
      return;
    }
    case 'financiers-divestment':
      openOwnedDeedTargetChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-liquidation':
      openTreasuryCardTargetChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-margin-loan':
      resolveMarginLoanBankAction(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-leveraged-buyout':
      openLeveragedBuyoutDeedTargetChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-speculation':
      openSpeculationTerritoryTargetChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-capital-gains':
      openCapitalGainsTreasuryTargetChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'financiers-corner-the-market':
      openDeedPurchaseChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Corner the Market',
        null,
      );
      return;
    case 'financiers-foreclosure':
      resolveForeclosureAction(state, pending.playerId);
      finishPendingActionCard(state);
      return;
    case 'financiers-monetary-crisis':
      resolveMonetaryCrisisAction(state, pending.playerId);
      finishPendingActionCard(state);
      return;
    case 'mystics-threefold-vision': {
      const candidates = state.players[pending.playerId].zones.drawPile.slice(0, 3);
      if (candidates.length < 3) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Threefold Vision',
            reason: 'required_draw_pile_cards_unavailable',
            availableCount: candidates.length,
          },
        });
        finishPendingActionCard(state);
        return;
      }

      state.pendingActionEffectChoice = {
        kind: 'threefold_vision_distribution',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        candidateInstanceIds: [...candidates],
      };
      appendV070Event(state, {
        type: 'draw_pile_cards_looked_at',
        actor: pending.playerId,
        visibility: pending.playerId,
        payload: {
          purpose: 'Threefold Vision',
          sourceActionInstanceId: pending.instanceId,
          instanceIds: [...candidates],
          cards: candidates.map(instanceId => ({
            instanceId,
            cardId: state.cardInstances[instanceId]?.cardId,
          })),
        },
      });
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'threefold_vision_distribution',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Threefold Vision',
          candidateCount: candidates.length,
        },
      });
      return;
    }
    case 'mystics-accursed-wager':
      armV070AccursedWager(
        state,
        pending.playerId,
        pending.instanceId,
      );
      finishPendingActionCard(state);
      return;
    case 'mystics-necromancy': {
      const candidates = necromancyReclaimCandidateInstanceIds(
        state,
        pending.playerId,
      );
      state.pendingActionEffectChoice = {
        kind: 'necromancy_mode',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        reclaimCandidateInstanceIds: [...candidates],
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'necromancy_mode',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Necromancy',
          modes: ['recycle', 'reclaim'],
          reclaimCandidateInstanceIds: [...candidates],
          maximumReclaim: 3,
        },
      });
      return;
    }
    case 'mystics-paths-of-shadow':
      openControlledTerritoryMovementChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Paths of Shadow',
        false,
        'discard',
      );
      return;
    case 'mystics-dark-omens': {
      const drawn = drawIntoHand(
        state,
        pending.playerId,
        2,
        'Dark Omens',
      );
      if (drawn.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Dark Omens',
            reason: 'required_drawn_card_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      if (drawn.length === 1) {
        moveDarkOmensDrawnCardToGraveyard(
          state,
          pending.playerId,
          drawn[0],
        );
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'dark_omens_graveyard_target',
        playerId: pending.playerId,
        sourceActionInstanceId: pending.instanceId,
        candidateInstanceIds: [...drawn],
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'dark_omens_graveyard_target',
          playerId: pending.playerId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Dark Omens',
          candidateCount: drawn.length,
        },
      });
      return;
    }
    case 'inquisition-anathema': {
      const opponentId = otherPlayer(pending.playerId);
      if (state.players[opponentId].zones.discardPile.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Anathema',
            reason: 'required_opponent_discard_target_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'anathema_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'anathema_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Anathema',
          targetInstanceIds: [...state.players[opponentId].zones.discardPile],
        },
      });
      return;
    }
    case 'inquisition-act-of-faith': {
      const opponentId = otherPlayer(pending.playerId);
      const revealed = revealTopV070DrawCards(
        state,
        pending.playerId,
        opponentId,
        3,
        'Act of Faith',
      );
      if (revealed.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Act of Faith',
            reason: 'required_opponent_draw_card_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      if (revealed.length === 1) {
        routeActOfFaithRevealedCards(
          state,
          pending.playerId,
          opponentId,
          revealed,
          revealed[0],
        );
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'act_of_faith_graveyard_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
        revealedInstanceIds: [...revealed],
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'act_of_faith_graveyard_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Act of Faith',
          targetInstanceIds: [...revealed],
        },
      });
      return;
    }
    case 'intelligence-operational-reassessment':
      openOperationalReassessmentMissionChoice(
        state,
        pending.playerId,
        pending.instanceId,
      );
      return;
    case 'intelligence-assassins': {
      const opponentId = otherPlayer(pending.playerId);
      const revealed = revealV070Hand(
        state,
        pending.playerId,
        opponentId,
        'Assassins',
        pending.instanceId,
      );
      if (revealed === null) {
        finishPendingActionCard(state);
        return;
      }
      if (revealed.length === 0) {
        appendV070Event(state, {
          type: 'action_effect_incomplete',
          actor: pending.playerId,
          visibility: 'public',
          payload: {
            sourceActionInstanceId: pending.instanceId,
            purpose: 'Assassins',
            reason: 'required_opponent_hand_target_unavailable',
          },
        });
        finishPendingActionCard(state);
        return;
      }
      state.pendingActionEffectChoice = {
        kind: 'opponent_hand_discard_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Assassins',
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'opponent_hand_discard_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          purpose: 'Assassins',
          targetInstanceIds: [...revealed],
        },
      });
      return;
    }
    case 'intelligence-spies': {
      const revealed = revealV070Hand(
        state,
        pending.playerId,
        otherPlayer(pending.playerId),
        'Spies',
        pending.instanceId,
      );
      if (revealed === null) {
        finishPendingActionCard(state);
        return;
      }
      drawIntoHand(state, pending.playerId, 1, 'Spies');
      if (!openHandDestinationChoice(
        state,
        pending.playerId,
        pending.instanceId,
        'Spies',
        'discard',
      )) {
        finishPendingActionCard(state);
      }
      return;
    }
    case 'inquisition-guilt-by-association': {
      const opponentId = otherPlayer(pending.playerId);
      state.pendingActionEffectChoice = {
        kind: 'guilt_by_association_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'guilt_by_association_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          targetInstanceIds: [...state.players[opponentId].zones.discardPile],
        },
      });
      return;
    }
    case 'inquisition-excommunication': {
      const opponentId = otherPlayer(pending.playerId);
      state.pendingActionEffectChoice = {
        kind: 'excommunication_targets',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
        maxCombinedValue: 5,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'excommunication_targets',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
          maxCombinedValue: 5,
          eligibleInstanceIds: state.players[opponentId].zones.discardPile.filter(
            instanceId => v070CardValue(state, instanceId) <= 5,
          ),
        },
      });
      return;
    }
    case 'military-reserve-force':
      resolveBindingBankAction(
        state,
        pending.playerId,
        pending.instanceId,
        pending.cardId,
      );
      return;
    case 'intelligence-extraordinary-rendition':
      resolveBindingBankAction(
        state,
        pending.playerId,
        pending.instanceId,
        pending.cardId,
      );
      return;
    case 'intelligence-sleeper-network':
      resolveBindingBankAction(
        state,
        pending.playerId,
        pending.instanceId,
        pending.cardId,
      );
      return;
    case 'diplomats-detente':
    case 'financiers-compound-interest':
    case 'financiers-tariffs':
    case 'financiers-war-bonds':
    case 'intelligence-regime-change':
    case 'military-high-command':
    case 'mystics-sacrifice-recovery':
      resolveSimpleBankingAction(state, pending.playerId, pending.instanceId, pending.cardId);
      return;
    case 'diplomats-clemency': {
      const opponentId = otherPlayer(pending.playerId);
      state.pendingActionEffectChoice = {
        kind: 'clemency_target',
        playerId: pending.playerId,
        opponentId,
        sourceActionInstanceId: pending.instanceId,
      };
      appendV070Event(state, {
        type: 'action_effect_choice_pending',
        actor: pending.playerId,
        visibility: 'public',
        payload: {
          kind: 'clemency_target',
          playerId: pending.playerId,
          opponentId,
          sourceActionInstanceId: pending.instanceId,
        },
      });
      return;
    }
    default:
      throw new V070GameActionError(
        `Unsupported pending Action effect: ${pending.cardId}.`,
      );
  }
}

function resolveDisruptionAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const opponent = otherPlayer(playerId);
  const hand = state.players[opponent].zones.hand;
  if (hand.length === 0) {
    throw new V070GameActionError('Disruption requires at least one card in the opponent’s Hand.');
  }

  const selected = deterministicV070Shuffle(
    hand,
    `${state.seed}:Disruption:${sourceActionInstanceId}:turn:${state.turnNumber}`,
  )[0];
  const index = hand.indexOf(selected);
  if (index < 0) {
    throw new V070GameActionError('Disruption could not select a random opposing Hand card.');
  }

  hand.splice(index, 1);
  state.players[opponent].zones.discardPile.push(selected);
  appendV070Event(state, {
    type: 'random_hand_card_discarded',
    actor: opponent,
    visibility: 'public',
    payload: {
      instanceId: selected,
      cardId: state.cardInstances[selected]?.cardId,
      causedBy: playerId,
      purpose: 'Disruption',
    },
  });
}

function wonInitiatedBattleThisTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const turnStartIndex = currentTurnStartEventIndex(state);
  if (turnStartIndex < 0) return false;

  let playerInitiatedCurrentBattle = false;
  for (const event of state.events.slice(turnStartIndex + 1)) {
    if (event.type === 'battle_initiated') {
      const payload = event.payload as { attacker?: PlayerId } | undefined;
      playerInitiatedCurrentBattle =
        (payload?.attacker ?? event.actor) === playerId;
      continue;
    }

    if (event.type === 'battle_outcome') {
      const payload = event.payload as { winner?: PlayerId } | undefined;
      if (playerInitiatedCurrentBattle && payload?.winner === playerId) {
        return true;
      }
      continue;
    }

    if (event.type === 'battle_aftermath_complete') {
      playerInitiatedCurrentBattle = false;
    }
  }

  return false;
}

function wonBattleThisTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const turnStartIndex = currentTurnStartEventIndex(state);
  if (turnStartIndex < 0) return false;

  return state.events.slice(turnStartIndex + 1).some(event => {
    if (event.type !== 'battle_outcome') return false;
    const payload = event.payload as { winner?: PlayerId } | undefined;
    return payload?.winner === playerId;
  });
}

function capturedTerritoryThisTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const turnStartIndex = currentTurnStartEventIndex(state);
  if (turnStartIndex < 0) return false;

  return state.events.slice(turnStartIndex + 1).some(event =>
    event.type === 'territory_captured' && event.actor === playerId
  );
}

function currentTurnStartEventIndex(state: V070GameState): number {
  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];
    if (event.type !== 'turn_started') continue;
    const payload = event.payload as { turnNumber?: number } | undefined;
    if (payload?.turnNumber === state.turnNumber) return index;
  }
  return -1;
}

function resolveInsurrectionAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  discardEntireHand(state, playerId, 'Insurrection');

  for (const current of ['A', 'B'] as const) {
    shuffleDiscardIntoDrawPile(
      state,
      current,
      `Insurrection:${sourceActionInstanceId}`,
    );
  }

  drawIntoHand(state, playerId, 3, 'Insurrection');

  grantAdditionalAction(state, playerId, 'Insurrection');
}

function grantAdditionalAction(
  state: V070GameState,
  playerId: PlayerId,
  purpose: string,
): void {
  const turnState = grantCurrentPhaseV070Actions(requireTurnState(state), 1);
  state.turnState = turnState;
  const phase = turnState.phase;
  if (phase !== 'opening' && phase !== 'denouement') {
    throw new V070GameActionError(
      'An additional Action was granted outside an Action phase.',
    );
  }
  appendV070Event(state, {
    type: 'additional_action_granted',
    actor: playerId,
    visibility: 'public',
    payload: {
      amount: 1,
      purpose,
      phase,
      actionsAvailable: turnState.actionsAvailable,
      phaseActionLimit: 1 + turnState.phaseActionGrants[phase],
    },
  });
}

function resolveRevolutionAction(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const opponent = otherPlayer(playerId);
  const playerDiscarded = discardEntireHand(state, playerId, 'Revolution');
  const opponentDiscarded = discardEntireHand(state, opponent, 'Revolution');

  drawIntoHand(state, playerId, opponentDiscarded.length, 'Revolution');
  drawIntoHand(state, opponent, playerDiscarded.length, 'Revolution');
}

function discardEntireHand(
  state: V070GameState,
  playerId: PlayerId,
  purpose: string,
): string[] {
  const player = state.players[playerId];
  const discarded = player.zones.hand.splice(0);
  player.zones.discardPile.push(...discarded);

  appendV070Event(state, {
    type: 'hand_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: discarded.length,
      purpose,
    },
  });

  return discarded;
}

function shuffleDiscardIntoDrawPile(
  state: V070GameState,
  playerId: PlayerId,
  purpose: string,
): void {
  const player = state.players[playerId];
  if (player.zones.discardPile.length === 0) return;

  player.reshuffleCount += 1;
  player.zones.drawPile = deterministicV070Shuffle(
    [...player.zones.drawPile, ...player.zones.discardPile],
    `${state.seed}:${playerId}:effect-reshuffle:${player.reshuffleCount}:${purpose}`,
  );
  player.zones.discardPile = [];

  appendV070Event(state, {
    type: 'discard_reshuffled',
    actor: playerId,
    visibility: 'public',
    payload: {
      reshuffleCount: player.reshuffleCount,
      cardCount: player.zones.drawPile.length,
      purpose,
      effectDriven: true,
    },
  });
}

function chooseRecoveryActionTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || (
      choice.kind !== 'arcane_knowledge_target'
      && choice.kind !== 'contraband_target'
      && choice.kind !== 'salvage_recovery_target'
      && choice.kind !== 'divine_mercy_target'
    )
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError('No recovery Action target choice is pending for that player.');
  }

  const player = state.players[playerId];
  if (choice.kind === 'arcane_knowledge_target') {
    if (pending.cardId !== 'neutral-arcane-knowledge') {
      throw new V070GameActionError('Arcane Knowledge target state does not match its pending Action card.');
    }
    const index = player.zones.graveyard.indexOf(targetInstanceId);
    if (index < 0) {
      throw new V070GameActionError('Arcane Knowledge must target a card in your Graveyard.');
    }
    player.zones.graveyard.splice(index, 1);
    player.zones.discardPile.push(targetInstanceId);
    appendV070Event(state, {
      type: 'graveyard_card_recycled',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: targetInstanceId,
        cardId: state.cardInstances[targetInstanceId]?.cardId,
        purpose: 'Arcane Knowledge',
      },
    });
    state.pendingActionEffectChoice = null;
    finishPendingActionCard(state);
    return;
  }

  if (choice.kind === 'divine_mercy_target') {
    if (pending.cardId !== 'inquisition-divine-mercy') {
      throw new V070GameActionError(
        'Divine Mercy target state does not match its pending Action card.',
      );
    }

    const graveyard = state.players[choice.opponentId].zones.graveyard;
    const index = graveyard.indexOf(targetInstanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'Divine Mercy must target a card in the opponent’s Graveyard.',
      );
    }

    graveyard.splice(index, 1);
    state.players[choice.opponentId].zones.discardPile.push(targetInstanceId);
    appendV070Event(state, {
      type: 'graveyard_card_recycled',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: targetInstanceId,
        cardId: state.cardInstances[targetInstanceId]?.cardId,
        owner: choice.opponentId,
        purpose: 'Divine Mercy',
      },
    });
    gainV070Conviction(state, playerId, 2, 'Divine Mercy');
    state.pendingActionEffectChoice = null;
    finishPendingActionCard(state);
    return;
  }

  if (pending.cardId !== (
    choice.kind === 'contraband_target' ? 'neutral-contraband' : 'neutral-salvage'
  )) {
    throw new V070GameActionError('Recovery target state does not match its pending Action card.');
  }

  const index = player.zones.discardPile.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      choice.kind === 'contraband_target'
        ? 'Contraband must target a card in your Discard Pile.'
        : 'Salvage must target a card in your Discard Pile.',
    );
  }
  player.zones.discardPile.splice(index, 1);
  player.zones.hand.push(targetInstanceId);
  appendV070Event(state, {
    type: 'discard_card_returned_to_hand',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      purpose: choice.kind === 'contraband_target' ? 'Contraband' : 'Salvage',
    },
  });

  state.pendingActionEffectChoice = null;
  if (choice.kind === 'contraband_target') {
    finishPendingActionCard(state);
    return;
  }

  openHandDestinationChoice(
    state,
    playerId,
    pending.instanceId,
    'Salvage',
    'discard',
  );
}

function chooseSoulForSoulTargets(
  state: V070GameState,
  playerId: PlayerId,
  handInstanceId: string,
  graveyardInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'soul_for_soul_targets'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'mystics-soul-for-soul') {
    throw new V070GameActionError(
      'No Soul for Soul exchange choice is pending for that player.',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(handInstanceId);
  const graveyardIndex = player.zones.graveyard.indexOf(graveyardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError(
      'Soul for Soul must choose one card from your Hand.',
    );
  }
  if (graveyardIndex < 0) {
    throw new V070GameActionError(
      'Soul for Soul must choose one card from your Graveyard.',
    );
  }

  player.zones.hand.splice(handIndex, 1);
  player.zones.graveyard.splice(graveyardIndex, 1);
  player.zones.hand.push(graveyardInstanceId);
  player.zones.graveyard.push(handInstanceId);

  appendV070Event(state, {
    type: 'hand_graveyard_cards_exchanged',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Soul for Soul',
      handToGraveyardInstanceId: handInstanceId,
      handToGraveyardCardId: state.cardInstances[handInstanceId]?.cardId,
      graveyardToHandInstanceId: graveyardInstanceId,
      graveyardToHandCardId: state.cardInstances[graveyardInstanceId]?.cardId,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function resolveMonetaryCrisisAction(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const discardedByPlayer = {
    A: [...state.players.A.zones.hand],
    B: [...state.players.B.zones.hand],
  } satisfies Record<PlayerId, string[]>;

  for (const owner of ['A', 'B'] as const) {
    state.players[owner].zones.hand = [];
    state.players[owner].zones.discardPile.push(...discardedByPlayer[owner]);
  }

  appendV070Event(state, {
    type: 'hands_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Monetary Crisis',
      players: (['A', 'B'] as const).map(owner => ({
        playerId: owner,
        cards: discardedByPlayer[owner].map(instanceId => ({
          instanceId,
          cardId: state.cardInstances[instanceId]?.cardId,
        })),
      })),
    },
  });

  // Both Hands are fully discarded before either player draws.
  drawIntoHand(state, 'A', 2, 'Monetary Crisis');
  drawIntoHand(state, 'B', 2, 'Monetary Crisis');
}

function resolveThreefoldVisionDistribution(
  state: V070GameState,
  playerId: PlayerId,
  handInstanceId: string,
  discardInstanceId: string,
  graveyardInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'threefold_vision_distribution'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'mystics-threefold-vision') {
    throw new V070GameActionError(
      'No Threefold Vision distribution choice is pending for that player.',
    );
  }

  const assigned = [handInstanceId, discardInstanceId, graveyardInstanceId];
  if (new Set(assigned).size !== 3) {
    throw new V070GameActionError(
      'Threefold Vision must assign three different cards.',
    );
  }
  const candidates = choice.candidateInstanceIds;
  if (assigned.some(instanceId => !candidates.includes(instanceId))
    || candidates.some(instanceId => !assigned.includes(instanceId))) {
    throw new V070GameActionError(
      'Threefold Vision must assign exactly the three cards it looked at.',
    );
  }

  const drawPile = state.players[playerId].zones.drawPile;
  if (candidates.some((instanceId, index) => drawPile[index] !== instanceId)) {
    throw new V070GameActionError(
      'The Threefold Vision cards are no longer the top three cards of your Draw Pile.',
    );
  }

  drawPile.splice(0, 3);
  state.players[playerId].zones.hand.push(handInstanceId);
  state.players[playerId].zones.discardPile.push(discardInstanceId);
  state.players[playerId].zones.graveyard.push(graveyardInstanceId);

  appendV070Event(state, {
    type: 'threefold_vision_public_cards_routed',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Threefold Vision',
      discardInstanceId,
      discardCardId: state.cardInstances[discardInstanceId]?.cardId,
      graveyardInstanceId,
      graveyardCardId: state.cardInstances[graveyardInstanceId]?.cardId,
    },
  });
  appendV070Event(state, {
    type: 'threefold_vision_hand_card_routed',
    actor: playerId,
    visibility: playerId,
    payload: {
      purpose: 'Threefold Vision',
      handInstanceId,
      handCardId: state.cardInstances[handInstanceId]?.cardId,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseDarkOmensGraveyardTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'dark_omens_graveyard_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'mystics-dark-omens') {
    throw new V070GameActionError(
      'No Dark Omens Graveyard choice is pending for that player.',
    );
  }
  if (!choice.candidateInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Dark Omens must choose one of the cards drawn by its Action.',
    );
  }
  if (!state.players[playerId].zones.hand.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'The chosen Dark Omens card is no longer in your Hand.',
    );
  }

  moveDarkOmensDrawnCardToGraveyard(state, playerId, targetInstanceId);
  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function moveDarkOmensDrawnCardToGraveyard(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Dark Omens must move a drawn card from Hand to Graveyard.',
    );
  }
  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(targetInstanceId);

  appendV070Event(state, {
    type: 'card_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      purpose: 'Dark Omens',
    },
  });
}

function revealTopV070DrawCards(
  state: V070GameState,
  actor: PlayerId,
  owner: PlayerId,
  count: number,
  purpose: 'Act of Faith',
): string[] {
  const instanceIds = state.players[owner].zones.drawPile.slice(0, count);
  appendV070Event(state, {
    type: 'draw_pile_cards_revealed',
    actor,
    visibility: 'public',
    payload: {
      owner,
      purpose,
      instanceIds: [...instanceIds],
      cards: instanceIds.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
    },
  });
  return instanceIds;
}

function chooseActOfFaithGraveyardTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'act_of_faith_graveyard_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-act-of-faith') {
    throw new V070GameActionError(
      'No Act of Faith Graveyard choice is pending for that player.',
    );
  }
  if (!choice.revealedInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Act of Faith must choose one of the cards it revealed.',
    );
  }

  routeActOfFaithRevealedCards(
    state,
    playerId,
    choice.opponentId,
    choice.revealedInstanceIds,
    targetInstanceId,
  );
  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function routeActOfFaithRevealedCards(
  state: V070GameState,
  playerId: PlayerId,
  opponentId: PlayerId,
  revealedInstanceIds: readonly string[],
  graveyardInstanceId: string,
): void {
  const drawPile = state.players[opponentId].zones.drawPile;
  if (drawPile.length < revealedInstanceIds.length
    || revealedInstanceIds.some((instanceId, index) => drawPile[index] !== instanceId)) {
    throw new V070GameActionError(
      'The revealed Act of Faith cards are no longer on top of the opponent’s Draw Pile.',
    );
  }

  drawPile.splice(0, revealedInstanceIds.length);
  const discardInstanceIds = revealedInstanceIds.filter(
    instanceId => instanceId !== graveyardInstanceId,
  );
  state.players[opponentId].zones.graveyard.push(graveyardInstanceId);
  state.players[opponentId].zones.discardPile.push(...discardInstanceIds);

  appendV070Event(state, {
    type: 'revealed_draw_cards_routed',
    actor: playerId,
    visibility: 'public',
    payload: {
      owner: opponentId,
      purpose: 'Act of Faith',
      graveyardInstanceId,
      graveyardCardId: state.cardInstances[graveyardInstanceId]?.cardId,
      discardInstanceIds: [...discardInstanceIds],
      discardCardIds: discardInstanceIds.map(
        instanceId => state.cardInstances[instanceId]?.cardId,
      ),
    },
  });
}

function revealV070Hand(
  state: V070GameState,
  actor: PlayerId,
  owner: PlayerId,
  purpose:
    | 'Assassins'
    | 'Spies'
    | 'Extraordinary Rendition'
    | 'Burning at the Stake'
    | 'Confession',
  sourceInstanceId: string,
): string[] | null {
  if (preventV070OpposingHandReveal(
    state,
    actor,
    owner,
    purpose,
    sourceInstanceId,
  )) {
    return null;
  }

  const instanceIds = [...state.players[owner].zones.hand];
  appendV070Event(state, {
    type: 'hand_revealed',
    actor,
    visibility: 'public',
    payload: {
      owner,
      purpose,
      sourceInstanceId,
      instanceIds,
      cards: instanceIds.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
    },
  });
  return instanceIds;
}

function chooseOpponentHandDiscardTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'opponent_hand_discard_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'intelligence-assassins') {
    throw new V070GameActionError(
      'No Assassins opposing-Hand discard choice is pending for that player.',
    );
  }

  const hand = state.players[choice.opponentId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Assassins must choose a card still in the opponent’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[choice.opponentId].zones.discardPile.push(targetInstanceId);
  appendV070Event(state, {
    type: 'card_discarded',
    actor: choice.opponentId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      causedBy: playerId,
      purpose: choice.purpose,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseGuiltByAssociationTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'guilt_by_association_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-guilt-by-association') {
    throw new V070GameActionError(
      'No Guilt by Association target choice is pending for that player.',
    );
  }

  const discard = state.players[choice.opponentId].zones.discardPile;
  if (!discard.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Guilt by Association must target a card in the opponent’s Discard Pile.',
    );
  }

  const targetCardId = state.cardInstances[targetInstanceId]?.cardId;
  if (!targetCardId) {
    throw new V070GameActionError('Guilt by Association targeted an unknown card.');
  }

  const moved = discard.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === targetCardId
  );
  state.players[choice.opponentId].zones.discardPile = discard.filter(
    instanceId => state.cardInstances[instanceId]?.cardId !== targetCardId,
  );
  state.players[choice.opponentId].zones.graveyard.push(...moved);

  appendV070Event(state, {
    type: 'discard_title_cards_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Guilt by Association',
      opponentId: choice.opponentId,
      cardId: targetCardId,
      instanceIds: moved,
      count: moved.length,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseExcommunicationTargets(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceIds: readonly string[],
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'excommunication_targets'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-excommunication') {
    throw new V070GameActionError(
      'No Excommunication target choice is pending for that player.',
    );
  }

  if (targetInstanceIds.length === 0
    || new Set(targetInstanceIds).size !== targetInstanceIds.length) {
    throw new V070GameActionError(
      'Excommunication requires one or more different cards.',
    );
  }

  const discard = state.players[choice.opponentId].zones.discardPile;
  for (const instanceId of targetInstanceIds) {
    if (!discard.includes(instanceId)) {
      throw new V070GameActionError(
        'Every Excommunication target must be in the opponent’s Discard Pile.',
      );
    }
  }

  const combinedValue = targetInstanceIds.reduce(
    (sum, instanceId) => sum + v070CardValue(state, instanceId),
    0,
  );
  if (combinedValue > choice.maxCombinedValue) {
    throw new V070GameActionError(
      `Excommunication targets have combined card value ${combinedValue}; maximum is ${choice.maxCombinedValue}.`,
    );
  }

  const selected = new Set(targetInstanceIds);
  state.players[choice.opponentId].zones.discardPile = discard.filter(
    instanceId => !selected.has(instanceId),
  );
  state.players[choice.opponentId].zones.graveyard.push(...targetInstanceIds);

  appendV070Event(state, {
    type: 'discard_cards_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Excommunication',
      opponentId: choice.opponentId,
      instanceIds: [...targetInstanceIds],
      cardIds: targetInstanceIds.map(
        instanceId => state.cardInstances[instanceId]?.cardId,
      ),
      combinedValue,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function v070CardValue(
  state: V070GameState,
  instanceId: string,
): number {
  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card || typeof card.cost !== 'number') {
    throw new V070GameActionError(
      `Card value is unavailable for instance ${instanceId}.`,
    );
  }
  return card.cost;
}

function chooseAccusationTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'accusation_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-accusation') {
    throw new V070GameActionError(
      'No Accusation target choice is pending for that player.',
    );
  }

  if (!state.players[choice.opponentId].zones.discardPile.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Accusation must target a card in the opponent’s Discard Pile.',
    );
  }

  state.pendingActionEffectChoice = {
    kind: 'accusation_response',
    playerId: choice.opponentId,
    actionOwnerId: playerId,
    sourceActionInstanceId: pending.instanceId,
    targetInstanceId,
  };

  appendV070Event(state, {
    type: 'accusation_target_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId,
      opponentId: choice.opponentId,
    },
  });
}

function resolveAccusationChoice(
  state: V070GameState,
  playerId: PlayerId,
  destination: 'draw_top' | 'graveyard',
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'accusation_response'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.playerId !== choice.actionOwnerId
    || pending.cardId !== 'inquisition-accusation') {
    throw new V070GameActionError(
      'No Accusation destination choice is pending for that player.',
    );
  }

  const discard = state.players[playerId].zones.discardPile;
  const index = discard.indexOf(choice.targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The chosen Accusation card is no longer in the opponent’s Discard Pile.',
    );
  }
  discard.splice(index, 1);

  if (destination === 'draw_top') {
    state.players[playerId].zones.drawPile.unshift(choice.targetInstanceId);
  } else {
    state.players[playerId].zones.graveyard.push(choice.targetInstanceId);
  }

  appendV070Event(state, {
    type: 'accusation_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      actionOwnerId: choice.actionOwnerId,
      targetInstanceId: choice.targetInstanceId,
      targetCardId: state.cardInstances[choice.targetInstanceId]?.cardId,
      destination,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseAnathemaTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'anathema_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-anathema') {
    throw new V070GameActionError(
      'No Anathema target choice is pending for that player.',
    );
  }

  const discard = state.players[choice.opponentId].zones.discardPile;
  const index = discard.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Anathema must choose a card in the opponent’s Discard Pile.',
    );
  }

  discard.splice(index, 1);
  state.players[choice.opponentId].zones.graveyard.push(targetInstanceId);
  appendV070Event(state, {
    type: 'card_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      owner: choice.opponentId,
      purpose: 'Anathema',
    },
  });

  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    pending.instanceId,
  );
  if (replacements.length > 0) {
    state.pendingActionEffectChoice = {
      kind: 'pending_asset_bank_replacement',
      playerId,
      sourceActionInstanceId: pending.instanceId,
      purpose: 'Anathema',
      replacementInstanceIds: [...replacements],
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'pending_asset_bank_replacement',
        playerId,
        sourceActionInstanceId: pending.instanceId,
        purpose: 'Anathema',
        replacementInstanceIds: [...replacements],
      },
    });
    return;
  }

  state.pendingActionEffectChoice = null;
  bankV070AssetFromPendingAction(
    state,
    playerId,
    pending.instanceId,
    'Anathema',
  );
  finishPendingActionCard(state, 'asset');
}

function completeAnathemaBanking(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  replaceAssetInstanceId: string,
): void {
  bankV070AssetFromPendingAction(
    state,
    playerId,
    sourceActionInstanceId,
    'Anathema',
    replaceAssetInstanceId,
  );
  finishPendingActionCard(state, 'asset');
}

function reserveForceEligibleHandInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
    return card?.effects.some(effect =>
      effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
    ) ?? false;
  });
}

function resolveBindingBankAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  cardId:
    | 'military-reserve-force'
    | 'intelligence-extraordinary-rendition'
    | 'intelligence-sleeper-network',
): void {
  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    sourceActionInstanceId,
  );
  const purpose = cardId === 'military-reserve-force'
    ? 'Reserve Force'
    : cardId === 'intelligence-extraordinary-rendition'
      ? 'Extraordinary Rendition'
      : 'Sleeper Network';

  if (replacements.length > 0) {
    state.pendingActionEffectChoice = {
      kind: 'pending_asset_bank_replacement',
      playerId,
      sourceActionInstanceId,
      purpose,
      replacementInstanceIds: [...replacements],
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'pending_asset_bank_replacement',
        playerId,
        sourceActionInstanceId,
        purpose,
        replacementInstanceIds: [...replacements],
      },
    });
    return;
  }

  completeBindingBankAction(
    state,
    playerId,
    sourceActionInstanceId,
    cardId,
  );
}

function completeBindingBankAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  cardId:
    | 'military-reserve-force'
    | 'intelligence-extraordinary-rendition'
    | 'intelligence-sleeper-network',
  replaceAssetInstanceId?: string,
): void {
  const purpose = cardId === 'military-reserve-force'
    ? 'Reserve Force'
    : cardId === 'intelligence-extraordinary-rendition'
      ? 'Extraordinary Rendition'
      : 'Sleeper Network';

  bankV070AssetFromPendingAction(
    state,
    playerId,
    sourceActionInstanceId,
    purpose,
    replaceAssetInstanceId,
  );

  if (cardId === 'military-reserve-force') {
    const eligible = reserveForceEligibleHandInstanceIds(state, playerId);
    if (eligible.length === 0) {
      appendV070Event(state, {
        type: 'action_effect_incomplete',
        actor: playerId,
        visibility: 'public',
        payload: {
          sourceActionInstanceId,
          purpose,
          reason: 'required_tactic_hand_target_unavailable',
        },
      });
      finishPendingActionCard(state, 'asset');
      return;
    }

    state.pendingActionEffectChoice = {
      kind: 'reserve_force_bind_target',
      playerId,
      sourceActionInstanceId,
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'reserve_force_bind_target',
        playerId,
        sourceActionInstanceId,
        purpose,
        candidateCount: eligible.length,
      },
    });
    appendV070Event(state, {
      type: 'action_effect_choice_options',
      actor: playerId,
      visibility: playerId,
      payload: {
        kind: 'reserve_force_bind_target',
        sourceActionInstanceId,
        purpose,
        targetInstanceIds: [...eligible],
      },
    });
    return;
  }

  if (cardId === 'intelligence-sleeper-network') {
    const eligible = state.players[playerId].zones.hand;
    if (eligible.length === 0) {
      appendV070Event(state, {
        type: 'action_effect_incomplete',
        actor: playerId,
        visibility: 'public',
        payload: {
          sourceActionInstanceId,
          purpose,
          reason: 'required_hand_bind_target_unavailable',
        },
      });
      finishPendingActionCard(state, 'asset');
      return;
    }

    state.pendingActionEffectChoice = {
      kind: 'sleeper_network_bind_target',
      playerId,
      sourceActionInstanceId,
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'sleeper_network_bind_target',
        playerId,
        sourceActionInstanceId,
        purpose,
        candidateCount: eligible.length,
      },
    });
    appendV070Event(state, {
      type: 'action_effect_choice_options',
      actor: playerId,
      visibility: playerId,
      payload: {
        kind: 'sleeper_network_bind_target',
        sourceActionInstanceId,
        purpose,
        targetInstanceIds: [...eligible],
      },
    });
    return;
  }

  const opponentId = otherPlayer(playerId);
  const revealed = revealV070Hand(
    state,
    playerId,
    opponentId,
    'Extraordinary Rendition',
    sourceActionInstanceId,
  );
  if (revealed === null) {
    finishPendingActionCard(state, 'asset');
    return;
  }
  if (revealed.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose,
        reason: 'required_opponent_hand_target_unavailable',
      },
    });
    finishPendingActionCard(state, 'asset');
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'extraordinary_rendition_bind_target',
    playerId,
    opponentId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'extraordinary_rendition_bind_target',
      playerId,
      opponentId,
      sourceActionInstanceId,
      purpose,
      targetInstanceIds: [...revealed],
    },
  });
}

function chooseReserveForceBindTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'reserve_force_bind_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'military-reserve-force') {
    throw new V070GameActionError(
      'No Reserve Force binding choice is pending for that player.',
    );
  }

  if (!reserveForceEligibleHandInstanceIds(state, playerId).includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Reserve Force must bind a Tactic-eligible card from your Hand.',
    );
  }

  bindV070CardFromPlayerZone(state, {
    hostId: pending.instanceId,
    owner: playerId,
    cardInstanceId: targetInstanceId,
    sourceZone: 'hand',
    faceUp: false,
    purpose: 'Reserve Force',
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'asset');
}

function chooseExtraordinaryRenditionBindTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'extraordinary_rendition_bind_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'intelligence-extraordinary-rendition') {
    throw new V070GameActionError(
      'No Extraordinary Rendition binding choice is pending for that player.',
    );
  }

  if (!state.players[choice.opponentId].zones.hand.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Extraordinary Rendition must bind a card still in the opponent’s Hand.',
    );
  }

  bindV070CardFromPlayerZone(state, {
    hostId: pending.instanceId,
    owner: choice.opponentId,
    cardInstanceId: targetInstanceId,
    sourceZone: 'hand',
    faceUp: true,
    purpose: 'Extraordinary Rendition',
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'asset');
}

function necromancyReclaimCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.graveyard.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId !== 'mystics-necromancy'
  );
}

function resolveNecromancyAction(
  state: V070GameState,
  playerId: PlayerId,
  mode: 'recycle' | 'reclaim',
  targetInstanceIds: readonly string[],
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'necromancy_mode'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'mystics-necromancy') {
    throw new V070GameActionError(
      'No Necromancy Action choice is pending for that player.',
    );
  }

  if (mode === 'recycle') {
    if (targetInstanceIds.length > 0) {
      throw new V070GameActionError(
        'Necromancy’s Draw Pile mode does not choose Graveyard cards.',
      );
    }

    state.pendingActionEffectChoice = null;
    state.players[playerId].zones.drawPile.push(pending.instanceId);
    appendV070Event(state, {
      type: 'action_card_resolved',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: pending.instanceId,
        cardId: pending.cardId,
        destination: 'draw_bottom',
      },
    });
    state.pendingActionCard = null;

    drawIntoHand(state, playerId, 1, 'Necromancy');
    grantAdditionalAction(state, playerId, 'Necromancy');
    return;
  }

  if (new Set(targetInstanceIds).size !== targetInstanceIds.length
    || targetInstanceIds.length > 3) {
    throw new V070GameActionError(
      'Necromancy may reclaim up to three different cards.',
    );
  }

  const eligible = necromancyReclaimCandidateInstanceIds(state, playerId);
  if (targetInstanceIds.some(instanceId => !eligible.includes(instanceId))) {
    throw new V070GameActionError(
      'Necromancy may reclaim only non-Necromancy cards currently in your Graveyard.',
    );
  }

  const player = state.players[playerId];
  const handToGraveyard = player.zones.hand.splice(0);
  player.zones.graveyard.push(...handToGraveyard);

  for (const instanceId of targetInstanceIds) {
    const index = player.zones.graveyard.indexOf(instanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'A chosen Necromancy card is no longer in your Graveyard.',
      );
    }
    player.zones.graveyard.splice(index, 1);
    player.zones.hand.push(instanceId);
  }

  appendV070Event(state, {
    type: 'necromancy_reclaim_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      handToGraveyard: handToGraveyard.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
      reclaimed: targetInstanceIds.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'graveyard');
}

function chooseSleeperNetworkBindTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'sleeper_network_bind_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'intelligence-sleeper-network') {
    throw new V070GameActionError(
      'No Sleeper Network binding choice is pending for that player.',
    );
  }

  if (!state.players[playerId].zones.hand.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Sleeper Network must bind one card still in your Hand.',
    );
  }

  bindV070CardFromPlayerZone(state, {
    hostId: pending.instanceId,
    owner: playerId,
    cardInstanceId: targetInstanceId,
    sourceZone: 'hand',
    faceUp: false,
    purpose: 'Sleeper Network',
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'asset');
}

function choosePendingAssetBankReplacement(
  state: V070GameState,
  playerId: PlayerId,
  replaceAssetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'pending_asset_bank_replacement'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError(
      'No printed Asset banking replacement choice is pending for that player.',
    );
  }

  if (!choice.replacementInstanceIds.includes(replaceAssetInstanceId)) {
    throw new V070GameActionError(
      'That Asset is not a legal replacement for the pending banking Action.',
    );
  }

  state.pendingActionEffectChoice = null;
  if (choice.purpose === 'Anathema') {
    if (pending.cardId !== 'inquisition-anathema') {
      throw new V070GameActionError(
        'Anathema banking replacement state does not match its pending Action card.',
      );
    }
    completeAnathemaBanking(
      state,
      playerId,
      pending.instanceId,
      replaceAssetInstanceId,
    );
    return;
  }

  if (choice.purpose === 'Margin Loan') {
    if (pending.cardId !== 'financiers-margin-loan') {
      throw new V070GameActionError(
        'Margin Loan replacement state does not match its pending Action card.',
      );
    }
    completeMarginLoanBankAction(
      state,
      playerId,
      pending.instanceId,
      replaceAssetInstanceId,
    );
    return;
  }

  if (choice.purpose === 'Reserve Force'
    || choice.purpose === 'Extraordinary Rendition'
    || choice.purpose === 'Sleeper Network') {
    const expectedCardId = choice.purpose === 'Reserve Force'
      ? 'military-reserve-force'
      : choice.purpose === 'Extraordinary Rendition'
        ? 'intelligence-extraordinary-rendition'
        : 'intelligence-sleeper-network';
    if (pending.cardId !== expectedCardId) {
      throw new V070GameActionError(
        'Binding banking replacement state does not match its pending Action card.',
      );
    }
    completeBindingBankAction(
      state,
      playerId,
      pending.instanceId,
      expectedCardId,
      replaceAssetInstanceId,
    );
    return;
  }

  if (!isSimpleBankingActionCardId(pending.cardId)) {
    throw new V070GameActionError(
      'The pending banking replacement does not match a supported banking Action.',
    );
  }
  completeSimpleBankingAction(
    state,
    playerId,
    pending.instanceId,
    pending.cardId,
    replaceAssetInstanceId,
  );
}

function marginLoanCollateralCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): string[] {
  const player = state.players[playerId];
  const treasury = player.financiers?.treasury ?? [];
  return [
    ...player.zones.hand.filter(instanceId =>
      instanceId !== sourceActionInstanceId
    ),
    ...treasury,
  ];
}

function resolveMarginLoanBankAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    sourceActionInstanceId,
  );
  if (replacements.length > 0) {
    state.pendingActionEffectChoice = {
      kind: 'pending_asset_bank_replacement',
      playerId,
      sourceActionInstanceId,
      purpose: 'Margin Loan',
      replacementInstanceIds: [...replacements],
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'pending_asset_bank_replacement',
        playerId,
        sourceActionInstanceId,
        purpose: 'Margin Loan',
        replacementInstanceIds: [...replacements],
      },
    });
    return;
  }

  completeMarginLoanBankAction(
    state,
    playerId,
    sourceActionInstanceId,
  );
}

function completeMarginLoanBankAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  replaceAssetInstanceId?: string,
): void {
  bankV070AssetFromPendingAction(
    state,
    playerId,
    sourceActionInstanceId,
    'Margin Loan',
    replaceAssetInstanceId,
  );

  const candidates = marginLoanCollateralCandidateInstanceIds(
    state,
    playerId,
    sourceActionInstanceId,
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Margin Loan',
        reason: 'required_collateral_unavailable_after_reactions',
      },
    });
    finishPendingActionCard(state, 'asset');
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'margin_loan_collateral_target',
    playerId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'margin_loan_collateral_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Margin Loan',
      candidateCount: candidates.length,
    },
  });
  appendV070Event(state, {
    type: 'action_effect_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind: 'margin_loan_collateral_target',
      sourceActionInstanceId,
      purpose: 'Margin Loan',
      targetInstanceIds: [...candidates],
    },
  });
}

function chooseMarginLoanCollateralTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'margin_loan_collateral_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-margin-loan') {
    throw new V070GameActionError(
      'No Margin Loan collateral choice is pending for that player.',
    );
  }

  const player = state.players[playerId];
  const fromHand = player.zones.hand.includes(targetInstanceId);
  const fromTreasury =
    player.financiers?.treasury.includes(targetInstanceId) ?? false;
  if (!fromHand && !fromTreasury) {
    throw new V070GameActionError(
      'Margin Loan collateral must still be in your Hand or Treasury.',
    );
  }

  const cardId = state.cardInstances[targetInstanceId]?.cardId;
  const card = cardId
    ? v070CanonicalContent.cardsById.get(cardId)
    : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Margin Loan collateral must be a known card instance.',
    );
  }

  bindV070CardFromPlayerZone(state, {
    hostId: pending.instanceId,
    owner: playerId,
    cardInstanceId: targetInstanceId,
    sourceZone: fromHand ? 'hand' : 'treasury',
    faceUp: true,
    purpose: 'Margin Loan',
  });
  gainV070Capital(
    state,
    playerId,
    card.cost + 2,
    'Margin Loan',
  );
  grantAdditionalAction(state, playerId, 'Margin Loan');

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'asset');
}

function openOperationalReassessmentMissionChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const candidates = v070MissionEligibleHandInstanceIds(
    state,
    playerId,
    [sourceActionInstanceId],
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Operational Reassessment',
        reason: 'replacement_mission_unavailable_after_reactions',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'operational_reassessment_mission_target',
    playerId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'operational_reassessment_mission_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Operational Reassessment',
      candidateCount: candidates.length,
    },
  });
  appendV070Event(state, {
    type: 'action_effect_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind: 'operational_reassessment_mission_target',
      sourceActionInstanceId,
      purpose: 'Operational Reassessment',
      targetInstanceIds: [...candidates],
    },
  });
}

function chooseOperationalReassessmentMissionTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'operational_reassessment_mission_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'intelligence-operational-reassessment') {
    throw new V070GameActionError(
      'No Operational Reassessment Mission choice is pending for that player.',
    );
  }

  const activeMission =
    state.players[playerId].intelligence?.activeMission;
  if (!activeMission) {
    throw new V070GameActionError(
      'Operational Reassessment requires the original Active Mission to remain active until replacement.',
    );
  }

  const candidates = v070MissionEligibleHandInstanceIds(
    state,
    playerId,
    [pending.instanceId],
  );
  if (!candidates.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Operational Reassessment must choose another eligible Intelligence Mission card still in your Hand.',
    );
  }

  const returnedMissionInstanceId = activeMission.instanceId;
  returnV070ActiveMissionToHand(
    state,
    playerId,
    'Operational Reassessment',
  );
  startV070MissionFromHand(
    state,
    playerId,
    targetInstanceId,
    'Operational Reassessment',
  );

  appendV070Event(state, {
    type: 'operational_reassessment_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      startedTurn: state.turnNumber,
    },
  });
  appendV070Event(state, {
    type: 'operational_reassessment_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      returnedMissionInstanceId,
      returnedMissionCardId:
        state.cardInstances[returnedMissionInstanceId]?.cardId,
      newMissionInstanceId: targetInstanceId,
      newMissionCardId:
        state.cardInstances[targetInstanceId]?.cardId,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function openCapitalGainsTreasuryTargetChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const treasury = state.players[playerId].financiers?.treasury ?? [];
  if (treasury.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Capital Gains',
        reason: 'required_treasury_target_unavailable_after_reactions',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'capital_gains_treasury_target',
    playerId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'capital_gains_treasury_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Capital Gains',
      targetInstanceIds: [...treasury],
    },
  });
}

function chooseCapitalGainsTreasuryTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'capital_gains_treasury_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-capital-gains') {
    throw new V070GameActionError(
      'No Capital Gains Treasury choice is pending for that player.',
    );
  }

  const treasury = state.players[playerId].financiers?.treasury ?? [];
  if (!treasury.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Capital Gains must bind to a card still in your Treasury.',
    );
  }

  bindV070PendingActionCard(state, {
    hostId: targetInstanceId,
    owner: playerId,
    cardInstanceId: pending.instanceId,
    faceUp: true,
    purpose: 'Capital Gains',
  });
  appendV070Event(state, {
    type: 'capital_gains_bound',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      treasuryCardInstanceId: targetInstanceId,
      treasuryCardId: state.cardInstances[targetInstanceId]?.cardId,
      turnNumber: state.turnNumber,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'binding');
}

function openSpeculationTerritoryTargetChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const positions = v070SpeculationTargetPositions(state, playerId);
  if (positions.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Speculation',
        reason: 'required_territory_target_unavailable_after_reactions',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'speculation_territory_target',
    playerId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'speculation_territory_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Speculation',
      territoryPositions: positions,
    },
  });
}

function chooseSpeculationTerritoryTarget(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'speculation_territory_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-speculation') {
    throw new V070GameActionError(
      'No Speculation Territory choice is pending for that player.',
    );
  }

  if (!v070SpeculationTargetPositions(state, playerId)
    .includes(territoryPosition)) {
    throw new V070GameActionError(
      'Speculation must target a Territory you currently neither control nor occupy.',
    );
  }

  placeV070Speculation(
    state,
    playerId,
    pending.instanceId,
    territoryPosition,
  );
  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'speculation');
}

function leveragedBuyoutCollateralInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): string[] {
  const player = state.players[playerId];
  return [
    ...player.zones.hand.filter(instanceId =>
      instanceId !== sourceActionInstanceId
    ),
    ...(player.financiers?.treasury ?? []),
  ];
}

function leveragedBuyoutCollateralValue(
  state: V070GameState,
  instanceIds: readonly string[],
): number {
  return instanceIds.reduce(
    (total, instanceId) => total + v070CardValue(state, instanceId),
    0,
  );
}

function leveragedBuyoutAffordableDeedPositions(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): number[] {
  if (!isV070FinancierPlayer(state, playerId)) return [];
  const paymentPower =
    state.players[playerId].financiers!.capital
    + leveragedBuyoutCollateralValue(
      state,
      leveragedBuyoutCollateralInstanceIds(
        state,
        playerId,
        sourceActionInstanceId,
      ),
    );

  const positions: number[] = [];
  for (const territory of state.board) {
    if (v070DeedOwner(state, territory.territoryInstanceId) === playerId) {
      continue;
    }
    const cost = v070DeedCost(
      state,
      playerId,
      territory.territoryInstanceId,
    );
    if (cost <= paymentPower) positions.push(territory.position);
  }
  return positions.sort((a, b) => a - b);
}

function openLeveragedBuyoutDeedTargetChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const positions = leveragedBuyoutAffordableDeedPositions(
    state,
    playerId,
    sourceActionInstanceId,
  );
  if (positions.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Leveraged Buyout',
        reason: 'no_affordable_deed_after_reactions',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'leveraged_buyout_deed_target',
    playerId,
    sourceActionInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'leveraged_buyout_deed_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Leveraged Buyout',
      territoryPositions: positions,
    },
  });
}

function chooseLeveragedBuyoutDeedTarget(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'leveraged_buyout_deed_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-leveraged-buyout') {
    throw new V070GameActionError(
      'No Leveraged Buyout Deed choice is pending for that player.',
    );
  }

  if (!leveragedBuyoutAffordableDeedPositions(
    state,
    playerId,
    pending.instanceId,
  ).includes(territoryPosition)) {
    throw new V070GameActionError(
      'Leveraged Buyout must choose a currently payable Deed you do not own.',
    );
  }

  const territory = territoryAt(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError(
      'The Leveraged Buyout Deed is no longer in the Gauntlet.',
    );
  }

  const candidates = leveragedBuyoutCollateralInstanceIds(
    state,
    playerId,
    pending.instanceId,
  );
  const cost = v070DeedCost(
    state,
    playerId,
    territory.territoryInstanceId,
  );
  state.pendingActionEffectChoice = {
    kind: 'leveraged_buyout_collateral',
    playerId,
    sourceActionInstanceId: pending.instanceId,
    territoryInstanceId: territory.territoryInstanceId,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'leveraged_buyout_collateral',
      playerId,
      sourceActionInstanceId: pending.instanceId,
      purpose: 'Leveraged Buyout',
      territoryPosition,
      cost,
      capitalAvailable: state.players[playerId].financiers!.capital,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'action_effect_choice_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      kind: 'leveraged_buyout_collateral',
      sourceActionInstanceId: pending.instanceId,
      purpose: 'Leveraged Buyout',
      targetInstanceIds: [...candidates],
    },
  });
}

function resolveLeveragedBuyoutCollateral(
  state: V070GameState,
  playerId: PlayerId,
  collateralInstanceIds: readonly string[],
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'leveraged_buyout_collateral'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-leveraged-buyout') {
    throw new V070GameActionError(
      'No Leveraged Buyout collateral choice is pending for that player.',
    );
  }

  if (new Set(collateralInstanceIds).size !== collateralInstanceIds.length) {
    throw new V070GameActionError(
      'Leveraged Buyout cannot use the same collateral card twice.',
    );
  }

  const currentCandidates = leveragedBuyoutCollateralInstanceIds(
    state,
    playerId,
    pending.instanceId,
  );
  if (collateralInstanceIds.some(instanceId =>
    !currentCandidates.includes(instanceId)
  )) {
    throw new V070GameActionError(
      'Leveraged Buyout collateral must still be in your Hand or Treasury.',
    );
  }

  const territory = state.board.find(candidate =>
    candidate.territoryInstanceId === choice.territoryInstanceId
  );
  if (!territory
    || v070DeedOwner(state, territory.territoryInstanceId) === playerId) {
    throw new V070GameActionError(
      'The Leveraged Buyout target is no longer a purchasable Deed.',
    );
  }

  const cost = v070DeedCost(
    state,
    playerId,
    territory.territoryInstanceId,
  );
  const collateralValue = leveragedBuyoutCollateralValue(
    state,
    collateralInstanceIds,
  );
  const capital = state.players[playerId].financiers!.capital;
  if (capital + collateralValue < cost) {
    throw new V070GameActionError(
      `Leveraged Buyout requires ${cost} total payment but only ${capital + collateralValue} is available from Capital and selected collateral.`,
    );
  }

  const hand = state.players[playerId].zones.hand;
  const treasury = state.players[playerId].financiers!.treasury;
  for (const instanceId of collateralInstanceIds) {
    const handIndex = hand.indexOf(instanceId);
    if (handIndex >= 0) {
      hand.splice(handIndex, 1);
      state.players[playerId].zones.graveyard.push(instanceId);
      appendV070Event(state, {
        type: 'card_graveyarded',
        actor: playerId,
        visibility: 'public',
        payload: {
          instanceId,
          cardId: state.cardInstances[instanceId]?.cardId,
          purpose: 'Leveraged Buyout collateral',
        },
      });
      continue;
    }

    if (!treasury.includes(instanceId)) {
      throw new V070GameActionError(
        'Leveraged Buyout collateral left its source zone before payment.',
      );
    }
    removeV070CardFromTreasury(
      state,
      playerId,
      instanceId,
      'graveyard',
      'Leveraged Buyout collateral',
    );
  }

  const purchase = buyV070DeedWithCollateral(
    state,
    playerId,
    territory.territoryInstanceId,
    collateralValue,
    'Leveraged Buyout',
  );
  appendV070Event(state, {
    type: 'leveraged_buyout_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      cost: purchase.cost,
      capitalPaid: purchase.capitalPaid,
      collateralValue: purchase.collateralValue,
      collateralApplied: purchase.collateralApplied,
      unusedCollateralValue:
        purchase.collateralValue - purchase.collateralApplied,
      collateralCards: collateralInstanceIds.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function ownedDeedCandidatePositions(
  state: V070GameState,
  playerId: PlayerId,
): number[] {
  const positions: number[] = [];
  for (const deed of state.deeds) {
    if (deed.owner !== playerId) continue;
    const territory = state.board.find(
      candidate => candidate.territoryInstanceId === deed.territoryInstanceId,
    );
    if (territory) positions.push(territory.position);
  }
  return positions.sort((a, b) => a - b);
}

function foreclosureTargetPosition(
  state: V070GameState,
  playerId: PlayerId,
): number | null {
  if (!isV070FinancierPlayer(state, playerId)) return null;
  const target = nextV070FrontLineTarget(state, playerId);
  if (!target
    || target.controller === playerId
    || target.occupant !== null
    || v070DeedOwner(state, target.territoryInstanceId) !== playerId) {
    return null;
  }
  return target.position;
}

function affordableDeedPurchasePositions(
  state: V070GameState,
  playerId: PlayerId,
): Array<{ position: number; cost: number }> {
  if (!isV070FinancierPlayer(state, playerId)) return [];
  const capital = state.players[playerId].financiers!.capital;
  const result: Array<{ position: number; cost: number }> = [];
  for (const territory of state.board) {
    if (v070DeedOwner(state, territory.territoryInstanceId) === playerId) {
      continue;
    }
    const cost = v070DeedCost(
      state,
      playerId,
      territory.territoryInstanceId,
    );
    if (cost <= capital) {
      result.push({ position: territory.position, cost });
    }
  }
  return result.sort((a, b) => a.position - b.position);
}

function openOwnedDeedTargetChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const positions = ownedDeedCandidatePositions(state, playerId);
  if (positions.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Divestment',
        reason: 'required_owned_deed_unavailable',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'owned_deed_target',
    playerId,
    sourceActionInstanceId,
    purpose: 'Divestment',
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'owned_deed_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Divestment',
      territoryPositions: positions,
    },
  });
}

function chooseOwnedDeedTarget(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'owned_deed_target'
    || choice.playerId !== playerId
    || choice.purpose !== 'Divestment'
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-divestment') {
    throw new V070GameActionError(
      'No Divestment Deed choice is pending for that player.',
    );
  }

  const territory = territoryAt(state, territoryPosition);
  if (!territory
    || v070DeedOwner(state, territory.territoryInstanceId) !== playerId) {
    throw new V070GameActionError(
      'Divestment must choose one Deed you currently own.',
    );
  }

  const ownedBefore = v070DeedsOwned(state, playerId);
  makeV070DeedUnowned(
    state,
    territory.territoryInstanceId,
    'Divestment',
  );
  gainV070Capital(
    state,
    playerId,
    ownedBefore,
    'Divestment',
  );
  grantAdditionalAction(state, playerId, 'Divestment');

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function openTreasuryCardTargetChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const treasury = state.players[playerId].financiers?.treasury ?? [];
  if (treasury.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Liquidation',
        reason: 'required_treasury_card_unavailable',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'treasury_card_target',
    playerId,
    sourceActionInstanceId,
    purpose: 'Liquidation',
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'treasury_card_target',
      playerId,
      sourceActionInstanceId,
      purpose: 'Liquidation',
      targetInstanceIds: [...treasury],
    },
  });
}

function chooseTreasuryCardTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'treasury_card_target'
    || choice.playerId !== playerId
    || choice.purpose !== 'Liquidation'
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'financiers-liquidation') {
    throw new V070GameActionError(
      'No Liquidation Treasury choice is pending for that player.',
    );
  }

  const treasury = state.players[playerId].financiers?.treasury ?? [];
  if (!treasury.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Liquidation must choose one card currently in your Treasury.',
    );
  }
  const cardId = state.cardInstances[targetInstanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Liquidation requires a known Treasury card.',
    );
  }

  removeV070CardFromTreasury(
    state,
    playerId,
    targetInstanceId,
    'discard',
    'Liquidation',
  );
  gainV070Capital(
    state,
    playerId,
    card.cost,
    'Liquidation',
  );

  state.pendingActionEffectChoice = null;
  openDeedPurchaseChoice(
    state,
    playerId,
    pending.instanceId,
    'Liquidation',
    1,
  );
}

function openDeedPurchaseChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  purpose: 'Liquidation' | 'Corner the Market',
  remainingPurchases: number | null,
): void {
  const candidates = affordableDeedPurchasePositions(state, playerId);
  if (candidates.length === 0 || remainingPurchases === 0) {
    state.pendingActionEffectChoice = null;
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'deed_purchase_choice',
    playerId,
    sourceActionInstanceId,
    purpose,
    remainingPurchases,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'deed_purchase_choice',
      playerId,
      sourceActionInstanceId,
      purpose,
      optional: true,
      candidates,
      remainingPurchases,
    },
  });
}

function resolveDeedPurchaseChoice(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition?: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'deed_purchase_choice'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError(
      'No immediate Deed purchase choice is pending for that player.',
    );
  }

  const expectedCardId = choice.purpose === 'Liquidation'
    ? 'financiers-liquidation'
    : 'financiers-corner-the-market';
  if (pending.cardId !== expectedCardId) {
    throw new V070GameActionError(
      'The Deed purchase choice does not match its pending Action card.',
    );
  }

  if (territoryPosition === undefined) {
    state.pendingActionEffectChoice = null;
    finishPendingActionCard(state);
    return;
  }

  const candidates = affordableDeedPurchasePositions(state, playerId);
  if (!candidates.some(candidate => candidate.position === territoryPosition)) {
    throw new V070GameActionError(
      `${choice.purpose} must choose a currently affordable Deed you do not own, or pass.`,
    );
  }
  const territory = territoryAt(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError(
      'The selected Deed no longer has a Territory in the Gauntlet.',
    );
  }

  buyV070Deed(
    state,
    playerId,
    territory.territoryInstanceId,
    choice.purpose,
  );

  state.pendingActionEffectChoice = null;
  if (state.stage === 'ended') {
    finishPendingActionCard(state);
    return;
  }

  const remaining = choice.remainingPurchases === null
    ? null
    : Math.max(0, choice.remainingPurchases - 1);
  openDeedPurchaseChoice(
    state,
    playerId,
    pending.instanceId,
    choice.purpose,
    remaining,
  );
}

function resolveForeclosureAction(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const targetPosition = foreclosureTargetPosition(state, playerId);
  if (targetPosition === null) {
    throw new V070GameActionError(
      'Foreclosure requires the next opposing Territory beyond your Front Line to be unoccupied and its Deed to be yours.',
    );
  }

  const target = territoryAt(state, targetPosition);
  if (!target) {
    throw new V070GameActionError(
      'Foreclosure target is no longer in the Gauntlet.',
    );
  }

  const advance = advanceV070FrontLine(
    state,
    playerId,
    1,
    'Foreclosure',
  );
  if (advance.reachedOpponentEnd) {
    state.stage = 'ended';
    state.winner = playerId;
    state.turnState = null;
    appendV070Event(state, {
      type: 'game_won',
      actor: playerId,
      visibility: 'public',
      payload: {
        route: 'final_territory_capture',
        source: 'Foreclosure',
      },
    });
  }
}

function resolveSimpleBankingAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  cardId: string,
): void {
  if (!isSimpleBankingActionCardId(cardId)) {
    throw new V070GameActionError(
      `Unsupported simple banking Action: ${cardId}.`,
    );
  }

  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    sourceActionInstanceId,
  );
  const purpose = simpleBankingPurpose(cardId);

  if (replacements.length > 0) {
    state.pendingActionEffectChoice = {
      kind: 'pending_asset_bank_replacement',
      playerId,
      sourceActionInstanceId,
      purpose,
      replacementInstanceIds: [...replacements],
    };
    appendV070Event(state, {
      type: 'action_effect_choice_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        kind: 'pending_asset_bank_replacement',
        playerId,
        sourceActionInstanceId,
        purpose,
        replacementInstanceIds: [...replacements],
      },
    });
    return;
  }

  completeSimpleBankingAction(
    state,
    playerId,
    sourceActionInstanceId,
    cardId,
  );
}

function completeSimpleBankingAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  cardId: string,
  replaceAssetInstanceId?: string,
): void {
  if (!isSimpleBankingActionCardId(cardId)) {
    throw new V070GameActionError(
      `Unsupported simple banking Action: ${cardId}.`,
    );
  }
  const purpose = simpleBankingPurpose(cardId);
  bankV070AssetFromPendingAction(
    state,
    playerId,
    sourceActionInstanceId,
    purpose,
    replaceAssetInstanceId,
  );

  if (cardId === 'financiers-tariffs') {
    drawIntoHand(state, playerId, 2, purpose);
    grantAdditionalAction(state, playerId, purpose);
  }

  finishPendingActionCard(state, 'asset');
}

function isSimpleBankingActionCardId(cardId: string): cardId is
  | 'diplomats-detente'
  | 'financiers-compound-interest'
  | 'financiers-tariffs'
  | 'financiers-war-bonds'
  | 'intelligence-regime-change'
  | 'military-high-command'
  | 'mystics-sacrifice-recovery' {
  return [
    'diplomats-detente',
    'financiers-compound-interest',
    'financiers-tariffs',
    'financiers-war-bonds',
    'intelligence-regime-change',
    'military-high-command',
    'mystics-sacrifice-recovery',
  ].includes(cardId);
}

function simpleBankingPurpose(
  cardId:
    | 'diplomats-detente'
    | 'financiers-compound-interest'
    | 'financiers-tariffs'
    | 'financiers-war-bonds'
    | 'intelligence-regime-change'
    | 'military-high-command'
    | 'mystics-sacrifice-recovery',
):
  | 'Compound Interest'
  | 'Détente'
  | 'High Command'
  | 'War Bonds'
  | 'Regime Change'
  | 'Reembodiment'
  | 'Tariffs' {
  switch (cardId) {
    case 'diplomats-detente': return 'Détente';
    case 'financiers-compound-interest': return 'Compound Interest';
    case 'financiers-tariffs': return 'Tariffs';
    case 'financiers-war-bonds': return 'War Bonds';
    case 'intelligence-regime-change': return 'Regime Change';
    case 'military-high-command': return 'High Command';
    case 'mystics-sacrifice-recovery': return 'Reembodiment';
  }
}

function chooseForcedAssetTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'forced_asset_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.playerId !== choice.actionOwnerId) {
    throw new V070GameActionError('No forced Asset choice is pending for that player.');
  }

  const expectedCardId = choice.purpose === 'Sedition'
    ? 'neutral-sedition'
    : 'neutral-capital-punishment';
  if (pending.cardId !== expectedCardId) {
    throw new V070GameActionError(
      'Forced Asset target state does not match its pending Action card.',
    );
  }

  assertV070ForcedAssetChoicesSupported(state, choice.assetOwnerId);
  if (!state.players[choice.assetOwnerId].zones.assetBank.includes(targetInstanceId)) {
    throw new V070GameActionError(
      `${choice.purpose} must choose one Asset controlled by the opponent.`,
    );
  }

  removeV070AssetForced(
    state,
    choice.assetOwnerId,
    targetInstanceId,
    choice.destination,
    choice.purpose,
  );

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

type V070LocalPlacementOverlayActionCardId =
  | 'military-encampment'
  | 'mystics-circle-of-bones'
  | 'mystics-nature-s-altar'
  | 'mystics-spirit-hollow';

function chooseTerritoryOverlayTarget(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'territory_overlay_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError(
      'No Territory Overlay Action target choice is pending for that player.',
    );
  }

  if (pending.cardId === 'neutral-landslide') {
    if (choice.purpose !== 'Landslide') {
      throw new V070GameActionError(
        'Territory Overlay target state does not match the pending Landslide.',
      );
    }
    if (!availableLandslidePositions(state).includes(territoryPosition)) {
      throw new V070GameActionError(
        'Landslide must target a Territory that does not already have a Landslide.',
      );
    }
  } else if (isLocalPlacementOverlayActionCardId(pending.cardId)) {
    const expectedPurpose = localPlacementOverlayPurpose(pending.cardId);
    if (choice.purpose !== expectedPurpose) {
      throw new V070GameActionError(
        'Territory Overlay target state does not match its pending Action card.',
      );
    }
    if (!availableLocalPlacementOverlayPositions(
      state,
      playerId,
      pending.cardId,
    ).includes(territoryPosition)) {
      throw new V070GameActionError(
        localPlacementOverlayTargetError(pending.cardId),
      );
    }
  } else {
    throw new V070GameActionError(
      'The pending Action card does not use a Territory Overlay target choice.',
    );
  }

  placeV070OverlayFromPendingAction(
    state,
    playerId,
    pending.instanceId,
    territoryPosition,
    `${choice.purpose} Action`,
  );

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'overlay');
}

function availableLandslidePositions(
  state: V070GameState,
): number[] {
  return state.board
    .filter(territory =>
      !v070OverlaysAt(state, territory.position).some(overlay =>
        cardIdForV070Overlay(state, overlay) === 'neutral-landslide'
      )
    )
    .map(territory => territory.position);
}

function isLocalPlacementOverlayActionCardId(
  cardId: string,
): cardId is V070LocalPlacementOverlayActionCardId {
  return cardId === 'military-encampment'
    || cardId === 'mystics-circle-of-bones'
    || cardId === 'mystics-nature-s-altar'
    || cardId === 'mystics-spirit-hollow';
}

function localPlacementOverlayPurpose(
  cardId: V070LocalPlacementOverlayActionCardId,
): 'Encampment' | 'Circle of Bones' | "Nature's Altar" | 'Spirit Hollow' {
  switch (cardId) {
    case 'military-encampment':
      return 'Encampment';
    case 'mystics-circle-of-bones':
      return 'Circle of Bones';
    case 'mystics-nature-s-altar':
      return "Nature's Altar";
    case 'mystics-spirit-hollow':
      return 'Spirit Hollow';
  }
}

function availableLocalPlacementOverlayPositions(
  state: V070GameState,
  playerId: PlayerId,
  cardId: V070LocalPlacementOverlayActionCardId,
): number[] {
  const currentPosition = state.players[playerId].position;
  if (currentPosition === null || !territoryAt(state, currentPosition)) {
    return [];
  }

  if (cardId === 'military-encampment') {
    const current = territoryAt(state, currentPosition);
    return current?.occupant === playerId && current.controller === playerId
      ? [currentPosition]
      : [];
  }

  return state.board
    .filter(territory => Math.abs(territory.position - currentPosition) <= 1)
    .map(territory => territory.position);
}

function noLocalPlacementOverlayTargetMessage(
  cardId: V070LocalPlacementOverlayActionCardId,
): string {
  if (cardId === 'military-encampment') {
    return 'Encampment requires your current Territory to be both occupied and controlled by you.';
  }
  return `${localPlacementOverlayPurpose(cardId)} requires a current Territory in the Gauntlet.`;
}

function localPlacementOverlayTargetError(
  cardId: V070LocalPlacementOverlayActionCardId,
): string {
  if (cardId === 'military-encampment') {
    return 'Encampment must target the Territory you currently occupy and control.';
  }
  return `${localPlacementOverlayPurpose(cardId)} must target your current Territory or an adjacent Territory.`;
}

function openLocalPlacementOverlayActionChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  cardId: V070LocalPlacementOverlayActionCardId,
): void {
  const positions = availableLocalPlacementOverlayPositions(
    state,
    playerId,
    cardId,
  );
  if (positions.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: localPlacementOverlayPurpose(cardId),
        reason: 'required_territory_target_unavailable',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  const purpose = localPlacementOverlayPurpose(cardId);
  state.pendingActionEffectChoice = {
    kind: 'territory_overlay_target',
    playerId,
    sourceActionInstanceId,
    purpose,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'territory_overlay_target',
      playerId,
      sourceActionInstanceId,
      purpose,
      territoryPositions: positions,
    },
  });
}

function resolveScoutingReportChoice(
  state: V070GameState,
  playerId: PlayerId,
  source: 'own_draw' | 'opponent_draw' | 'opponent_hand',
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'scouting_report_source'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-scouting-report') {
    throw new V070GameActionError('No Scouting Report source choice is pending for that player.');
  }

  const available = availableScoutingReportSources(state, playerId);
  if (!available.includes(source)) {
    throw new V070GameActionError('That Scouting Report reveal source is no longer available.');
  }

  const opponent = otherPlayer(playerId);
  let owner: PlayerId;
  let zone: 'draw_top' | 'hand';
  let instanceId: string;

  if (source === 'own_draw') {
    owner = playerId;
    zone = 'draw_top';
    instanceId = state.players[playerId].zones.drawPile[0];
  } else if (source === 'opponent_draw') {
    owner = opponent;
    zone = 'draw_top';
    instanceId = state.players[opponent].zones.drawPile[0];
  } else {
    owner = opponent;
    zone = 'hand';
    instanceId = deterministicV070Shuffle(
      state.players[opponent].zones.hand,
      `${state.seed}:Scouting Report:${pending.instanceId}:turn:${state.turnNumber}`,
    )[0];
  }

  if (!instanceId) {
    throw new V070GameActionError('Scouting Report could not identify a card to reveal.');
  }

  appendV070Event(state, {
    type: 'card_revealed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      owner,
      zone,
      purpose: 'Scouting Report',
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function availableScoutingReportSources(
  state: V070GameState,
  playerId: PlayerId,
): Array<'own_draw' | 'opponent_draw' | 'opponent_hand'> {
  const opponent = otherPlayer(playerId);
  const sources: Array<'own_draw' | 'opponent_draw' | 'opponent_hand'> = [];
  if (state.players[playerId].zones.drawPile.length > 0) sources.push('own_draw');
  if (state.players[opponent].zones.drawPile.length > 0) sources.push('opponent_draw');
  if (state.players[opponent].zones.hand.length > 0) sources.push('opponent_hand');
  return sources;
}

function battlefieldPromotionCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const turnStartIndex = currentTurnStartEventIndex(state);
  if (turnStartIndex < 0) return [];

  const currentDiscard = new Set(
    state.players[playerId].zones.discardPile,
  );
  const candidates: string[] = [];
  let battleOpen = false;
  let winner: PlayerId | undefined;
  let chosenTactics: string[] = [];

  for (const event of state.events.slice(turnStartIndex + 1)) {
    if (event.type === 'battle_initiated') {
      battleOpen = true;
      winner = undefined;
      chosenTactics = [];
      continue;
    }
    if (!battleOpen) continue;

    if (event.type === 'tactic_revealed' && event.actor === playerId) {
      const instanceId = (
        event.payload as { instanceId?: string } | undefined
      )?.instanceId;
      if (instanceId) chosenTactics.push(instanceId);
      continue;
    }

    if (event.type === 'battle_outcome') {
      winner = (
        event.payload as { winner?: PlayerId } | undefined
      )?.winner;
      continue;
    }

    if (event.type === 'battle_aftermath_complete') {
      if (winner === playerId) {
        for (const instanceId of chosenTactics) {
          if (currentDiscard.has(instanceId)
            && !candidates.includes(instanceId)) {
            candidates.push(instanceId);
          }
        }
      }
      battleOpen = false;
      winner = undefined;
      chosenTactics = [];
    }
  }

  return candidates;
}

function confessionEligibleGambitInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
    return card?.effects.some(effect =>
      effect.label === 'Gambit'
      || effect.label === 'Gambit/Tactic'
    ) ?? false;
  });
}

function applyConfessionGambitMandate(
  state: V070GameState,
  playerId: PlayerId,
  opponentId: PlayerId,
  sourceActionInstanceId: string,
  targetInstanceId: string,
): void {
  const turnState = requireTurnState(state);
  if (!confessionEligibleGambitInstanceIds(state, opponentId)
    .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Confession must name an eligible Gambit still in the revealed opponent Hand.',
    );
  }

  state.turnState = {
    ...turnState,
    gambitMandates: [
      ...turnState.gambitMandates,
      {
        playerId: opponentId,
        instanceId: targetInstanceId,
        sourceInstanceId: sourceActionInstanceId,
      },
    ],
  };
  appendV070Event(state, {
    type: 'confession_gambit_mandated',
    actor: playerId,
    visibility: 'public',
    payload: {
      opponentId,
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      sourceActionInstanceId,
      expiresAt: 'end_of_turn',
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function resolveConfessionAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const opponentId = otherPlayer(playerId);
  const revealed = revealV070Hand(
    state,
    playerId,
    opponentId,
    'Confession',
    sourceActionInstanceId,
  );
  if (revealed === null) {
    finishPendingActionCard(state);
    return;
  }

  const candidates = confessionEligibleGambitInstanceIds(
    state,
    opponentId,
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Confession',
        reason: 'no_eligible_gambit_in_revealed_hand',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  if (candidates.length === 1) {
    const onlyCandidate = candidates[0];
    if (!onlyCandidate) {
      throw new V070GameActionError(
        'Confession could not identify its only eligible Gambit.',
      );
    }
    applyConfessionGambitMandate(
      state,
      playerId,
      opponentId,
      sourceActionInstanceId,
      onlyCandidate,
    );
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'confession_gambit_target',
    playerId,
    opponentId,
    sourceActionInstanceId,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'confession_gambit_target',
      playerId,
      opponentId,
      sourceActionInstanceId,
      purpose: 'Confession',
      targetInstanceIds: [...candidates],
    },
  });
}

function chooseConfessionGambitTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'confession_gambit_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-confession') {
    throw new V070GameActionError(
      'No Confession Gambit choice is pending for that player.',
    );
  }
  if (!choice.candidateInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Confession must choose one eligible Gambit from the revealed Hand.',
    );
  }

  applyConfessionGambitMandate(
    state,
    playerId,
    choice.opponentId,
    pending.instanceId,
    targetInstanceId,
  );
}

function resolveBurningAtStakeAction(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const opponentId = otherPlayer(playerId);
  const revealed = revealV070Hand(
    state,
    playerId,
    opponentId,
    'Burning at the Stake',
    sourceActionInstanceId,
  );

  if (revealed === null) {
    finishPendingActionCard(state);
    return;
  }

  if (revealed.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Burning at the Stake',
        reason: 'opponent_hand_empty_after_reveal',
      },
    });
    finishPendingActionCard(state);
    return;
  }

  const highestValue = Math.max(
    ...revealed.map(instanceId => v070CardValue(state, instanceId)),
  );
  const candidates = revealed.filter(
    instanceId => v070CardValue(state, instanceId) === highestValue,
  );

  if (candidates.length === 1) {
    const onlyCandidate = candidates[0];
    if (!onlyCandidate) {
      throw new V070GameActionError(
        'Burning at the Stake could not identify its highest-value card.',
      );
    }
    resolveBurningAtStakeCard(
      state,
      playerId,
      opponentId,
      sourceActionInstanceId,
      onlyCandidate,
    );
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'burning_at_stake_tie',
    playerId,
    opponentId,
    sourceActionInstanceId,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'burning_at_stake_tie',
      playerId,
      opponentId,
      sourceActionInstanceId,
      purpose: 'Burning at the Stake',
      highestCardValue: highestValue,
      targetInstanceIds: [...candidates],
    },
  });
}

function resolveBurningAtStakeCard(
  state: V070GameState,
  playerId: PlayerId,
  opponentId: PlayerId,
  sourceActionInstanceId: string,
  targetInstanceId: string,
): void {
  const hand = state.players[opponentId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The chosen Burning at the Stake card is no longer in the opponent’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[opponentId].zones.graveyard.push(targetInstanceId);
  const cardId = state.cardInstances[targetInstanceId]?.cardId;
  appendV070Event(state, {
    type: 'hand_card_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      opponentId,
      instanceId: targetInstanceId,
      cardId,
      purpose: 'Burning at the Stake',
      sourceActionInstanceId,
    },
  });

  if (cardId && isV070ArcaneCard(cardId)) {
    gainV070Conviction(
      state,
      playerId,
      1,
      'Burning at the Stake',
    );
  }

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseBurningAtStakeTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'burning_at_stake_tie'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-burning-at-the-stake') {
    throw new V070GameActionError(
      'No Burning at the Stake tie choice is pending for that player.',
    );
  }
  if (!choice.candidateInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Burning at the Stake must choose among the tied highest-value cards.',
    );
  }

  resolveBurningAtStakeCard(
    state,
    playerId,
    choice.opponentId,
    pending.instanceId,
    targetInstanceId,
  );
}

function chooseHellfireAmount(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'hellfire_conviction_amount'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-hellfire') {
    throw new V070GameActionError(
      'No Hellfire Conviction choice is pending for that player.',
    );
  }

  if (!Number.isInteger(amount) || amount < 0 || amount > choice.maximum) {
    throw new V070GameActionError(
      `Hellfire must spend an integer amount of Conviction from 0 to ${choice.maximum}.`,
    );
  }

  if (amount > 0) {
    spendV070Conviction(
      state,
      playerId,
      amount,
      'Hellfire',
    );
  }

  const drawPile = state.players[choice.opponentId].zones.drawPile;
  const graveyarded = drawPile.splice(0, amount);
  state.players[choice.opponentId].zones.graveyard.push(...graveyarded);

  appendV070Event(state, {
    type: 'hellfire_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      opponentId: choice.opponentId,
      sourceActionInstanceId: pending.instanceId,
      convictionSpent: amount,
      requestedCardCount: amount,
      graveyardedInstanceIds: [...graveyarded],
      graveyardedCards: graveyarded.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
      exhausted: graveyarded.length < amount,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function resolvePenanceChoice(
  state: V070GameState,
  playerId: PlayerId,
  choiceValue: 'graveyard' | 'conviction',
  cardInstanceId?: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'penance_choice'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'inquisition-penance') {
    throw new V070GameActionError(
      'No Penance response is pending for that player.',
    );
  }

  if (choiceValue === 'graveyard') {
    if (!cardInstanceId) {
      throw new V070GameActionError(
        'Penance requires a Hand card when the Graveyard option is chosen.',
      );
    }
    const hand = state.players[playerId].zones.hand;
    const index = hand.indexOf(cardInstanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'Penance must put a card from the responding player’s Hand in their Graveyard.',
      );
    }

    hand.splice(index, 1);
    state.players[playerId].zones.graveyard.push(cardInstanceId);
    appendV070Event(state, {
      type: 'hand_card_graveyarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: cardInstanceId,
        cardId: state.cardInstances[cardInstanceId]?.cardId,
        purpose: 'Penance',
        sourceActionInstanceId: pending.instanceId,
      },
    });
  } else {
    if (cardInstanceId) {
      throw new V070GameActionError(
        'Penance’s Conviction option does not select a Hand card.',
      );
    }
    gainV070Conviction(
      state,
      choice.actionOwnerId,
      1,
      'Penance',
    );
  }

  appendV070Event(state, {
    type: 'penance_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      actionOwnerId: choice.actionOwnerId,
      sourceActionInstanceId: pending.instanceId,
      choice: choiceValue,
      cardInstanceId: choiceValue === 'graveyard'
        ? cardInstanceId
        : null,
      automatic: false,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function controlledTerritoryMovementCandidatePositions(
  state: V070GameState,
  playerId: PlayerId,
  battleAllowed: boolean,
  sourceActionInstanceId?: string,
): number[] {
  const origin = state.players[playerId].position;
  if (origin === null) return [];

  const opponentPosition = state.players[otherPlayer(playerId)].position;
  const hasEntryPayment = state.players[playerId].zones.hand.some(
    instanceId => instanceId !== sourceActionInstanceId,
  );

  return state.board
    .filter(territory => territory.controller === playerId)
    .filter(territory => territory.position !== origin)
    .filter(territory => {
      if (v070DmzBlocksEntryThisTurn(state, territory.position)) {
        return false;
      }
      if (!battleAllowed && opponentPosition === territory.position) {
        return false;
      }
      if (wouldPassOpponent(
        playerId,
        origin,
        territory.position,
        opponentPosition,
      )) {
        return false;
      }

      const overlays = v070OverlaysAt(state, territory.position);
      const active = overlays[overlays.length - 1];
      const requiresEntryDiscard = Boolean(
        active
        && cardIdForV070Overlay(state, active)
          === V070_DEMILITARIZED_ZONE_ID
        && territory.occupant === null,
      );
      return !requiresEntryDiscard || hasEntryPayment;
    })
    .map(territory => territory.position);
}

function openControlledTerritoryMovementChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  purpose: 'Paths of Shadow' | 'Phantom Passage',
  battleAllowed: boolean,
  sourceDestination: 'discard' | 'graveyard',
): void {
  const candidatePositions = controlledTerritoryMovementCandidatePositions(
    state,
    playerId,
    battleAllowed,
    sourceActionInstanceId,
  );
  if (candidatePositions.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose,
        reason: 'controlled_territory_move_target_unavailable',
      },
    });
    finishPendingActionCard(
      state,
      sourceDestination,
    );
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'controlled_territory_move_target',
    playerId,
    sourceActionInstanceId,
    purpose,
    battleAllowed,
    sourceDestination,
    candidatePositions: [...candidatePositions],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'controlled_territory_move_target',
      playerId,
      sourceActionInstanceId,
      purpose,
      battleAllowed,
      territoryPositions: [...candidatePositions],
    },
  });
}

function finalizeControlledTerritoryMoveAction(
  state: V070GameState,
  destination: 'discard' | 'graveyard',
  sourceAlreadyPlaced: boolean,
): void {
  const pending = state.pendingActionCard;
  if (!pending) {
    throw new V070GameActionError(
      'No controlled-Territory movement Action is pending resolution.',
    );
  }

  if (!sourceAlreadyPlaced) {
    if (destination === 'discard') {
      state.players[pending.playerId].zones.discardPile.push(
        pending.instanceId,
      );
    } else {
      state.players[pending.playerId].zones.graveyard.push(
        pending.instanceId,
      );
    }
  }

  appendV070Event(state, {
    type: 'action_card_resolved',
    actor: pending.playerId,
    visibility: 'public',
    payload: {
      instanceId: pending.instanceId,
      cardId: pending.cardId,
      destination,
    },
  });
  state.pendingActionCard = null;
}

function chooseControlledTerritoryMoveTarget(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
  discardInstanceId?: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'controlled_territory_move_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError(
      'No controlled-Territory movement choice is pending for that player.',
    );
  }

  const expectedCardId = choice.purpose === 'Paths of Shadow'
    ? 'mystics-paths-of-shadow'
    : 'neutral-phantom-passage';
  if (pending.cardId !== expectedCardId) {
    throw new V070GameActionError(
      'The controlled-Territory movement choice does not match its pending Action card.',
    );
  }

  const currentCandidates = controlledTerritoryMovementCandidatePositions(
    state,
    playerId,
    choice.battleAllowed,
    pending.instanceId,
  );
  if (!choice.candidatePositions.includes(territoryPosition)
    || !currentCandidates.includes(territoryPosition)) {
    throw new V070GameActionError(
      `${choice.purpose} must move to another currently legal Territory you control.`,
    );
  }

  const player = state.players[playerId];
  const opponentId = otherPlayer(playerId);
  const opponent = state.players[opponentId];
  const origin = requirePosition(player);
  const initiatesBattle = opponent.position === territoryPosition;
  if (initiatesBattle && !choice.battleAllowed) {
    throw new V070GameActionError(
      `${choice.purpose} cannot start a battle.`,
    );
  }

  state.pendingActionEffectChoice = null;
  let sourceAlreadyPlaced = false;
  if (choice.sourceDestination === 'graveyard') {
    state.players[playerId].zones.graveyard.push(pending.instanceId);
    sourceAlreadyPlaced = true;
  }

  resolveV070OverlayEntryRequirements(
    state,
    playerId,
    territoryPosition,
    discardInstanceId,
  );

  moveSettledOccupantOffOrigin(state, playerId, origin);
  player.position = territoryPosition;

  if (initiatesBattle) {
    state.battle = createV070BattleOnset({
      territoryCount: state.board.length,
      attacker: playerId,
      defender: opponentId,
      attackerOrigin: origin,
      contestedPosition: territoryPosition,
      positions: {
        A: state.players.A.position!,
        B: state.players.B.position!,
      },
      defenderControlsContested:
        territoryAt(state, territoryPosition)?.controller === opponentId,
    });
    state.turnState = {
      ...requireTurnState(state),
      battleInitiated: true,
    };
    appendV070Event(state, {
      type: 'battle_initiated',
      actor: playerId,
      visibility: 'public',
      payload: {
        attacker: playerId,
        defender: opponentId,
        attackerOrigin: origin,
        contestedPosition: territoryPosition,
        lastStand: false,
        movementStepSource: choice.purpose,
        attackerGambitProhibited: false,
      },
    });
    attachV070AccursedWagersToBattle(
      state,
      playerId,
      state.events.length - 1,
    );
  } else {
    setSettledOccupant(
      state,
      playerId,
      territoryPosition,
    );
    appendV070Event(state, {
      type: 'player_moved',
      actor: playerId,
      visibility: 'public',
      payload: {
        choice: 'effect',
        movementSource: choice.purpose,
        from: origin,
        to: territoryPosition,
      },
    });
  }

  finalizeControlledTerritoryMoveAction(
    state,
    choice.sourceDestination,
    sourceAlreadyPlaced,
  );

  openV070BlockadeChoicesForPositionChange(
    state,
    playerId,
    origin,
    territoryPosition,
  );
}

function chooseSabotageAssetTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'sabotage_asset_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-sabotage') {
    throw new V070GameActionError(
      'No Sabotage Asset target choice is pending for that player.',
    );
  }

  if (!state.players[choice.opponentId].zones.assetBank.includes(targetInstanceId)
    || !isV070AssetFaceUp(state, targetInstanceId)) {
    throw new V070GameActionError(
      'Sabotage must choose a face-up Asset controlled by the opponent.',
    );
  }

  turnV070AssetFaceDownUntilPlayerNextTurn(state, {
    instanceId: targetInstanceId,
    changedBy: playerId,
    restoreAtPlayer: playerId,
    sourceInstanceId: pending.instanceId,
    reason: 'Sabotage',
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseBattlefieldPromotionTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'battlefield_promotion_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'military-battlefield-promotion') {
    throw new V070GameActionError(
      'No Battlefield Promotion target choice is pending for that player.',
    );
  }

  if (!choice.candidateInstanceIds.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Battlefield Promotion must target a Tactic chosen in a battle you won this turn.',
    );
  }

  const discard = state.players[playerId].zones.discardPile;
  const index = discard.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The chosen Battlefield Promotion Tactic is no longer in your Discard Pile.',
    );
  }

  discard.splice(index, 1);
  state.players[playerId].zones.hand.push(targetInstanceId);
  appendV070Event(state, {
    type: 'battlefield_promotion_recovered',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      sourceActionInstanceId: pending.instanceId,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function chooseFatesTollCost(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'fates_toll_cost'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'mystics-fate-s-toll') {
    throw new V070GameActionError(
      "No Fate's Toll payment choice is pending for that player.",
    );
  }

  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      "Fate's Toll must put another card from your Hand in your Graveyard.",
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(targetInstanceId);
  appendV070Event(state, {
    type: 'card_moved_to_graveyard',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: targetInstanceId,
      cardId: state.cardInstances[targetInstanceId]?.cardId,
      purpose: "Fate's Toll",
    },
  });

  state.pendingActionEffectChoice = null;
  if (pending.phase === 'opening') {
    state.turnState = queueNormalV070MovementStep(
      requireTurnState(state),
      {
        source: "Fate's Toll",
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    );
  } else {
    state.turnState = beginEffectGrantedV070Movement(
      requireTurnState(state),
      1,
      {
        source: "Fate's Toll",
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    );
  }

  appendV070Event(state, {
    type: 'movement_step_granted',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: "Fate's Toll",
      sourceActionInstanceId: pending.instanceId,
      phase: pending.phase,
      separateSequence: pending.phase === 'denouement',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    },
  });

  finishPendingActionCard(state);
}

function sequestrationKeepOptions(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const bank = state.players[playerId].zones.assetBank;
  if (bank.length <= 1) return [...bank];

  const rendition = bank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId
      === 'intelligence-extraordinary-rendition'
    && isV070AssetFaceUp(state, instanceId)
  );
  return rendition
    ? bank.filter(instanceId => instanceId !== rendition)
    : [...bank];
}

function startSequestrationAction(
  state: V070GameState,
  actionOwnerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const playerOrder: PlayerId[] = [
    actionOwnerId,
    otherPlayer(actionOwnerId),
  ];
  const keepers: Partial<Record<PlayerId, string>> = {};
  const choosers: PlayerId[] = [];

  for (const playerId of playerOrder) {
    const bank = state.players[playerId].zones.assetBank;
    if (bank.length === 0) continue;

    const options = sequestrationKeepOptions(state, playerId);
    if (bank.length === 1 || options.length === 1) {
      const automaticKeeper = options[0];
      if (!automaticKeeper) {
        throw new V070GameActionError(
          'Sequestration could not identify the required kept Asset.',
        );
      }
      keepers[playerId] = automaticKeeper;
    } else {
      choosers.push(playerId);
    }
  }

  if (choosers.length === 0) {
    resolveSequestrationDiscards(
      state,
      actionOwnerId,
      sourceActionInstanceId,
      keepers,
    );
    return;
  }

  openSequestrationKeepChoice(
    state,
    choosers[0],
    actionOwnerId,
    sourceActionInstanceId,
    keepers,
    choosers.slice(1),
  );
}

function openSequestrationKeepChoice(
  state: V070GameState,
  playerId: PlayerId,
  actionOwnerId: PlayerId,
  sourceActionInstanceId: string,
  keepers: Partial<Record<PlayerId, string>>,
  remainingChoosers: PlayerId[],
): void {
  const targetInstanceIds = sequestrationKeepOptions(state, playerId);
  state.pendingActionEffectChoice = {
    kind: 'sequestration_keep_asset',
    playerId,
    actionOwnerId,
    sourceActionInstanceId,
    keepers: { ...keepers },
    remainingChoosers: [...remainingChoosers],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'sequestration_keep_asset',
      playerId,
      actionOwnerId,
      sourceActionInstanceId,
      purpose: 'Sequestration',
      targetInstanceIds,
    },
  });
}

function chooseSequestrationKeepAsset(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'sequestration_keep_asset'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-sequestration') {
    throw new V070GameActionError(
      'No Sequestration keep-Asset choice is pending for that player.',
    );
  }

  const options = sequestrationKeepOptions(state, playerId);
  if (!options.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Sequestration must keep one currently legal Asset.',
    );
  }

  const keepers: Partial<Record<PlayerId, string>> = {
    ...choice.keepers,
    [playerId]: targetInstanceId,
  };
  const [nextChooser, ...rest] = choice.remainingChoosers;
  if (nextChooser) {
    openSequestrationKeepChoice(
      state,
      nextChooser,
      choice.actionOwnerId,
      choice.sourceActionInstanceId,
      keepers,
      rest,
    );
    return;
  }

  state.pendingActionEffectChoice = null;
  resolveSequestrationDiscards(
    state,
    choice.actionOwnerId,
    choice.sourceActionInstanceId,
    keepers,
  );
}

function resolveSequestrationDiscards(
  state: V070GameState,
  actionOwnerId: PlayerId,
  sourceActionInstanceId: string,
  keepers: Partial<Record<PlayerId, string>>,
): void {
  for (const playerId of [
    actionOwnerId,
    otherPlayer(actionOwnerId),
  ] as const) {
    const bank = [...state.players[playerId].zones.assetBank];
    if (bank.length <= 1) continue;

    const keeper = keepers[playerId];
    if (!keeper || !bank.includes(keeper)) {
      throw new V070GameActionError(
        `Sequestration is missing ${playerId}’s kept Asset.`,
      );
    }

    let discard = bank.filter(instanceId => instanceId !== keeper);
    const rendition = discard.find(instanceId =>
      state.cardInstances[instanceId]?.cardId
        === 'intelligence-extraordinary-rendition'
      && isV070AssetFaceUp(state, instanceId)
    );
    if (rendition) {
      discard = [
        rendition,
        ...discard.filter(instanceId => instanceId !== rendition),
      ];
    }

    for (const instanceId of discard) {
      discardV070AssetByEffect(
        state,
        playerId,
        instanceId,
        'Sequestration',
      );
    }

    appendV070Event(state, {
      type: 'sequestration_asset_kept',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        instanceId: keeper,
        cardId: state.cardInstances[keeper]?.cardId,
        sourceActionInstanceId,
      },
    });
  }

  appendV070Event(state, {
    type: 'sequestration_resolved',
    actor: actionOwnerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId,
      keepers: { ...keepers },
    },
  });
  finishPendingActionCard(state);
}

function chooseControlledAssetTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'controlled_asset_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError('No controlled-Asset Action choice is pending for that player.');
  }

  if (choice.operation === 'voluntary_discard') {
    if (pending.cardId !== 'neutral-requisition'
      || choice.purpose !== 'Requisition') {
      throw new V070GameActionError(
        'The pending controlled-Asset discard does not match Requisition.',
      );
    }
    if (!voluntarilyDiscardableV070AssetInstanceIds(state, playerId).includes(targetInstanceId)) {
      throw new V070GameActionError('Requisition must choose an Asset you can voluntarily discard.');
    }

    discardV070AssetVoluntarily(
      state,
      playerId,
      targetInstanceId,
      choice.purpose,
    );
    state.pendingActionEffectChoice = null;
    if (choice.drawAfter > 0) {
      drawIntoHand(state, playerId, choice.drawAfter, choice.purpose);
    }
    finishPendingActionCard(state);
    return;
  }

  if (pending.cardId !== 'neutral-strategic-withdrawal'
    || choice.purpose !== 'Strategic Withdrawal') {
    throw new V070GameActionError(
      'The pending controlled-Asset return does not match Strategic Withdrawal.',
    );
  }
  if (!voluntarilyReturnableV070AssetInstanceIds(state, playerId).includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Strategic Withdrawal must choose an Asset you can return to your Hand.',
    );
  }

  returnV070AssetVoluntarilyToHand(
    state,
    playerId,
    targetInstanceId,
    choice.purpose,
  );
  state.pendingActionEffectChoice = null;

  if (pending.phase === 'opening') {
    state.turnState = queueNormalV070MovementStep(
      requireTurnState(state),
      {
        source: 'Strategic Withdrawal',
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    );
  } else {
    state.turnState = beginEffectGrantedV070Movement(
      requireTurnState(state),
      1,
      {
        source: 'Strategic Withdrawal',
        choiceRestriction: 'any',
        battleRestriction: 'allowed',
      },
    );
  }

  appendV070Event(state, {
    type: 'movement_step_granted',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose: 'Strategic Withdrawal',
      sourceActionInstanceId: pending.instanceId,
      phase: pending.phase,
      separateSequence: pending.phase === 'denouement',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    },
  });
  finishPendingActionCard(state);
}

function chooseHandDestinationTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'hand_destination_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId) {
    throw new V070GameActionError('No Hand-routing Action choice is pending for that player.');
  }

  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError('That Action must choose a card from your Hand.');
  }
  hand.splice(index, 1);

  if (choice.destination === 'discard') {
    state.players[playerId].zones.discardPile.push(targetInstanceId);
    appendV070Event(state, {
      type: 'card_discarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: targetInstanceId,
        cardId: state.cardInstances[targetInstanceId]?.cardId,
        purpose: choice.purpose,
      },
    });
  } else {
    const drawPile = state.players[playerId].zones.drawPile;
    if (choice.destination === 'draw_top') drawPile.unshift(targetInstanceId);
    else drawPile.push(targetInstanceId);

    appendV070Event(state, {
      type: 'hand_card_routed_to_draw_pile',
      actor: playerId,
      visibility: 'public',
      payload: {
        destination: choice.destination,
        purpose: choice.purpose,
      },
    });
    appendV070Event(state, {
      type: 'hand_card_routed_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        instanceId: targetInstanceId,
        cardId: state.cardInstances[targetInstanceId]?.cardId,
        destination: choice.destination,
        purpose: choice.purpose,
      },
    });
  }

  state.pendingActionEffectChoice = null;
  if (choice.drawAfter > 0) {
    drawIntoHand(state, playerId, choice.drawAfter, choice.purpose);
  }
  finishPendingActionCard(state);
}

function openHandDestinationChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  purpose: 'Second Line' | 'Tactical Planning' | 'Salvage' | 'New Recruits' | 'Spies',
  destination: 'draw_top' | 'draw_bottom' | 'discard',
  drawAfter = 0,
): boolean {
  if (state.players[playerId].zones.hand.length === 0) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose,
        reason: 'required_hand_target_unavailable',
      },
    });
    return false;
  }

  state.pendingActionEffectChoice = {
    kind: 'hand_destination_target',
    playerId,
    sourceActionInstanceId,
    purpose,
    destination,
    drawAfter,
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'hand_destination_target',
      playerId,
      sourceActionInstanceId,
      purpose,
      destination,
    },
  });
  return true;
}

function appendActionTargetChoicePending(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
  kind: 'arcane_knowledge_target' | 'contraband_target' | 'salvage_recovery_target',
): void {
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind,
      playerId,
      sourceActionInstanceId,
    },
  });
}

function chooseClemencyTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'clemency_target'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'diplomats-clemency') {
    throw new V070GameActionError('No Clemency target choice is pending for that player.');
  }

  const graveyard = state.players[choice.opponentId].zones.graveyard;
  if (!graveyard.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Clemency must target a card in the opponent’s Graveyard.',
    );
  }

  state.pendingActionEffectChoice = {
    kind: 'clemency_response',
    playerId: choice.opponentId,
    actionOwnerId: playerId,
    sourceActionInstanceId: pending.instanceId,
    targetInstanceId,
  };

  appendV070Event(state, {
    type: 'clemency_target_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId,
      opponentId: choice.opponentId,
    },
  });
}

function resolveClemencyChoice(
  state: V070GameState,
  playerId: PlayerId,
  response: 'recycle' | 'leave',
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'clemency_response'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'diplomats-clemency') {
    throw new V070GameActionError('No Clemency response is pending for that player.');
  }

  const graveyard = state.players[playerId].zones.graveyard;
  const targetIndex = graveyard.indexOf(choice.targetInstanceId);
  if (targetIndex < 0) {
    throw new V070GameActionError('The chosen Clemency card is no longer in the opponent’s Graveyard.');
  }

  if (response === 'recycle') {
    graveyard.splice(targetIndex, 1);
    state.players[playerId].zones.discardPile.push(choice.targetInstanceId);
    appendV070Event(state, {
      type: 'graveyard_card_recycled',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: choice.targetInstanceId,
        cardId: state.cardInstances[choice.targetInstanceId]?.cardId,
        purpose: 'Clemency',
      },
    });
    gainClemencyInfluence(state, choice.actionOwnerId);
  } else {
    drawIntoHand(state, choice.actionOwnerId, 1, 'Clemency');
  }

  appendV070Event(state, {
    type: 'clemency_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      actionOwnerId: choice.actionOwnerId,
      targetInstanceId: choice.targetInstanceId,
      response,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state);
}

function gainClemencyInfluence(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const diplomat = state.players[playerId].diplomats;
  if (!diplomat) {
    throw new V070GameActionError('Clemency Influence requires a Diplomat.');
  }
  const previous = diplomat.influence;
  diplomat.influence = Math.min(10, diplomat.influence + 1);
  appendV070Event(state, {
    type: 'influence_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      delta: diplomat.influence - previous,
      balance: diplomat.influence,
      reason: 'Clemency',
    },
  });
}

function manifestDestinyAssetCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return voluntarilyReturnableV070AssetInstanceIds(state, playerId);
}

function openManifestDestinySacrificeChoice(
  state: V070GameState,
  playerId: PlayerId,
  sourceActionInstanceId: string,
): void {
  const candidates = manifestDestinyAssetCandidateInstanceIds(
    state,
    playerId,
  );
  const otherHandCount = state.players[playerId].zones.hand.length;
  const minimumAssetCount = Math.max(1, 3 - otherHandCount);

  if (candidates.length < minimumAssetCount) {
    appendV070Event(state, {
      type: 'action_effect_incomplete',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceActionInstanceId,
        purpose: 'Manifest Destiny',
        reason: 'required_sacrifice_unavailable_after_reactions',
        otherHandCount,
        minimumAssetCount,
        candidateAssetCount: candidates.length,
      },
    });
    finishPendingActionCard(state);
    return;
  }

  state.pendingActionEffectChoice = {
    kind: 'manifest_destiny_sacrifice',
    playerId,
    sourceActionInstanceId,
    minimumAssetCount,
    candidateAssetInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'action_effect_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'manifest_destiny_sacrifice',
      playerId,
      sourceActionInstanceId,
      purpose: 'Manifest Destiny',
      otherHandCount,
      minimumAssetCount,
      candidateAssetInstanceIds: [...candidates],
    },
  });
}

function resolveManifestDestinySacrifice(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceIds: readonly string[],
): void {
  const choice = state.pendingActionEffectChoice;
  const pending = state.pendingActionCard;
  if (!choice
    || choice.kind !== 'manifest_destiny_sacrifice'
    || choice.playerId !== playerId
    || !pending
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-manifest-destiny') {
    throw new V070GameActionError(
      'No Manifest Destiny sacrifice choice is pending for that player.',
    );
  }

  if (new Set(assetInstanceIds).size !== assetInstanceIds.length) {
    throw new V070GameActionError(
      'Manifest Destiny cannot sacrifice the same Asset twice.',
    );
  }
  if (assetInstanceIds.length < choice.minimumAssetCount) {
    throw new V070GameActionError(
      `Manifest Destiny requires at least ${choice.minimumAssetCount} selected Asset${choice.minimumAssetCount === 1 ? '' : 's'} with the current Hand.`,
    );
  }

  const currentCandidates = manifestDestinyAssetCandidateInstanceIds(
    state,
    playerId,
  );
  if (assetInstanceIds.some(instanceId =>
    !currentCandidates.includes(instanceId)
  )) {
    throw new V070GameActionError(
      'Manifest Destiny may sacrifice only Assets that can currently leave play.',
    );
  }

  const player = state.players[playerId];
  if (player.zones.hand.length + assetInstanceIds.length < 3) {
    throw new V070GameActionError(
      'Manifest Destiny must put at least three other cards total in the Graveyard.',
    );
  }

  const extraordinary = assetInstanceIds.find(instanceId =>
    state.cardInstances[instanceId]?.cardId ===
      'intelligence-extraordinary-rendition'
    && isV070AssetFaceUp(state, instanceId)
  );
  const orderedAssets = extraordinary
    ? [
        extraordinary,
        ...assetInstanceIds.filter(instanceId => instanceId !== extraordinary),
      ]
    : [...assetInstanceIds];

  const handSacrifice = player.zones.hand.splice(0);
  player.zones.graveyard.push(...handSacrifice);

  for (const instanceId of orderedAssets) {
    removeV070AssetForced(
      state,
      playerId,
      instanceId,
      'graveyard',
      'Manifest Destiny sacrifice',
    );
  }

  insertV070TerritoryAtPlayerEnd(
    state,
    playerId,
    {
      territoryInstanceId: pending.instanceId,
      territoryId: pending.cardId,
      contributedBy: playerId,
      blank: true,
    },
    'Manifest Destiny Action',
  );

  appendV070Event(state, {
    type: 'manifest_destiny_sacrifice_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceActionInstanceId: pending.instanceId,
      handCards: handSacrifice.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
      assetCards: orderedAssets.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId,
      })),
      totalSacrificed: handSacrifice.length + orderedAssets.length,
    },
  });

  state.pendingActionEffectChoice = null;
  finishPendingActionCard(state, 'territory');
}

function finishPendingActionCard(
  state: V070GameState,
  destination:
    | 'discard'
    | 'graveyard'
    | 'overlay'
    | 'asset'
    | 'territory'
    | 'speculation'
    | 'binding' = 'discard',
): void {
  const pending = state.pendingActionCard;
  if (!pending) throw new V070GameActionError('No Action card is pending resolution.');
  if (state.pendingActionEffectChoice || state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError('The Action card still has unresolved choices.');
  }

  if (destination === 'discard') {
    state.players[pending.playerId].zones.discardPile.push(pending.instanceId);
  } else if (destination === 'graveyard') {
    state.players[pending.playerId].zones.graveyard.push(pending.instanceId);
  } else if (destination === 'overlay') {
    if (!state.overlays.some(overlay => overlay.instanceId === pending.instanceId)) {
      throw new V070GameActionError(
        'An Action card can resolve to Overlay only after it has been attached.',
      );
    }
  } else if (destination === 'territory') {
    if (!state.board.some(
      territory => territory.territoryInstanceId === pending.instanceId,
    )) {
      throw new V070GameActionError(
        'An Action card can resolve to Territory only after it has entered the Gauntlet.',
      );
    }
  } else if (destination === 'speculation') {
    if (!state.speculations.some(
      speculation => speculation.instanceId === pending.instanceId,
    )) {
      throw new V070GameActionError(
        'An Action card can resolve to Speculation only after it is tracking a Territory.',
      );
    }
  } else if (destination === 'binding') {
    if (!state.bindings.some(
      binding => binding.cardInstanceId === pending.instanceId,
    )) {
      throw new V070GameActionError(
        'An Action card can resolve to Binding only after it is bound to a host.',
      );
    }
  } else if (!state.players[pending.playerId].zones.assetBank.includes(pending.instanceId)) {
    throw new V070GameActionError(
      'An Action card can resolve to Asset only after it has been banked.',
    );
  }

  appendV070Event(state, {
    type: 'action_card_resolved',
    actor: pending.playerId,
    visibility: 'public',
    payload: {
      instanceId: pending.instanceId,
      cardId: pending.cardId,
      destination,
    },
  });
  state.pendingActionCard = null;
}

function drawIntoHand(
  state: V070GameState,
  playerId: PlayerId,
  count: number,
  purpose: string,
): string[] {
  const result = drawV070Cards(state, playerId, count, purpose);
  state.players[playerId].zones.hand.push(...result.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: playerId,
    visibility: 'public',
    payload: {
      count: result.drawn.length,
      purpose,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
        purpose,
      },
    });
  }
  return [...result.drawn];
}

function passOpening(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'opening');
  const turnState = advanceV070TurnPhase(requireTurnState(state));
  state.turnState = beginNormalV070Movement(turnState);

  appendV070Event(state, {
    type: 'opening_passed',
    actor: playerId,
    visibility: 'public',
  });
  appendPhaseEvent(state);
}

function chooseMovement(
  state: V070GameState,
  playerId: PlayerId,
  choice: MovementChoice,
  discardInstanceId?: string,
): void {
  const turnState = requireTurnState(state);
  const sequenceSource = turnState.movementSequenceSource;
  if (!turnState.movementSequenceOpen || !sequenceSource) {
    throw new V070GameActionError('No movement sequence is currently open.');
  }
  if (sequenceSource === 'normal' && turnState.phase !== 'movement') {
    throw new V070GameActionError(
      'Normal movement may be resolved only during the Movement phase.',
    );
  }

  if (choice === 'hold') {
    if (discardInstanceId) {
      throw new V070GameActionError('Hold has no Territory Overlay entry cost.');
    }
    state.turnState = applyV070MovementChoice(turnState, choice);
    appendV070Event(state, {
      type: 'movement_hold',
      actor: playerId,
      visibility: 'public',
      payload: { sequenceSource },
    });
    if (sequenceSource === 'normal') {
      state.turnState = advanceV070TurnPhase(state.turnState);
      appendPhaseEvent(state);
    }
    return;
  }

  const player = state.players[playerId];
  const opponentId = otherPlayer(playerId);
  const opponent = state.players[opponentId];
  const origin = requirePosition(player);
  const delta = movementDelta(playerId, choice);
  const destination = origin + delta;

  assertMovementDestination(playerId, choice, destination, state.board.length);
  const movementStep = currentV070MovementStep(turnState);
  if (!movementStep) {
    throw new V070GameActionError('No current movement step is available.');
  }
  const initiatesBattle = opponent.position === destination;
  let nextMovementState;
  try {
    nextMovementState = applyV070MovementChoice(
      turnState,
      choice,
      { initiatesBattle },
    );
  } catch (error) {
    throw new V070GameActionError(
      error instanceof Error ? error.message : 'That movement is not legal now.',
    );
  }

  resolveV070OverlayEntryRequirements(
    state,
    playerId,
    destination,
    discardInstanceId,
  );

  if (initiatesBattle) {
    const lastStand = canInitiateV070LastStand({
      attacker: playerId,
      defender: opponentId,
      territoryCount: state.board.length,
      attackerPosition: origin,
      defenderPosition: destination,
      separateMovementSequence: true,
      advancingBeyondOpponentEnd: isBeyondOpponentEnd(playerId, destination, state.board.length),
    });

    moveSettledOccupantOffOrigin(state, playerId, origin);
    player.position = destination;

    state.battle = lastStand
      ? createV070LastStandOnset({
          attacker: playerId,
          defender: opponentId,
          territoryCount: state.board.length,
          attackerPosition: origin,
          defenderPosition: destination,
          separateMovementSequence: true,
          advancingBeyondOpponentEnd: true,
          attackerGambitProhibited:
            movementStep.battleRestriction === 'allowed_no_gambit',
        })
      : createV070BattleOnset({
          territoryCount: state.board.length,
          attacker: playerId,
          defender: opponentId,
          attackerOrigin: origin,
          contestedPosition: destination,
          positions: {
            A: state.players.A.position!,
            B: state.players.B.position!,
          },
          defenderControlsContested: territoryAt(state, destination)?.controller === opponentId,
          attackerGambitProhibited:
            movementStep.battleRestriction === 'allowed_no_gambit',
        });

    state.turnState = nextMovementState;

    appendV070Event(state, {
      type: 'battle_initiated',
      actor: playerId,
      visibility: 'public',
      payload: {
        attacker: playerId,
        defender: opponentId,
        attackerOrigin: origin,
        contestedPosition: destination,
        lastStand,
        movementStepSource: movementStep.source,
        attackerGambitProhibited:
          movementStep.battleRestriction === 'allowed_no_gambit',
      },
    });
    attachV070AccursedWagersToBattle(
      state,
      playerId,
      state.events.length - 1,
    );
    openV070BlockadeChoicesForPositionChange(
      state,
      playerId,
      origin,
      destination,
    );
    return;
  }

  if (isBeyondOpponentEnd(playerId, destination, state.board.length)) {
    throw new V070GameActionError('Advancing beyond the opponent’s end is legal only when it initiates a Last Stand.');
  }

  if (wouldPassOpponent(playerId, origin, destination, opponent.position)) {
    throw new V070GameActionError('Player Tokens cannot move through or past one another.');
  }

  moveSettledOccupantOffOrigin(state, playerId, origin);
  player.position = destination;
  setSettledOccupant(state, playerId, destination);

  state.turnState = nextMovementState;
  appendV070Event(state, {
    type: 'player_moved',
    actor: playerId,
    visibility: 'public',
    payload: { choice, from: origin, to: destination },
  });

  openV070BlockadeChoicesForPositionChange(
    state,
    playerId,
    origin,
    destination,
  );
  if (state.pendingSanctionChoices.length > 0) return;

  if (!state.turnState.movementSequenceOpen
    && sequenceSource === 'normal') {
    state.turnState = advanceV070TurnPhase(state.turnState);
    appendPhaseEvent(state);
  }
}

function passDenouement(state: V070GameState, playerId: PlayerId): void {
  requirePhase(state, 'denouement');
  state.turnState = advanceV070TurnPhase(requireTurnState(state));

  appendV070Event(state, {
    type: 'denouement_passed',
    actor: playerId,
    visibility: 'public',
  });
  appendPhaseEvent(state);
}

function completeCleanup(
  state: V070GameState,
  playerId: PlayerId,
  discardInstanceIds: readonly string[],
): void {
  requirePhase(state, 'cleanup');
  const player = state.players[playerId];
  const excess = Math.max(0, player.zones.hand.length - 3);

  if (discardInstanceIds.length !== excess || new Set(discardInstanceIds).size !== discardInstanceIds.length) {
    throw new V070GameActionError(`Cleanup requires exactly ${excess} Hand discard(s).`);
  }
  for (const instanceId of discardInstanceIds) {
    if (!player.zones.hand.includes(instanceId)) {
      throw new V070GameActionError('Cleanup discards must come from the active player’s Hand.');
    }
  }

  for (const instanceId of discardInstanceIds) {
    const index = player.zones.hand.indexOf(instanceId);
    player.zones.hand.splice(index, 1);
    player.zones.discardPile.push(instanceId);
  }

  if (discardInstanceIds.length > 0) {
    appendV070Event(state, {
      type: 'cleanup_discard',
      actor: playerId,
      visibility: 'public',
      payload: {
        cards: discardInstanceIds.map(instanceId => ({
          instanceId,
          cardId: state.cardInstances[instanceId].cardId,
        })),
      },
    });
  }

  expireV070AccursedWagersAtTurnEnd(state, playerId);
  clampAllV070CapitalToLimits(state);

  const next = otherPlayer(playerId);
  state.activePlayer = next;
  state.turnNumber += 1;
  state.turnState = createV070TurnState();
  expireV070TerritoryTurnRestrictions(state);
  restoreV070AssetsAtTurnStart(state, next);

  appendV070Event(state, {
    type: 'turn_started',
    actor: next,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: state.turnState.phase },
  });

  resolveV070SpeculationsAtTurnStart(state, next);
  openV070StartTurnOverlayChoice(state, next);
}

function movementDelta(playerId: PlayerId, choice: Exclude<MovementChoice, 'hold'>): number {
  const advance = playerId === 'A' ? 1 : -1;
  return choice === 'advance' ? advance : -advance;
}

function assertMovementDestination(
  playerId: PlayerId,
  choice: Exclude<MovementChoice, 'hold'>,
  destination: number,
  territoryCount: number,
): void {
  const ownOutside = playerId === 'A' ? -1 : territoryCount;
  const opponentOutside = playerId === 'A' ? territoryCount : -1;

  if (choice === 'fall_back' && destination === ownOutside) {
    throw new V070GameActionError('A player cannot voluntarily Fall Back beyond their own end of the Gauntlet.');
  }
  if (destination < -1 || destination > territoryCount) {
    throw new V070GameActionError('Movement would leave the legal Gauntlet Position range.');
  }
  if (destination === opponentOutside && choice !== 'advance') {
    throw new V070GameActionError('Only an Advance can move beyond the opponent’s end.');
  }
}

function wouldPassOpponent(
  playerId: PlayerId,
  origin: number,
  destination: number,
  opponentPosition: number | null,
): boolean {
  if (opponentPosition === null) return false;
  if (playerId === 'A') return origin < opponentPosition && destination > opponentPosition;
  return origin > opponentPosition && destination < opponentPosition;
}

function isBeyondOpponentEnd(playerId: PlayerId, position: number, territoryCount: number): boolean {
  return playerId === 'A' ? position === territoryCount : position === -1;
}

function moveSettledOccupantOffOrigin(
  state: V070GameState,
  playerId: PlayerId,
  origin: number,
): void {
  const territory = territoryAt(state, origin);
  if (territory?.occupant === playerId) territory.occupant = null;
}

function setSettledOccupant(
  state: V070GameState,
  playerId: PlayerId,
  position: number,
): void {
  const territory = territoryAt(state, position);
  if (!territory) return;
  if (territory.occupant && territory.occupant !== playerId) {
    throw new V070GameActionError('Cannot settle on an occupied Territory without initiating a battle.');
  }
  territory.occupant = playerId;
}

function territoryAt(state: V070GameState, position: number) {
  return state.board.find(territory => territory.position === position);
}

function requirePlayingGame(state: V070GameState): void {
  if (state.stage !== 'playing' || !state.turnState || !state.activePlayer) {
    throw new V070GameActionError('Turn actions require an active v0.7.0 game.');
  }
}

function requirePlayingTurn(state: V070GameState, playerId: PlayerId): void {
  requirePlayingGame(state);
  if (state.activePlayer !== playerId) {
    throw new V070GameActionError(`It is not ${playerId}’s turn.`);
  }
}

function requireTurnState(state: V070GameState) {
  if (!state.turnState) throw new V070GameActionError('There is no active turn.');
  return state.turnState;
}

function requirePhase(state: V070GameState, phase: TurnPhase): void {
  if (requireTurnState(state).phase !== phase) {
    throw new V070GameActionError(`Expected ${phase} phase.`);
  }
}

function requirePosition(player: V070PlayerState): number {
  if (player.position === null) throw new V070GameActionError(`${player.id} has no legal Position.`);
  return player.position;
}

function appendPhaseEvent(state: V070GameState): void {
  const turnState = requireTurnState(state);
  appendV070Event(state, {
    type: 'turn_phase',
    actor: state.activePlayer ?? undefined,
    visibility: 'public',
    payload: { turnNumber: state.turnNumber, phase: turnState.phase },
  });
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
