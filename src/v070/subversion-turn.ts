import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  clearV070AssetFaceState,
  isV070AssetUsable,
} from './asset-face-state';
import {
  releaseV070BoundCards,
  v070BindingsForHost,
} from './bindings';
import {
  V070_SUBVERSION_ID,
} from './subversion-asset';

export type V070SubversionTurnContinuation =
  | {
      type: 'draw_turn_card';
      playerId: PlayerId;
      useRuinedStorehouse?: boolean;
    }
  | {
      type: 'use_sleeper_network_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | {
      type: 'compound_interest_reveal';
      playerId: PlayerId;
      assetInstanceId: string;
    };

export interface V070PendingSubversionTurnAsset {
  playerId: PlayerId;
  targetOwner: PlayerId;
  targetAssetInstanceId: string;
  effectLabel: string;
  candidateSubversionInstanceIds: string[];
  deferredAction: V070SubversionTurnContinuation;
}

declare module './engine' {
  interface V070GameState {
    /**
     * Serialized turn-time reactive Subversion window. Optional so historical
     * snapshots created before this façade remain readable.
     */
    pendingSubversionTurnAsset?: V070PendingSubversionTurnAsset | null;
  }
}

export interface V070ResolvedSubversionTurnAssetChoice {
  pending: V070PendingSubversionTurnAsset;
  used: boolean;
}

export function pendingV070SubversionTurnAsset(
  state: V070GameState,
): V070PendingSubversionTurnAsset | null {
  return state.pendingSubversionTurnAsset ?? null;
}

export function v070TurnSubversionCandidateInstanceIds(
  state: V070GameState,
  targetOwner: PlayerId,
): string[] {
  const playerId = otherPlayer(targetOwner);
  return state.players[playerId].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_SUBVERSION_ID
    && isV070AssetUsable(state, instanceId)
  );
}

export function openV070SubversionTurnAssetWindow(
  state: V070GameState,
  targetOwner: PlayerId,
  targetAssetInstanceId: string,
  effectLabel: string,
  deferredAction: V070SubversionTurnContinuation,
): boolean {
  if (pendingV070SubversionTurnAsset(state)) return false;
  if (state.battle) {
    throw new V070GameActionError(
      'Turn-time Subversion interruption cannot open during a battle.',
    );
  }

  const target = state.cardInstances[targetAssetInstanceId];
  if (!target
    || target.owner !== targetOwner
    || !state.players[targetOwner].zones.assetBank.includes(
      targetAssetInstanceId,
    )) {
    throw new V070GameActionError(
      'The Asset whose turn-time effect would apply is no longer banked.',
    );
  }
  if (!isV070AssetUsable(state, targetAssetInstanceId)) {
    throw new V070GameActionError(
      'That Asset must be active and usable for its turn-time effect to apply.',
    );
  }

  // Preserve the existing no-recursion adjudication: the reactive Subversion
  // response does not itself open another Subversion response window.
  if (target.cardId === V070_SUBVERSION_ID) return false;

  const playerId = otherPlayer(targetOwner);
  const candidates = v070TurnSubversionCandidateInstanceIds(
    state,
    targetOwner,
  );
  if (candidates.length === 0) return false;

  state.pendingSubversionTurnAsset = {
    playerId,
    targetOwner,
    targetAssetInstanceId,
    effectLabel,
    candidateSubversionInstanceIds: [...candidates],
    deferredAction: structuredClone(deferredAction),
  };

  appendV070Event(state, {
    type: 'subversion_asset_window_opened',
    actor: playerId,
    visibility: 'public',
    payload: {
      scope: 'turn',
      playerId,
      targetOwner,
      targetAssetInstanceId,
      targetCardId: target.cardId,
      effectLabel,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'subversion_asset_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      scope: 'turn',
      targetAssetInstanceId,
      candidateSubversionInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070SubversionTurnAssetChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'pass' | 'use',
  subversionInstanceId?: string,
): V070ResolvedSubversionTurnAssetChoice {
  const pending = pendingV070SubversionTurnAsset(state);
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending turn-time Subversion Asset opportunity.',
    );
  }

  if (choice === 'pass') {
    if (subversionInstanceId) {
      throw new V070GameActionError(
        'Passing Subversion does not choose a Subversion card.',
      );
    }
    state.pendingSubversionTurnAsset = null;
    appendV070Event(state, {
      type: 'subversion_asset_passed',
      actor: playerId,
      visibility: 'public',
      payload: {
        scope: 'turn',
        targetOwner: pending.targetOwner,
        targetAssetInstanceId: pending.targetAssetInstanceId,
        targetCardId:
          state.cardInstances[pending.targetAssetInstanceId]?.cardId,
        effectLabel: pending.effectLabel,
      },
    });
    return { pending, used: false };
  }

  if (!subversionInstanceId
    || !pending.candidateSubversionInstanceIds.includes(
      subversionInstanceId,
    )
    || state.cardInstances[subversionInstanceId]?.cardId
      !== V070_SUBVERSION_ID
    || !state.players[playerId].zones.assetBank.includes(
      subversionInstanceId,
    )
    || !isV070AssetUsable(state, subversionInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible active banked Subversion for this interrupt.',
    );
  }

  state.pendingSubversionTurnAsset = null;

  const subversionBank = state.players[playerId].zones.assetBank;
  subversionBank.splice(subversionBank.indexOf(subversionInstanceId), 1);
  clearV070AssetFaceState(state, subversionInstanceId);
  state.players[playerId].zones.graveyard.push(subversionInstanceId);

  const targetBank = state.players[pending.targetOwner].zones.assetBank;
  const targetIndex = targetBank.indexOf(pending.targetAssetInstanceId);
  const targetRemainedInPlay = targetIndex >= 0;
  if (targetRemainedInPlay) {
    targetBank.splice(targetIndex, 1);
    clearV070AssetFaceState(state, pending.targetAssetInstanceId);
    state.sanctions = state.sanctions.filter(
      sanction => sanction.instanceId !== pending.targetAssetInstanceId,
    );
    state.players[pending.targetOwner].zones.discardPile.push(
      pending.targetAssetInstanceId,
    );

    appendV070Event(state, {
      type: 'asset_discarded',
      actor: pending.targetOwner,
      visibility: 'public',
      payload: {
        instanceId: pending.targetAssetInstanceId,
        cardId: state.cardInstances[pending.targetAssetInstanceId]?.cardId,
        destination: 'discard',
        removed: false,
        reason: 'Subversion negated Asset effect',
      },
    });

    // Subversion puts the target in Discard; this is not the defined Removed
    // procedure. A Sleeper Network therefore does not get its Removed trigger.
    if (v070BindingsForHost(
      state,
      pending.targetAssetInstanceId,
    ).length > 0) {
      releaseV070BoundCards(
        state,
        pending.targetAssetInstanceId,
        'discard',
        'Subversion target Asset left play',
      );
    }
  }

  appendV070Event(state, {
    type: 'subversion_asset_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      scope: 'turn',
      subversionInstanceId,
      targetOwner: pending.targetOwner,
      targetAssetInstanceId: pending.targetAssetInstanceId,
      targetCardId:
        state.cardInstances[pending.targetAssetInstanceId]?.cardId,
      effectLabel: pending.effectLabel,
      targetDiscarded: targetRemainedInPlay,
    },
  });

  return { pending, used: true };
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
