import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  advanceV070TurnPhase,
  spendV070Action,
  type PlayerId,
} from './rules';
import {
  reduceV070TurnAction as reduceV070TurnActionCore,
  type V070TurnAction as V070CoreTurnAction,
} from './turn-engine-core';
import {
  isV070AssetActive,
  isV070AssetUsable,
} from './asset-face-state';
import {
  consumeV070FinancialCapacityAction,
  v070FinancialCapacityAvailable,
  v070FinancierFeatureActionSpentThisTurn,
} from './financiers';
import {
  openV070SubversionTurnAssetWindow,
  pendingV070SubversionTurnAsset,
  resolveV070SubversionTurnAssetChoice,
  v070TurnSubversionCandidateInstanceIds,
} from './subversion-turn';

export * from './turn-engine-core';

export type V070TurnAction =
  | V070CoreTurnAction
  | {
      type: 'resolve_subversion_asset';
      playerId: PlayerId;
      choice: 'pass' | 'use';
      subversionInstanceId?: string;
    };

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  const pendingSubversion = pendingV070SubversionTurnAsset(state);
  if (pendingSubversion && action.type !== 'resolve_subversion_asset') {
    throw new V070GameActionError(
      'Resolve or decline the pending Subversion Asset opportunity before continuing the turn.',
    );
  }

  if (action.type === 'resolve_subversion_asset') {
    const next = structuredClone(state) as V070GameState;
    const resolved = resolveV070SubversionTurnAssetChoice(
      next,
      action.playerId,
      action.choice,
      action.subversionInstanceId,
    );

    if (resolved.pending.deferredAction.type === 'draw_turn_card') {
      if (resolved.used) {
        return reduceV070TurnActionCore(
          next,
          resolved.pending.deferredAction,
        );
      }
      return resolveV070TariffsDrawSkip(
        next,
        resolved.pending.targetOwner,
        resolved.pending.targetAssetInstanceId,
      );
    }

    if (resolved.used) {
      // The Action used to activate Sleeper Network was already spent before
      // Subversion answered. Negating the Asset effect does not refund it.
      return next;
    }

    return resumePrepaidV070TurnAction(
      next,
      resolved.pending.deferredAction,
    );
  }

  const coreAction = action as V070CoreTurnAction;

  if (coreAction.type === 'draw_turn_card') {
    if (activeMarginLoanInstanceIds(
      state,
      coreAction.playerId,
    ).length > 0) {
      return reduceV070TurnActionCore(state, coreAction);
    }

    const tariffsInstanceId = activeTariffsInstanceId(
      state,
      coreAction.playerId,
    );
    if (tariffsInstanceId) {
      // Run the existing reducer only as a legality probe. The returned state
      // is discarded; Tariffs resolves before the normal draw itself.
      reduceV070TurnActionCore(state, coreAction);

      const next = structuredClone(state) as V070GameState;
      if (openV070SubversionTurnAssetWindow(
        next,
        coreAction.playerId,
        tariffsInstanceId,
        'Tariffs',
        coreAction,
      )) {
        return next;
      }

      return resolveV070TariffsDrawSkip(
        next,
        coreAction.playerId,
        tariffsInstanceId,
      );
    }
  }

  if (coreAction.type === 'use_sleeper_network_asset') {
    const candidateSubversions = v070TurnSubversionCandidateInstanceIds(
      state,
      coreAction.playerId,
    );
    if (candidateSubversions.length === 0) {
      return reduceV070TurnActionCore(state, coreAction);
    }

    // The core run proves the requested activation is otherwise legal without
    // mutating the caller's state. This keeps every existing pending-choice,
    // phase, Asset, and special-Action validation authoritative in one place.
    reduceV070TurnActionCore(state, coreAction);

    const next = structuredClone(state) as V070GameState;
    spendInterruptedV070AssetAction(next, coreAction.playerId);
    if (openV070SubversionTurnAssetWindow(
      next,
      coreAction.playerId,
      coreAction.assetInstanceId,
      'Sleeper Network activation',
      coreAction,
    )) {
      return next;
    }

    // The candidate set can only disappear if the state changed unexpectedly
    // between validation and opening. Fall back to the unchanged core path.
    return reduceV070TurnActionCore(state, coreAction);
  }

  return reduceV070TurnActionCore(state, coreAction);
}

function activeMarginLoanInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'financiers-margin-loan'
    && isV070AssetActive(state, instanceId)
  );
}

function activeTariffsInstanceId(
  state: V070GameState,
  playerId: PlayerId,
): string | null {
  return state.players[playerId].zones.assetBank.find(instanceId =>
    state.cardInstances[instanceId]?.cardId === 'financiers-tariffs'
    && isV070AssetUsable(state, instanceId)
  ) ?? null;
}

function resolveV070TariffsDrawSkip(
  state: V070GameState,
  playerId: PlayerId,
  tariffsInstanceId: string,
): V070GameState {
  if (state.stage !== 'playing'
    || state.activePlayer !== playerId
    || state.battle
    || !state.turnState
    || state.turnState.phase !== 'draw') {
    throw new V070GameActionError(
      'Tariffs can skip only the active player’s normal Draw step.',
    );
  }
  if (!state.players[playerId].zones.assetBank.includes(tariffsInstanceId)
    || state.cardInstances[tariffsInstanceId]?.cardId !== 'financiers-tariffs'
    || !isV070AssetUsable(state, tariffsInstanceId)) {
    throw new V070GameActionError(
      'Tariffs must still be an active usable banked Asset when its Draw effect resolves.',
    );
  }

  appendV070Event(state, {
    type: 'tariffs_normal_draw_skipped',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: tariffsInstanceId,
      cardId: 'financiers-tariffs',
    },
  });

  state.turnState = advanceV070TurnPhase(state.turnState);
  appendV070Event(state, {
    type: 'turn_phase',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      phase: state.turnState.phase,
    },
  });
  return state;
}

function spendInterruptedV070AssetAction(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const turnState = state.turnState;
  if (!turnState) {
    throw new V070GameActionError('There is no active turn.');
  }
  const phase = turnState.phase;
  if (phase !== 'opening' && phase !== 'denouement') {
    throw new V070GameActionError(
      'Sleeper Network may be activated as an Action only during Opening or Denouement.',
    );
  }
  if (turnState.commandTentCardActionFirst
    && turnState.actionsTaken[phase] === 0) {
    throw new V070GameActionError(
      'Command Tent requires the first Action taken in each Action phase to play a card for its Action effect.',
    );
  }

  try {
    state.turnState = spendV070Action(turnState);
    return;
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'That Action cannot be spent now.';

    if (message !== 'No Actions remain this turn.'
      || !v070FinancialCapacityAvailable(state, playerId)) {
      throw new V070GameActionError(message);
    }
    if (!v070FinancierFeatureActionSpentThisTurn(state, playerId)) {
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
  }
}

function resumePrepaidV070TurnAction(
  state: V070GameState,
  action: Extract<
    V070CoreTurnAction,
    { type: 'use_sleeper_network_asset' }
  >,
): V070GameState {
  const turnState = state.turnState;
  if (!turnState
    || (turnState.phase !== 'opening' && turnState.phase !== 'denouement')) {
    throw new V070GameActionError(
      'The prepaid Sleeper Network Action can resume only in its Action phase.',
    );
  }
  const phase = turnState.phase;
  if (turnState.actionsTaken[phase] <= 0) {
    throw new V070GameActionError(
      'The prepaid Sleeper Network Action is missing its spent Action.',
    );
  }

  const replay = structuredClone(state) as V070GameState;
  replay.turnState = {
    ...turnState,
    actionsAvailable: turnState.actionsAvailable + 1,
    actionsTaken: {
      ...turnState.actionsTaken,
      [phase]: turnState.actionsTaken[phase] - 1,
    },
  };

  // Core spends the temporarily refunded Action exactly once, reproducing the
  // already-paid turn state while allowing the original Asset effect to run.
  return reduceV070TurnActionCore(replay, action);
}
