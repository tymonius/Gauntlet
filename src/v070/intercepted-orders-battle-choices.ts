import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import {
  type InterceptedOrdersReturn,
  INTERCEPTED_ORDERS_CARD_ID,
  chooseInterceptedOrdersReplacement,
  completeInterceptedOrdersWithoutTarget,
  interceptedOrdersReplacementCandidates,
  interceptedOrdersTacticTargets,
  returnInterceptedOrdersTactic,
  revealInterceptedOrdersOpposingReserve,
} from './intercepted-orders-battle';

/**
 * Forward-compatible interaction state for the next rules release.
 * Deliberately unregistered in the published v0.7.2 reducer.
 */
export type PendingInterceptedOrdersChoice =
  | {
      kind: 'target';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'replacement';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      resolution: InterceptedOrdersReturn;
      candidateInstanceIds: string[];
    };

export type InterceptedOrdersBattleAction =
  | {
      type: 'resolve_intercepted_orders_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_intercepted_orders_replacement';
      playerId: PlayerId;
      cardInstanceId?: string;
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingInterceptedOrdersChoice?: PendingInterceptedOrdersChoice | null;
  }
}

export function pendingInterceptedOrdersChoice(
  state: V070GameState,
): PendingInterceptedOrdersChoice | null {
  return state.battleRuntime?.pendingInterceptedOrdersChoice ?? null;
}

function ensureNoPending(state: V070GameState): void {
  if (pendingInterceptedOrdersChoice(state)) {
    throw new V070GameActionError(
      'Resolve the pending Intercepted Orders choice before continuing.',
    );
  }
}

function openTargetChoice(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  candidates: string[],
): void {
  state.battleRuntime!.pendingInterceptedOrdersChoice = {
    kind: 'target',
    playerId: owner,
    owner,
    sourceInstanceId,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'intercepted_orders_target_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: { sourceInstanceId, sourceCardId: INTERCEPTED_ORDERS_CARD_ID, candidateCount: candidates.length },
  });
  appendV070Event(state, {
    type: 'intercepted_orders_target_choice_options',
    actor: owner,
    visibility: owner,
    payload: { sourceInstanceId, candidateInstanceIds: [...candidates] },
  });
}

function advanceToReplacement(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const resolution = returnInterceptedOrdersTactic(
    state, owner, sourceInstanceId, targetInstanceId,
  );
  const candidates = interceptedOrdersReplacementCandidates(state, resolution.targetOwner);
  if (!candidates.length) {
    chooseInterceptedOrdersReplacement(state, resolution);
    appendV070Event(state, {
      type: 'intercepted_orders_replacement_unavailable',
      actor: resolution.targetOwner,
      visibility: 'public',
      payload: { sourceInstanceId, returnedInstanceId: targetInstanceId },
    });
    return;
  }
  state.battleRuntime!.pendingInterceptedOrdersChoice = {
    kind: 'replacement',
    playerId: resolution.targetOwner,
    owner,
    sourceInstanceId,
    resolution,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'intercepted_orders_replacement_choice_pending',
    actor: resolution.targetOwner,
    visibility: 'public',
    payload: { sourceInstanceId, candidateCount: candidates.length, optional: true },
  });
  appendV070Event(state, {
    type: 'intercepted_orders_replacement_choice_options',
    actor: resolution.targetOwner,
    visibility: resolution.targetOwner,
    payload: { sourceInstanceId, candidateInstanceIds: [...candidates] },
  });
}

/**
 * Call from reveal-stage interference handler at the normal Tactic reveal.
 * The stage has already revealed all committed Tactics and this effect must
 * complete before ordinary effects. No second reveal action is scheduled.
 */
export function beginInterceptedOrdersAtTacticReveal(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  ensureNoPending(state);
  revealInterceptedOrdersOpposingReserve(state, owner, sourceInstanceId);
  const candidates = interceptedOrdersTacticTargets(state, owner);
  if (!candidates.length) {
    completeInterceptedOrdersWithoutTarget(state, owner, sourceInstanceId);
  } else if (candidates.length === 1) {
    advanceToReplacement(state, owner, sourceInstanceId, candidates[0]);
  } else {
    openTargetChoice(state, owner, sourceInstanceId, candidates);
  }
}

/**
 * The caller must enqueue any chosen replacement into the SAME Tactic reveal
 * scheduler before resuming; returning a commitment does not apply its effect.
 */
export function resolveInterceptedOrdersChoice(
  state: V070GameState,
  action: InterceptedOrdersBattleAction,
): V070BattleCardCommitment | null {
  const pending = pendingInterceptedOrdersChoice(state);
  if (!pending) {
    throw new V070GameActionError('No Intercepted Orders battle choice is pending.');
  }
  if (action.playerId !== pending.playerId) {
    throw new V070GameActionError(
      'Only the designated player can resolve this Intercepted Orders choice.',
    );
  }
  if (pending.kind === 'target') {
    if (action.type !== 'resolve_intercepted_orders_target') {
      throw new V070GameActionError('Select an opposing Tactic before choosing a replacement.');
    }
    if (!pending.candidateInstanceIds.includes(action.targetInstanceId)
      || !interceptedOrdersTacticTargets(state, pending.owner).includes(action.targetInstanceId)) {
      throw new V070GameActionError('That opposing Tactic is no longer an eligible target.');
    }
    state.battleRuntime!.pendingInterceptedOrdersChoice = null;
    advanceToReplacement(state, pending.owner, pending.sourceInstanceId, action.targetInstanceId);
    return null;
  }
  if (action.type !== 'resolve_intercepted_orders_replacement') {
    throw new V070GameActionError('The opponent must choose or decline a replacement Tactic.');
  }
  const chosen = action.cardInstanceId;
  if (chosen && (!pending.candidateInstanceIds.includes(chosen)
    || !interceptedOrdersReplacementCandidates(state, pending.playerId).includes(chosen))) {
    throw new V070GameActionError('The replacement is no longer eligible.');
  }
  const replacement = chooseInterceptedOrdersReplacement(
    state, pending.resolution, chosen,
  );
  state.battleRuntime!.pendingInterceptedOrdersChoice = null;
  return replacement;
}
