import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  openV070AccusationAftermathForSource,
  pendingV070AccusationAftermath,
  unresolvedV070AccusationSourcesForPlayer,
} from './accusation-battle';
import {
  openV070ActOfFaithAftermathForSource,
  pendingV070ActOfFaithAftermath,
  unresolvedV070ActOfFaithSourcesForPlayer,
} from './act-of-faith-battle';
import {
  openV070BurningAtTheStakeAftermathForSource,
  pendingV070BurningAtTheStakeAftermath,
  unresolvedV070BurningAtTheStakeSourcesForPlayer,
} from './burning-at-the-stake-battle';

export interface V070DeferredBattleAftermathEffectRef {
  owner: PlayerId;
  sourceInstanceId: string;
}

/**
 * The core shared-timing scheduler calls its normal Overlay-placement seam for
 * the inert carrier record. This typed pause exits before any Overlay behavior
 * or placement occurs and returns the already-cloned scheduler state to the
 * public battle reducer.
 */
export class V070DeferredBattleAftermathPause extends Error {
  readonly state: V070GameState;
  readonly sourceInstanceId: string;
  readonly owner: PlayerId;
  readonly choicePending: boolean;

  constructor(
    state: V070GameState,
    sourceInstanceId: string,
    owner: PlayerId,
    choicePending: boolean,
  ) {
    super('Deferred battle Aftermath effect interrupted core resolution.');
    this.name = 'V070DeferredBattleAftermathPause';
    this.state = state;
    this.sourceInstanceId = sourceInstanceId;
    this.owner = owner;
    this.choicePending = choicePending;
  }
}

export function v070DeferredBattleAftermathEffectRefs(
  state: V070GameState,
): V070DeferredBattleAftermathEffectRef[] {
  const battle = state.battle;
  if (!battle) return [];
  const refs: V070DeferredBattleAftermathEffectRef[] = [];
  for (const owner of [battle.attacker, battle.defender]) {
    for (const sourceInstanceId of
      unresolvedV070AccusationSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
    for (const sourceInstanceId of
      unresolvedV070ActOfFaithSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
    for (const sourceInstanceId of
      unresolvedV070BurningAtTheStakeSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
  }
  return refs;
}

export function openV070DeferredBattleAftermathEffect(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const cardId = state.cardInstances[sourceInstanceId]?.cardId;
  if (cardId === 'inquisition-accusation') {
    return openV070AccusationAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  if (cardId === 'inquisition-act-of-faith') {
    return openV070ActOfFaithAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  if (cardId === 'inquisition-burning-at-the-stake') {
    return openV070BurningAtTheStakeAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  throw new V070GameActionError(
    'That card is not a supported deferred battle Aftermath effect.',
  );
}

export function pauseV070DeferredBattleAftermathCarrier(
  state: V070GameState,
  sourceInstanceId: string,
): never {
  const owner = state.cardInstances[sourceInstanceId]?.owner;
  if (owner !== 'A' && owner !== 'B') {
    throw new V070GameActionError(
      'Deferred battle Aftermath source has no valid owner.',
    );
  }
  const choicePending = openV070DeferredBattleAftermathEffect(
    state,
    sourceInstanceId,
  );
  throw new V070DeferredBattleAftermathPause(
    state,
    sourceInstanceId,
    owner,
    choicePending,
  );
}

export function v070DeferredBattleAftermathEffectPending(
  state: V070GameState,
): boolean {
  return Boolean(
    pendingV070AccusationAftermath(state)
    || pendingV070ActOfFaithAftermath(state)
    || pendingV070BurningAtTheStakeAftermath(state),
  );
}