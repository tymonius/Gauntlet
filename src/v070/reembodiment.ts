import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  isV070AssetUsable,
  v070AssetUseProhibitedDuringBattle,
} from './asset-face-state';
import { assertV070GraveyardExitAllowed } from './territories';

export const V070_REEMBODIMENT_ID = 'mystics-sacrifice-recovery' as const;
export const V070_REEMBODIMENT_ASSET_TEXT =
  'The first time each turn you put an Arcane card from your Hand in your Graveyard as a cost or part of an effect you control, after that effect resolves, you may return one other lower-value card from your Graveyard to your Hand.' as const;

export interface V070ReembodimentContinuation {
  type: 'apply_reembodiment_recovery';
  playerId: PlayerId;
  assetInstanceId: string;
  triggeringArcaneInstanceId: string;
  simultaneousArcaneInstanceIds: string[];
  triggerValue: number;
  sourceLabel: string;
  duringBattle: boolean;
}

export interface V070PendingReembodimentRecovery
  extends Omit<V070ReembodimentContinuation, 'type'> {
  candidateInstanceIds: string[];
}

declare module './engine' {
  interface V070GameState {
    /** First qualifying Hand-to-Graveyard occurrence, independent of Asset usability. */
    reembodimentFirstQualifyingTurn?: Partial<Record<PlayerId, number>>;
    /** Optional recovery window after the qualifying controlled effect fully resolves. */
    pendingReembodimentRecovery?: V070PendingReembodimentRecovery | null;
  }
}

export function pendingV070ReembodimentRecovery(
  state: V070GameState,
): V070PendingReembodimentRecovery | null {
  return state.pendingReembodimentRecovery ?? null;
}

export function v070ReembodimentRecoveryCandidateInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  triggerValue: number,
  triggeringArcaneInstanceId: string,
): string[] {
  return state.players[playerId].zones.graveyard.filter(instanceId => {
    if (instanceId === triggeringArcaneInstanceId) return false;
    const instance = state.cardInstances[instanceId];
    const card = instance
      ? v070CanonicalContent.cardsById.get(instance.cardId)
      : undefined;
    return Boolean(card && card.cost < triggerValue);
  });
}

export function recordV070ReembodimentQualifyingTransition(
  state: V070GameState,
  playerId: PlayerId,
  movedHandInstanceIds: readonly string[],
  sourceLabel: string,
  duringBattle: boolean,
): V070ReembodimentContinuation | null {
  const qualifying = movedHandInstanceIds
    .filter(instanceId => {
      const instance = state.cardInstances[instanceId];
      const card = instance
        ? v070CanonicalContent.cardsById.get(instance.cardId)
        : undefined;
      return instance?.owner === playerId
        && card?.trait === 'Arcane'
        && state.players[playerId].zones.graveyard.includes(instanceId);
    })
    .map(instanceId => ({
      instanceId,
      value: v070CanonicalContent.cardsById.get(
        state.cardInstances[instanceId]!.cardId,
      )!.cost,
    }));

  if (qualifying.length === 0) return null;

  const tracker = state.reembodimentFirstQualifyingTurn ??= {};
  if (tracker[playerId] === state.turnNumber) return null;
  tracker[playerId] = state.turnNumber;

  // A single effect can move several Arcane cards simultaneously (for example
  // Necromancy or Manifest Destiny). That is one first qualifying occurrence.
  // Resolve the simultaneous controlled triggers in the controller's best legal
  // order by using the highest-value qualifying Arcane as the threshold source.
  const trigger = qualifying.reduce((best, candidate) =>
    candidate.value > best.value ? candidate : best
  );

  appendV070Event(state, {
    type: 'reembodiment_qualified',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      sourceLabel,
      duringBattle,
      simultaneousArcaneCount: qualifying.length,
      triggerValue: trigger.value,
    },
  });
  appendV070Event(state, {
    type: 'reembodiment_qualified_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      triggeringArcaneInstanceId: trigger.instanceId,
      simultaneousArcaneInstanceIds: qualifying.map(item => item.instanceId),
    },
  });

  const assetInstanceId = state.players[playerId].zones.assetBank.find(
    instanceId =>
      state.cardInstances[instanceId]?.cardId === V070_REEMBODIMENT_ID
      && isV070AssetUsable(state, instanceId),
  );
  if (!assetInstanceId) return null;
  if (duringBattle && v070AssetUseProhibitedDuringBattle(state, playerId)) {
    appendV070Event(state, {
      type: 'reembodiment_unavailable',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceLabel,
        reason: 'asset_use_prohibited',
      },
    });
    return null;
  }

  const continuation: V070ReembodimentContinuation = {
    type: 'apply_reembodiment_recovery',
    playerId,
    assetInstanceId,
    triggeringArcaneInstanceId: trigger.instanceId,
    simultaneousArcaneInstanceIds: qualifying.map(item => item.instanceId),
    triggerValue: trigger.value,
    sourceLabel,
    duringBattle,
  };

  // Subversion answers an opposing Asset effect that would apply. If there is
  // no legal lower-value card after the controlled effect resolves,
  // Reembodiment has no applicable recovery effect and opens no reaction.
  if (v070ReembodimentRecoveryCandidateInstanceIds(
    state,
    playerId,
    trigger.value,
    trigger.instanceId,
  ).length === 0) {
    appendV070Event(state, {
      type: 'reembodiment_unavailable',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceLabel,
        reason: 'no_lower_value_graveyard_card',
        triggerValue: trigger.value,
      },
    });
    return null;
  }

  return continuation;
}

