import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  V070_ACCUSATION_ID,
  openNextV070AccusationAftermathChoice,
  pendingV070AccusationAftermath,
} from './accusation-battle';
import {
  openV070ActOfFaithAftermathForPlayer,
  pendingV070ActOfFaithAftermath,
  unresolvedV070ActOfFaithSourcesForPlayer,
} from './act-of-faith-battle';

export type V070DeferredAftermathEffectKind =
  | 'accusation'
  | 'act_of_faith';

export interface V070PendingDeferredAftermathOrder {
  playerId: PlayerId;
  candidateKinds: V070DeferredAftermathEffectKind[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredAftermathNextPlayer?: PlayerId | null;
    pendingDeferredAftermathOrder?: V070PendingDeferredAftermathOrder | null;
  }
}

export function pendingV070DeferredAftermathOrder(
  state: V070GameState,
): V070PendingDeferredAftermathOrder | null {
  return state.battleRuntime?.pendingDeferredAftermathOrder ?? null;
}

export function openNextV070DeferredAftermathEffect(
  state: V070GameState,
): boolean {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingDeferredAftermathOrder
    || pendingV070AccusationAftermath(state)
    || pendingV070ActOfFaithAftermath(state)) {
    return true;
  }

  let playerId = runtime.deferredAftermathNextPlayer;
  if (!playerId) {
    playerId = firstPlayerWithDeferredAftermath(state);
  }
  if (!playerId) {
    runtime.deferredAftermathNextPlayer = null;
    return false;
  }

  let candidateKinds = unresolvedKindsForPlayer(state, playerId);
  if (candidateKinds.length === 0) {
    const other = otherPlayer(playerId);
    candidateKinds = unresolvedKindsForPlayer(state, other);
    if (candidateKinds.length === 0) {
      runtime.deferredAftermathNextPlayer = null;
      return false;
    }
    playerId = other;
  }

  runtime.deferredAftermathNextPlayer = playerId;
  if (candidateKinds.length > 1) {
    runtime.pendingDeferredAftermathOrder = {
      playerId,
      candidateKinds,
    };
    appendV070Event(state, {
      type: 'battle_aftermath_effect_order_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        candidateCount: candidateKinds.length,
      },
    });
    appendV070Event(state, {
      type: 'battle_aftermath_effect_order_options',
      actor: playerId,
      visibility: playerId,
      payload: {
        playerId,
        candidateKinds: [...candidateKinds],
      },
    });
    return true;
  }

  return openKindAndContinueIfAutomatic(
    state,
    playerId,
    candidateKinds[0],
  );
}

export function resolveV070DeferredAftermathOrder(
  state: V070GameState,
  playerId: PlayerId,
  effectKind: V070DeferredAftermathEffectKind,
): boolean {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingDeferredAftermathOrder;
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'There is no pending battle Aftermath effect-order choice.',
    );
  }
  if (pending.playerId !== playerId) {
    throw new V070GameActionError(
      'Only the player whose effects share this timing may choose their order.',
    );
  }
  if (!pending.candidateKinds.includes(effectKind)) {
    throw new V070GameActionError(
      'Choose one of the pending battle Aftermath effect kinds.',
    );
  }

  runtime.pendingDeferredAftermathOrder = null;
  appendV070Event(state, {
    type: 'battle_aftermath_effect_order_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      effectKind,
    },
  });
  return openKindAndContinueIfAutomatic(state, playerId, effectKind);
}

export function continueV070DeferredAftermathAfterResolution(
  state: V070GameState,
  resolvedOwner: PlayerId,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  runtime.deferredAftermathNextPlayer = otherPlayer(resolvedOwner);
  return openNextV070DeferredAftermathEffect(state);
}

function openKindAndContinueIfAutomatic(
  state: V070GameState,
  playerId: PlayerId,
  effectKind: V070DeferredAftermathEffectKind,
): boolean {
  const opened = effectKind === 'accusation'
    ? openAccusationForPlayer(state, playerId)
    : openV070ActOfFaithAftermathForPlayer(state, playerId);
  if (opened) return true;

  const runtime = state.battleRuntime;
  if (!runtime) return false;
  runtime.deferredAftermathNextPlayer = otherPlayer(playerId);
  return openNextV070DeferredAftermathEffect(state);
}

function openAccusationForPlayer(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  const sourceInstanceId = unresolvedAccusationSourcesForPlayer(
    state,
    playerId,
  )[0];
  if (!sourceInstanceId) return false;

  const opponent = otherPlayer(playerId);
  if (state.players[opponent].zones.discardPile.length === 0) {
    runtime.resolvedAccusationBattleSourceInstanceIds ??= [];
    if (!runtime.resolvedAccusationBattleSourceInstanceIds.includes(
      sourceInstanceId,
    )) {
      runtime.resolvedAccusationBattleSourceInstanceIds.push(
        sourceInstanceId,
      );
    }
    appendV070Event(state, {
      type: 'accusation_battle_resolved_empty_discard',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACCUSATION_ID,
        opponent,
      },
    });
    return false;
  }

  runtime.accusationAftermathNextPlayer = playerId;
  return openNextV070AccusationAftermathChoice(state);
}

function unresolvedKindsForPlayer(
  state: V070GameState,
  playerId: PlayerId,
): V070DeferredAftermathEffectKind[] {
  const kinds: V070DeferredAftermathEffectKind[] = [];
  if (unresolvedAccusationSourcesForPlayer(state, playerId).length > 0) {
    kinds.push('accusation');
  }
  if (unresolvedV070ActOfFaithSourcesForPlayer(state, playerId).length > 0) {
    kinds.push('act_of_faith');
  }
  return kinds;
}

function unresolvedAccusationSourcesForPlayer(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedAccusationBattleSourceInstanceIds ?? [],
  );
  return (runtime.accusationBattleSourceInstanceIds ?? []).filter(
    instanceId =>
      !resolved.has(instanceId)
      && state.cardInstances[instanceId]?.owner === playerId,
  );
}

function firstPlayerWithDeferredAftermath(
  state: V070GameState,
): PlayerId | null {
  const battle = state.battle;
  if (!battle) return null;
  if (unresolvedKindsForPlayer(state, battle.attacker).length > 0) {
    return battle.attacker;
  }
  if (unresolvedKindsForPlayer(state, battle.defender).length > 0) {
    return battle.defender;
  }
  return null;
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
