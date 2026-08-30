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
import {
  cardIdForV070Overlay,
  expireV070TerritoryTurnRestrictions,
  openV070StartTurnOverlayChoice,
  placeV070OverlayFromPendingAction,
  resolveV070OverlayEntryRequirements,
  resolveV070StartTurnOverlayChoice,
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
import { bindV070CardFromPlayerZone } from './bindings';
import { gainV070Conviction } from './inquisition';
import {
  faceUpV070AssetInstanceIds,
  isV070AssetFaceUp,
  restoreV070AssetsAtTurnStart,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';

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
      type: 'resolve_penance_choice';
      playerId: PlayerId;
      choice: 'hand_to_graveyard' | 'conviction';
      handInstanceId?: string;
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
    || action.type === 'resolve_penance_choice'
    || action.type === 'choose_sequestration_keep_asset') {
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
      pending.kind === 'penance_choice'
      && action.type === 'resolve_penance_choice'
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
      'resolve_penance_choice',
      'choose_hand_destination_target',
      'choose_controlled_asset_target',
      'choose_sequestration_keep_asset',
      'choose_fates_toll_cost',
      'choose_battlefield_promotion_target',
      'choose_sabotage_asset_target',
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
    case 'choose_clemency_target':
      chooseClemencyTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'resolve_clemency_choice':
      resolveClemencyChoice(next, action.playerId, action.choice);
      break;
    case 'choose_recovery_action_target':
      chooseRecoveryActionTarget(next, action.playerId, action.targetInstanceId);
      break;
    case 'resolve_penance_choice':
      resolvePenanceChoice(
        next,
        action.playerId,
        action.choice,
        action.handInstanceId,
      );
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
  const turnState = requireTurnState(state);
  try {
    state.turnState = spendV070Action(turnState);
  } catch (error) {
    throw new V070GameActionError(
      error instanceof Error ? error.message : 'That Action cannot be spent now.',
    );
  }

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
  const turnState = requireTurnState(state);
  try {
    state.turnState = spendV070Action(turnState);
  } catch (error) {
    throw new V070GameActionError(
      error instanceof Error ? error.message : 'That Action cannot be spent now.',
    );
  }

  discardV070AssetAsAction(state, playerId, assetInstanceId);
}

export const V070_EXECUTABLE_ACTION_CARD_IDS = [
  'neutral-rallying-cry',
  'neutral-advance-guard',
  'neutral-arcane-knowledge',
  'neutral-capital-punishment',
  'neutral-consolidation',
  'neutral-contraband',
  'neutral-disruption',
  'neutral-forced-march',
  'mystics-fate-s-toll',
  'military-battlefield-promotion',
  'military-give-chase',
  'neutral-insurrection',
  'neutral-landslide',
  'neutral-new-recruits',
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
  'financiers-compound-interest',
  'financiers-monetary-crisis',
  'financiers-tariffs',
  'financiers-war-bonds',
  'inquisition-accusation',
  'inquisition-anathema',
  'inquisition-divine-mercy',
  'inquisition-penance',
  'inquisition-excommunication',
  'inquisition-act-of-faith',
  'inquisition-guilt-by-association',
  'intelligence-assassins',
  'intelligence-extraordinary-rendition',
  'intelligence-regime-change',
  'intelligence-spies',
  'military-high-command',
  'military-invasion',
  'military-reserve-force',
  'mystics-dark-omens',
  'mystics-sacrifice-recovery',
  'mystics-soul-for-soul',
  'mystics-threefold-vision',
] as const;

function playActionCard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
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
  if (card.id === 'intelligence-extraordinary-rendition') {
    if (state.players[otherPlayer(playerId)].zones.hand.length === 0) {
      throw new V070GameActionError(
        'Extraordinary Rendition requires at least one card in the opponent’s Hand.',
      );
    }
    pendingBankReplacementV070AssetInstanceIds(state, playerId, cardInstanceId);
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

  try {
    state.turnState = spendV070Action(turnState);
  } catch (error) {
    throw new V070GameActionError(
      error instanceof Error ? error.message : 'That Action cannot be spent now.',
    );
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
      actionsRemaining: state.turnState.actionsAvailable,
    },
  });

  const censureCount = openV070CensureChoicesForActionPlay(
    state,
    playerId,
    cardInstanceId,
  );
  if (censureCount === 0) continuePendingActionCard(state);
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
    case 'intelligence-assassins': {
      const opponentId = otherPlayer(pending.playerId);
      const revealed = revealV070Hand(
        state,
        pending.playerId,
        opponentId,
        'Assassins',
      );
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
    case 'intelligence-spies':
      revealV070Hand(
        state,
        pending.playerId,
        otherPlayer(pending.playerId),
        'Spies',
      );
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
  purpose: 'Assassins' | 'Spies' | 'Extraordinary Rendition',
): string[] {
  const instanceIds = [...state.players[owner].zones.hand];
  appendV070Event(state, {
    type: 'hand_revealed',
    actor,
    visibility: 'public',
    payload: {
      owner,
      purpose,
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
  cardId: 'military-reserve-force' | 'intelligence-extraordinary-rendition',
): void {
  const replacements = pendingBankReplacementV070AssetInstanceIds(
    state,
    playerId,
    sourceActionInstanceId,
  );
  const purpose = cardId === 'military-reserve-force'
    ? 'Reserve Force'
    : 'Extraordinary Rendition';

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
  cardId: 'military-reserve-force' | 'intelligence-extraordinary-rendition',
  replaceAssetInstanceId?: string,
): void {
  const purpose = cardId === 'military-reserve-force'
    ? 'Reserve Force'
    : 'Extraordinary Rendition';

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

  const opponentId = otherPlayer(playerId);
  const revealed = revealV070Hand(
    state,
    playerId,
    opponentId,
    'Extraordinary Rendition',
  );
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

  if (choice.purpose === 'Reserve Force'
    || choice.purpose === 'Extraordinary Rendition') {
    const expectedCardId = choice.purpose === 'Reserve Force'
      ? 'military-reserve-force'
      : 'intelligence-extraordinary-rendition';
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
    || pending.instanceId !== choice.sourceActionInstanceId
    || pending.cardId !== 'neutral-landslide') {
    throw new V070GameActionError('No Landslide Territory choice is pending for that player.');
  }

  if (!availableLandslidePositions(state).includes(territoryPosition)) {
    throw new V070GameActionError(
      'Landslide must target a Territory that does not already have a Landslide.',
    );
  }

  placeV070OverlayFromPendingAction(
    state,
    playerId,
    pending.instanceId,
    territoryPosition,
    'Landslide Action',
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

function finishPendingActionCard(
  state: V070GameState,
  destination: 'discard' | 'graveyard' | 'overlay' | 'asset' = 'discard',
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
