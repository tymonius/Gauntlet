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

export interface V070DeferredBattleAftermathEffectRef {
  owner: PlayerId;
  sourceInstanceId: string;
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
  throw new V070GameActionError(
    'That card is not a supported deferred battle Aftermath effect.',
  );
}

export function v070DeferredBattleAftermathEffectPending(
  state: V070GameState,
): boolean {
  return Boolean(
    pendingV070AccusationAftermath(state)
    || pendingV070ActOfFaithAftermath(state),
  );
}
