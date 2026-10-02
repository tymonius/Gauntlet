import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { applyV070NormalAftermathConviction } from './inquisition';

export const V070_GUILT_BY_ASSOCIATION_ID =
  'inquisition-guilt-by-association' as const;
export const V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT =
  "In the Aftermath, choose one opposing Gambit, Tactic, or other card the opponent controlled in this battle. Put every card in the opponent's Discard Pile with that title in their Graveyard." as const;

export interface V070PendingGuiltByAssociationAftermath {
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateCardIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    guiltByAssociationBattleSources?: Array<{
      owner: PlayerId;
      sourceInstanceId: string;
      opponent: PlayerId;
      candidateCardIds: string[];
    }>;
    resolvedGuiltByAssociationBattleSourceInstanceIds?: string[];
    pendingGuiltByAssociationAftermath?:
      V070PendingGuiltByAssociationAftermath | null;
  }
}

function validateGuiltByAssociationAuthority(): void {
  const frozen = v070CanonicalContent.cardsById.get(
    V070_GUILT_BY_ASSOCIATION_ID,
  );
  const current = currentCanonicalContent.cardsById.get(
    V070_GUILT_BY_ASSOCIATION_ID,
  );
  for (const card of [frozen, current]) {
    const effect = card?.effects.find(
      entry => entry.label === 'Gambit/Tactic',
    );
    if (effect?.text !== V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT) {
      throw new Error(
        'Guilt by Association battle text drifted from frozen/current authority.',
      );
    }
  }
}

validateGuiltByAssociationAuthority();

export function registerV070GuiltByAssociationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_GUILT_BY_ASSOCIATION_ID
    || source.owner !== owner) {
    throw new V070GameActionError(
      'Guilt by Association battle registration requires its own committed card.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidateCardIds = usedPhysicalBattleCardIds(
    state,
    opponent,
  );

  runtime.guiltByAssociationBattleSources ??= [];
  runtime.resolvedGuiltByAssociationBattleSourceInstanceIds ??= [];
  runtime.pendingGuiltByAssociationAftermath ??= null;

  if (!runtime.guiltByAssociationBattleSources.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    runtime.guiltByAssociationBattleSources.push({
      owner,
      sourceInstanceId,
      opponent,
      candidateCardIds,
    });
  }
}

export function pendingV070GuiltByAssociationAftermath(
  state: V070GameState,
): V070PendingGuiltByAssociationAftermath | null {
  return state.battleRuntime?.pendingGuiltByAssociationAftermath ?? null;
}

export function unresolvedV070GuiltByAssociationSourcesForPlayer(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedGuiltByAssociationBattleSourceInstanceIds ?? [],
  );
  return (runtime.guiltByAssociationBattleSources ?? [])
    .filter(effect =>
      effect.owner === owner
      && !resolved.has(effect.sourceInstanceId)
    )
    .map(effect => effect.sourceInstanceId);
}

export function openV070GuiltByAssociationAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (!state.battle || source?.cardId !== V070_GUILT_BY_ASSOCIATION_ID) {
    throw new V070GameActionError(
      'Guilt by Association Aftermath requires its registered battle source.',
    );
  }

  const effect = (runtime.guiltByAssociationBattleSources ?? []).find(
    candidate => candidate.sourceInstanceId === sourceInstanceId,
  );
  if (!effect) {
    throw new V070GameActionError(
      'That Guilt by Association battle effect was not registered.',
    );
  }
  if (!unresolvedV070GuiltByAssociationSourcesForPlayer(
    state,
    effect.owner,
  ).includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That Guilt by Association battle effect is no longer pending.',
    );
  }

  if (effect.candidateCardIds.length === 0) {
    markResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'guilt_by_association_battle_no_eligible_title',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        opponent: effect.opponent,
      },
    });
    return false;
  }

  if (effect.candidateCardIds.length === 1) {
    resolveTitle(
      state,
      effect.owner,
      effect.opponent,
      sourceInstanceId,
      effect.candidateCardIds[0],
    );
    markResolved(state, sourceInstanceId);
    return false;
  }

  runtime.pendingGuiltByAssociationAftermath = {
    playerId: effect.owner,
    owner: effect.owner,
    opponent: effect.opponent,
    sourceInstanceId,
    candidateCardIds: [...effect.candidateCardIds],
  };
  appendV070Event(state, {
    type: 'guilt_by_association_battle_choice_pending',
    actor: effect.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      opponent: effect.opponent,
      candidateCount: effect.candidateCardIds.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'guilt_by_association_battle_choice_options',
    actor: effect.owner,
    visibility: effect.owner,
    payload: {
      sourceInstanceId,
      opponent: effect.opponent,
      candidateCardIds: [...effect.candidateCardIds],
    },
  });
  return true;
}

