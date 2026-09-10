import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { drawV070Cards } from './card-draw';

export const V070_SUPPLIES_ID = 'neutral-supplies' as const;
export const V070_SUPPLIES_BATTLE_TEXT =
  'In the Aftermath, +2 Cards, then discard one card.' as const;
export const V070_SUPPLIES_BATTLE_DRAW_COUNT = 2 as const;

export interface V070PendingSuppliesAftermath {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    suppliesBattleSourceInstanceIds?: string[];
    resolvedSuppliesBattleSourceInstanceIds?: string[];
    pendingSuppliesAftermath?: V070PendingSuppliesAftermath | null;
  }
}

function validateV070SuppliesBattleAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_SUPPLIES_ID);
  const effect = card?.effects.find(entry => entry.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_SUPPLIES_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Supplies battle text drifted from released authority.',
    );
  }
}

validateV070SuppliesBattleAuthority();

export function registerV070SuppliesBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_SUPPLIES_ID || source.owner !== owner) {
    throw new V070GameActionError(
      'Supplies battle registration requires its own committed card.',
    );
  }

  runtime.suppliesBattleSourceInstanceIds ??= [];
  runtime.resolvedSuppliesBattleSourceInstanceIds ??= [];
  runtime.pendingSuppliesAftermath ??= null;
  if (!runtime.suppliesBattleSourceInstanceIds.includes(sourceInstanceId)) {
    runtime.suppliesBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

export function pendingV070SuppliesAftermath(
  state: V070GameState,
): V070PendingSuppliesAftermath | null {
  return state.battleRuntime?.pendingSuppliesAftermath ?? null;
}

export function unresolvedV070SuppliesSourcesForPlayer(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedSuppliesBattleSourceInstanceIds ?? [],
  );
  return (runtime.suppliesBattleSourceInstanceIds ?? []).filter(
    sourceInstanceId =>
      state.cardInstances[sourceInstanceId]?.owner === owner
      && !resolved.has(sourceInstanceId),
  );
}

export function openV070SuppliesAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (!battle || source?.cardId !== V070_SUPPLIES_ID) {
    throw new V070GameActionError(
      'Supplies Aftermath requires its registered battle source.',
    );
  }
  const owner = source.owner;
  if (owner !== 'A' && owner !== 'B') {
    throw new V070GameActionError('Supplies source has no valid owner.');
  }
  if (!unresolvedV070SuppliesSourcesForPlayer(state, owner)
    .includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That Supplies battle effect is no longer pending.',
    );
  }
  if (runtime.pendingSuppliesAftermath?.sourceInstanceId === sourceInstanceId) {
    return true;
  }

  const draw = drawV070Cards(
    state,
    owner,
    V070_SUPPLIES_BATTLE_DRAW_COUNT,
    'Supplies battle effect',
  );
  state.players[owner].zones.hand.push(...draw.drawn);

  appendV070Event(state, {
    type: 'cards_drawn',
    actor: owner,
    visibility: 'public',
    payload: {
      count: draw.drawn.length,
      purpose: 'Supplies battle effect',
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  if (draw.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: owner,
      visibility: owner,
      payload: {
        cardInstanceIds: [...draw.drawn],
        purpose: 'Supplies battle effect',
      },
    });
  }

  const candidates = [...state.players[owner].zones.hand];
  if (candidates.length === 0) {
    markResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'supplies_battle_resolved',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        drawnCount: draw.drawn.length,
        discardedInstanceId: null,
        reason: 'no_card_to_discard',
      },
    });
    return false;
  }

  if (candidates.length === 1) {
    discardSuppliesCard(
      state,
      owner,
      sourceInstanceId,
      candidates[0],
      draw.drawn.length,
    );
    markResolved(state, sourceInstanceId);
    return false;
  }

  runtime.pendingSuppliesAftermath = {
    playerId: owner,
    owner,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'supplies_battle_discard_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      candidateCount: candidates.length,
      drawnCount: draw.drawn.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'supplies_battle_discard_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      candidateInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070SuppliesAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): PlayerId {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingSuppliesAftermath;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Supplies Aftermath discard choice is pending for that player.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !state.players[pending.owner].zones.hand.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Supplies must discard one of the eligible physical cards still in your Hand.',
    );
  }

  discardSuppliesCard(
    state,
    pending.owner,
    pending.sourceInstanceId,
    targetInstanceId,
    null,
  );
  const owner = pending.owner;
  runtime.pendingSuppliesAftermath = null;
  markResolved(state, pending.sourceInstanceId);
  return owner;
}

export function removeV070SuppliesBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.suppliesBattleSourceInstanceIds =
    runtime.suppliesBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  runtime.resolvedSuppliesBattleSourceInstanceIds =
    runtime.resolvedSuppliesBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingSuppliesAftermath?.sourceInstanceId === sourceInstanceId) {
    runtime.pendingSuppliesAftermath = null;
  }
}

function discardSuppliesCard(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
  drawnCount: number | null,
): void {
  const zones = state.players[owner].zones;
  const index = zones.hand.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Supplies discard target is no longer in the resolving player’s Hand.',
    );
  }
  zones.hand.splice(index, 1);
  zones.discardPile.push(targetInstanceId);

  appendV070Event(state, {
    type: 'supplies_battle_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      drawnCount,
      discardedInstanceId: targetInstanceId,
      discardedCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
    },
  });
}

function markResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  runtime.resolvedSuppliesBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedSuppliesBattleSourceInstanceIds
    .includes(sourceInstanceId)) {
    runtime.resolvedSuppliesBattleSourceInstanceIds.push(sourceInstanceId);
  }
  if (runtime.pendingSuppliesAftermath?.sourceInstanceId === sourceInstanceId) {
    runtime.pendingSuppliesAftermath = null;
  }
}

function requireRuntime(state: V070GameState) {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Supplies battle effect requires an active battle runtime.',
    );
  }
  return runtime;
}