export function openV070ReembodimentRecovery(
  state: V070GameState,
  continuation: V070ReembodimentContinuation,
): boolean {
  if (pendingV070ReembodimentRecovery(state)) {
    throw new V070GameActionError(
      'Resolve the pending Reembodiment recovery before opening another one.',
    );
  }
  if (!state.players[continuation.playerId].zones.assetBank.includes(
    continuation.assetInstanceId,
  ) || !isV070AssetUsable(state, continuation.assetInstanceId)) {
    return false;
  }
  if (continuation.duringBattle
    && v070AssetUseProhibitedDuringBattle(state, continuation.playerId)) {
    return false;
  }

  const candidates = v070ReembodimentRecoveryCandidateInstanceIds(
    state,
    continuation.playerId,
    continuation.triggerValue,
    continuation.triggeringArcaneInstanceId,
  );

  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'reembodiment_unavailable',
      actor: continuation.playerId,
      visibility: 'public',
      payload: {
        sourceLabel: continuation.sourceLabel,
        reason: 'no_lower_value_graveyard_card',
        triggerValue: continuation.triggerValue,
      },
    });
    return false;
  }

  state.pendingReembodimentRecovery = {
    playerId: continuation.playerId,
    assetInstanceId: continuation.assetInstanceId,
    triggeringArcaneInstanceId: continuation.triggeringArcaneInstanceId,
    simultaneousArcaneInstanceIds: [
      ...continuation.simultaneousArcaneInstanceIds,
    ],
    triggerValue: continuation.triggerValue,
    sourceLabel: continuation.sourceLabel,
    duringBattle: continuation.duringBattle,
    candidateInstanceIds: [...candidates],
  };

  appendV070Event(state, {
    type: 'reembodiment_recovery_pending',
    actor: continuation.playerId,
    visibility: 'public',
    payload: {
      playerId: continuation.playerId,
      assetInstanceId: continuation.assetInstanceId,
      sourceLabel: continuation.sourceLabel,
      triggerValue: continuation.triggerValue,
      candidateCount: candidates.length,
      duringBattle: continuation.duringBattle,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'reembodiment_recovery_options',
    actor: continuation.playerId,
    visibility: continuation.playerId,
    payload: {
      candidateInstanceIds: [...candidates],
      triggeringArcaneInstanceId: continuation.triggeringArcaneInstanceId,
      simultaneousArcaneInstanceIds: [
        ...continuation.simultaneousArcaneInstanceIds,
      ],
    },
  });
  return true;
}

export function resolveV070ReembodimentRecovery(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId?: string,
): void {
  const pending = pendingV070ReembodimentRecovery(state);
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Reembodiment recovery.',
    );
  }

  if (!targetInstanceId) {
    state.pendingReembodimentRecovery = null;
    appendV070Event(state, {
      type: 'reembodiment_recovery_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        assetInstanceId: pending.assetInstanceId,
        sourceLabel: pending.sourceLabel,
      },
    });
    return;
  }

  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !state.players[playerId].zones.graveyard.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Reembodiment must return one eligible lower-value Graveyard card.',
    );
  }

  assertV070GraveyardExitAllowed(state, 'Reembodiment');
  const graveyard = state.players[playerId].zones.graveyard;
  graveyard.splice(graveyard.indexOf(targetInstanceId), 1);
  state.players[playerId].zones.hand.push(targetInstanceId);
  state.pendingReembodimentRecovery = null;

  appendV070Event(state, {
    type: 'reembodiment_recovered',
    actor: playerId,
    visibility: 'public',
    payload: {
      assetInstanceId: pending.assetInstanceId,
      sourceLabel: pending.sourceLabel,
      triggerValue: pending.triggerValue,
    },
  });
  appendV070Event(state, {
    type: 'reembodiment_recovered_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId,
      triggeringArcaneInstanceId: pending.triggeringArcaneInstanceId,
    },
  });
}

export function viewV070ReembodimentRecoveryForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): ({
  playerId: PlayerId;
  assetInstanceId: string;
  sourceLabel: string;
  triggerValue: number;
  candidateCount: number;
  duringBattle: boolean;
  candidateInstanceIds?: string[];
} | null) {
  const pending = pendingV070ReembodimentRecovery(state);
  if (!pending) return null;
  return {
    playerId: pending.playerId,
    assetInstanceId: pending.assetInstanceId,
    sourceLabel: pending.sourceLabel,
    triggerValue: pending.triggerValue,
    candidateCount: pending.candidateInstanceIds.length,
    duringBattle: pending.duringBattle,
    ...(viewer === pending.playerId
      ? { candidateInstanceIds: [...pending.candidateInstanceIds] }
      : {}),
  };
}

function validateReembodimentContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_REEMBODIMENT_ID);
  const action = card?.effects.find(effect => effect.label === 'Action')?.text;
  const asset = card?.effects.find(effect => effect.label === 'Asset')?.text;
  if (action !== 'Bank this card. You may have only one banked copy.') {
    throw new Error(
      `v0.7.0 Reembodiment Action authority drifted: ${JSON.stringify(action)}.`,
    );
  }
  if (asset !== V070_REEMBODIMENT_ASSET_TEXT) {
    throw new Error(
      `v0.7.0 Reembodiment Asset authority drifted: expected ${JSON.stringify(V070_REEMBODIMENT_ASSET_TEXT)}, got ${JSON.stringify(asset)}.`,
    );
  }
}

validateReembodimentContract();