export function resolveV070GuiltByAssociationAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetCardId: string,
): PlayerId {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingGuiltByAssociationAftermath;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Guilt by Association Aftermath choice is pending for that player.',
    );
  }
  if (!pending.candidateCardIds.includes(targetCardId)) {
    throw new V070GameActionError(
      'Guilt by Association must choose a card title the opponent used in this battle.',
    );
  }

  resolveTitle(
    state,
    pending.owner,
    pending.opponent,
    pending.sourceInstanceId,
    targetCardId,
  );
  const owner = pending.owner;
  runtime.pendingGuiltByAssociationAftermath = null;
  markResolved(state, pending.sourceInstanceId);
  return owner;
}

export function removeV070GuiltByAssociationBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.guiltByAssociationBattleSources =
    runtime.guiltByAssociationBattleSources?.filter(
      effect => effect.sourceInstanceId !== sourceInstanceId,
    );
  runtime.resolvedGuiltByAssociationBattleSourceInstanceIds =
    runtime.resolvedGuiltByAssociationBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingGuiltByAssociationAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingGuiltByAssociationAftermath = null;
  }
}

function usedPhysicalBattleCardIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const participant = requireRuntime(state).participants[playerId];
  const instanceIds = [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(card => card.instanceId),
    ...(participant.tactic ? [participant.tactic.instanceId] : []),
    ...participant.additionalTactics.map(card => card.instanceId),
  ];

  const titles = new Set<string>();
  const result: string[] = [];
  for (const instanceId of instanceIds) {
    const cardId = state.cardInstances[instanceId]?.cardId;
    if (!cardId) continue;
    const title = cardTitle(cardId);
    if (titles.has(title)) continue;
    titles.add(title);
    result.push(cardId);
  }
  return result;
}

function resolveTitle(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  targetCardId: string,
): void {
  const targetTitle = cardTitle(targetCardId);
  const zones = state.players[opponent].zones;
  const moved = zones.discardPile.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    return cardId ? cardTitle(cardId) === targetTitle : false;
  });
  const movedSet = new Set(moved);
  zones.discardPile = zones.discardPile.filter(
    instanceId => !movedSet.has(instanceId),
  );
  zones.graveyard.push(...moved);

  applyV070NormalAftermathConviction(state, owner, moved);
  appendV070Event(state, {
    type: 'guilt_by_association_battle_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      opponent,
      targetCardId,
      targetTitle,
      movedInstanceIds: moved,
      movedCount: moved.length,
      destination: 'graveyard',
    },
  });
}

function cardTitle(cardId: string): string {
  return currentCanonicalContent.cardsById.get(cardId)?.name
    ?? v070CanonicalContent.cardsById.get(cardId)?.name
    ?? cardId;
}

function markResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  runtime.resolvedGuiltByAssociationBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedGuiltByAssociationBattleSourceInstanceIds
    .includes(sourceInstanceId)) {
    runtime.resolvedGuiltByAssociationBattleSourceInstanceIds.push(
      sourceInstanceId,
    );
  }
  if (runtime.pendingGuiltByAssociationAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingGuiltByAssociationAftermath = null;
  }
}

function requireRuntime(state: V070GameState) {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Guilt by Association battle effect requires an active battle runtime.',
    );
  }
  return runtime;
}
