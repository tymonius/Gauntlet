import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './battle-aftermath-pre-capital-gains';
import {
  openV070CapitalGainsAftermathForSource,
  pendingV070CapitalGainsAftermath,
  unresolvedV070CapitalGainsSourcesForPlayer,
} from './capital-gains-battle';
import {
  openV070ExcommunicationAftermathForSource,
  pendingV070ExcommunicationAftermath,
  unresolvedV070ExcommunicationSourcesForPlayer,
} from './excommunication-battle';
import {
  openV070SuppliesAftermathForSource,
  pendingV070SuppliesAftermath,
  unresolvedV070SuppliesSourcesForPlayer,
} from './supplies-battle';
import {
  openV070GuiltByAssociationAftermathForSource,
  pendingV070GuiltByAssociationAftermath,
  unresolvedV070GuiltByAssociationSourcesForPlayer,
} from './guilt-by-association-battle';

export * from './battle-aftermath-pre-capital-gains';

export interface V070DeferredBattleAftermathEffectRef {
  owner: PlayerId;
  sourceInstanceId: string;
}

export function v070DeferredBattleAftermathEffectRefs(
  state: V070GameState,
): V070DeferredBattleAftermathEffectRef[] {
  const refs = previous.v070DeferredBattleAftermathEffectRefs(state);
  const battle = state.battle;
  if (!battle) return refs;
  for (const owner of [battle.attacker, battle.defender]) {
    for (const sourceInstanceId of
      unresolvedV070CapitalGainsSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
    for (const sourceInstanceId of
      unresolvedV070ExcommunicationSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
    for (const sourceInstanceId of
      unresolvedV070SuppliesSourcesForPlayer(state, owner)) {
      refs.push({ owner, sourceInstanceId });
    }
    for (const sourceInstanceId of
      unresolvedV070GuiltByAssociationSourcesForPlayer(state, owner)) {
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
  if (cardId === 'financiers-capital-gains') {
    return openV070CapitalGainsAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  if (cardId === 'inquisition-excommunication') {
    return openV070ExcommunicationAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  if (cardId === 'neutral-supplies') {
    return openV070SuppliesAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  if (cardId === 'inquisition-guilt-by-association') {
    return openV070GuiltByAssociationAftermathForSource(
      state,
      sourceInstanceId,
    );
  }
  return previous.openV070DeferredBattleAftermathEffect(
    state,
    sourceInstanceId,
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
  throw new previous.V070DeferredBattleAftermathPause(
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
    previous.v070DeferredBattleAftermathEffectPending(state)
    || pendingV070CapitalGainsAftermath(state)
    || pendingV070ExcommunicationAftermath(state)
    || pendingV070SuppliesAftermath(state)
    || pendingV070GuiltByAssociationAftermath(state),
  );
}
