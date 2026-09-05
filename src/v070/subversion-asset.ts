import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type {
  V070SubversionAssetBattleContinuation,
  V070SubversionAssetBattleRuntime,
} from './battle-types';
import {
  clearV070AssetFaceState,
  isV070AssetUsable,
  v070AssetUseProhibitedDuringBattle,
} from './asset-face-state';
import {
  recordV070IntelligenceBattleAssetUseForMission,
} from './intelligence';

export const V070_SUBVERSION_ID = 'intelligence-subversion' as const;
export const V070_SUBVERSION_ASSET_TEXT =
  "When an opposing Asset's effect would apply, you may put this card in your Graveyard to negate that effect and put the opposing Asset in its owner's Discard Pile if it remains in play." as const;

export interface V070ResolvedSubversionAssetBattleChoice {
  pending: V070SubversionAssetBattleRuntime;
  used: boolean;
}

export function assertV070BattleAssetEffectUsable(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): void {
  if (v070AssetUseProhibitedDuringBattle(state, playerId)) {
    throw new V070GameActionError(
      'Subversion prevents that player from using Assets during this battle.',
    );
  }
  if (!isV070AssetUsable(state, assetInstanceId)) {
    throw new V070GameActionError(
      'That Asset must be active and usable for its battle effect to apply.',
    );
  }
}

export function openV070SubversionAssetBattleWindow(
  state: V070GameState,
  targetOwner: PlayerId,
  targetAssetInstanceId: string,
  effectLabel: string,
  deferredAction: V070SubversionAssetBattleContinuation,
): boolean {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Subversion Asset interruption requires an active battle.',
    );
  }
  if (runtime.pendingSubversionAssetBattle) {
    return false;
  }

  const target = state.cardInstances[targetAssetInstanceId];
  if (!target
    || target.owner !== targetOwner
    || !state.players[targetOwner].zones.assetBank.includes(targetAssetInstanceId)) {
    throw new V070GameActionError(
      'The Asset whose effect would apply is no longer banked.',
    );
  }
  assertV070BattleAssetEffectUsable(
    state,
    targetOwner,
    targetAssetInstanceId,
  );

  // Preserve the historical no-recursion adjudication for the same released
  // wording: Subversion does not open a second Subversion window against the
  // opposing Subversion response itself.
  if (target.cardId === V070_SUBVERSION_ID) return false;

  const playerId = otherPlayer(targetOwner);
  const candidates = state.players[playerId].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_SUBVERSION_ID
    && isV070AssetUsable(state, instanceId)
  );
  if (candidates.length === 0) return false;

  runtime.pendingSubversionAssetBattle = {
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
      targetAssetInstanceId,
      candidateSubversionInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070SubversionAssetBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'pass' | 'use',
  subversionInstanceId?: string,
): V070ResolvedSubversionAssetBattleChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingSubversionAssetBattle ?? null;
  if (!runtime || !pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Subversion Asset opportunity.',
    );
  }

  if (choice === 'pass') {
    if (subversionInstanceId) {
      throw new V070GameActionError(
        'Passing Subversion does not choose a Subversion card.',
      );
    }
    runtime.pendingSubversionAssetBattle = null;
    appendV070Event(state, {
      type: 'subversion_asset_passed',
      actor: playerId,
      visibility: 'public',
      payload: {
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
    || !pending.candidateSubversionInstanceIds.includes(subversionInstanceId)
    || state.cardInstances[subversionInstanceId]?.cardId !== V070_SUBVERSION_ID
    || !state.players[playerId].zones.assetBank.includes(subversionInstanceId)
    || !isV070AssetUsable(state, subversionInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible active banked Subversion for this interrupt.',
    );
  }

  runtime.pendingSubversionAssetBattle = null;

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
    state.players[pending.targetOwner].zones.discardPile.push(
      pending.targetAssetInstanceId,
    );
  }

  // A negated Asset was still used for the released Subversion Mission; the
  // reactive Subversion itself is also an Asset used in this battle.
  recordV070IntelligenceBattleAssetUseForMission(
    state,
    pending.targetOwner,
  );
  recordV070IntelligenceBattleAssetUseForMission(
    state,
    playerId,
  );

  appendV070Event(state, {
    type: 'subversion_asset_used',
    actor: playerId,
    visibility: 'public',
    payload: {
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
