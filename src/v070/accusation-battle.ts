import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_ACCUSATION_ID = 'inquisition-accusation' as const;

const accusationBattleEffect = v070CanonicalContent.cardsById
  .get(V070_ACCUSATION_ID)
  ?.effects.find(effect => effect.label === 'Gambit/Tactic');
if (!accusationBattleEffect) {
  throw new Error(
    'Published v0.7.0 Accusation is missing its Gambit/Tactic effect.',
  );
}
export const V070_ACCUSATION_BATTLE_TEXT = accusationBattleEffect.text;

export type V070AccusationAftermathStage = 'target' | 'destination';

export interface V070PendingAccusationAftermath {
  sourceInstanceId: string;
  owner: PlayerId;
  opponent: PlayerId;
  playerId: PlayerId;
  stage: V070AccusationAftermathStage;
  candidateInstanceIds: string[];
  targetInstanceId?: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    accusationBattleSourceInstanceIds?: string[];
    resolvedAccusationBattleSourceInstanceIds?: string[];
    pendingAccusationAftermath?: V070PendingAccusationAftermath | null;
  }
}

export function registerV070AccusationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || !state.battle) {
    throw new V070GameActionError(
      'Accusation battle registration requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_ACCUSATION_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Accusation registration requires the matching battle-card instance.',
    );
  }

  runtime.accusationBattleSourceInstanceIds ??= [];
  if (!runtime.accusationBattleSourceInstanceIds.includes(sourceInstanceId)) {
    runtime.accusationBattleSourceInstanceIds.push(sourceInstanceId);
  }

  appendV070Event(state, {
    type: 'accusation_battle_aftermath_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACCUSATION_ID,
    },
  });
}

export function pendingV070AccusationAftermath(
  state: V070GameState,
): V070PendingAccusationAftermath | null {
  return state.battleRuntime?.pendingAccusationAftermath ?? null;
}

export function unresolvedV070AccusationSourcesForPlayer(
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

export function openV070AccusationAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingAccusationAftermath) return true;

  const owner = state.cardInstances[sourceInstanceId]?.owner;
  if (owner !== 'A' && owner !== 'B') {
    markV070AccusationSourceResolved(state, sourceInstanceId);
    return false;
  }
  if (!unresolvedV070AccusationSourcesForPlayer(state, owner)
    .includes(sourceInstanceId)) {
    return false;
  }

  const opponent = otherPlayer(owner);
  const candidates = [...state.players[opponent].zones.discardPile];

  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'accusation_battle_resolved_empty_discard',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACCUSATION_ID,
        opponent,
      },
    });
    markV070AccusationSourceResolved(state, sourceInstanceId);
    return false;
  }

  if (candidates.length === 1) {
    openDestinationChoice(
      state,
      sourceInstanceId,
      owner,
      opponent,
      candidates[0],
    );
    return true;
  }

  runtime.pendingAccusationAftermath = {
    sourceInstanceId,
    owner,
    opponent,
    playerId: owner,
    stage: 'target',
    candidateInstanceIds: candidates,
  };
  appendV070Event(state, {
    type: 'accusation_battle_target_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACCUSATION_ID,
      opponent,
      candidateCount: candidates.length,
    },
  });
  appendV070Event(state, {
    type: 'accusation_battle_target_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      candidateInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070AccusationTarget(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingAccusationAftermath;
  if (!runtime || !pending || pending.stage !== 'target') {
    throw new V070GameActionError(
      'There is no pending Accusation target choice.',
    );
  }
  if (pending.playerId !== playerId || pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Accusation owner may choose its Discard Pile target.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !state.players[pending.opponent].zones.discardPile.includes(
      targetInstanceId,
    )) {
    throw new V070GameActionError(
      'Choose a card that is still eligible in the opponent’s Discard Pile.',
    );
  }

  openDestinationChoice(
    state,
    pending.sourceInstanceId,
    pending.owner,
    pending.opponent,
    targetInstanceId,
  );
}

export function resolveV070AccusationDestination(
  state: V070GameState,
  playerId: PlayerId,
  destination: 'draw_top' | 'graveyard',
): PlayerId {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingAccusationAftermath;
  if (!runtime || !pending || pending.stage !== 'destination'
    || !pending.targetInstanceId) {
    throw new V070GameActionError(
      'There is no pending Accusation destination choice.',
    );
  }
  if (pending.playerId !== playerId || pending.opponent !== playerId) {
    throw new V070GameActionError(
      'Only the affected opponent may choose the Accusation destination.',
    );
  }

  const zones = state.players[playerId].zones;
  const index = zones.discardPile.indexOf(pending.targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The chosen Accusation card is no longer in the Discard Pile.',
    );
  }
  zones.discardPile.splice(index, 1);
  if (destination === 'draw_top') {
    zones.drawPile.unshift(pending.targetInstanceId);
  } else {
    zones.graveyard.push(pending.targetInstanceId);
  }

  appendV070Event(state, {
    type: 'accusation_battle_destination_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_ACCUSATION_ID,
      targetInstanceId: pending.targetInstanceId,
      targetCardId:
        state.cardInstances[pending.targetInstanceId]?.cardId ?? null,
      destination,
    },
  });

  const sourceInstanceId = pending.sourceInstanceId;
  const owner = pending.owner;
  runtime.pendingAccusationAftermath = null;
  markV070AccusationSourceResolved(state, sourceInstanceId);
  return owner;
}

export function removeV070AccusationBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.accusationBattleSourceInstanceIds =
    runtime.accusationBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingAccusationAftermath?.sourceInstanceId === sourceInstanceId) {
    runtime.pendingAccusationAftermath = null;
  }
}

function openDestinationChoice(
  state: V070GameState,
  sourceInstanceId: string,
  owner: PlayerId,
  opponent: PlayerId,
  targetInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Accusation destination choice requires an active battle runtime.',
    );
  }
  if (!state.players[opponent].zones.discardPile.includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Accusation can choose only a card currently in the opponent’s Discard Pile.',
    );
  }

  runtime.pendingAccusationAftermath = {
    sourceInstanceId,
    owner,
    opponent,
    playerId: opponent,
    stage: 'destination',
    candidateInstanceIds: [targetInstanceId],
    targetInstanceId,
  };

  appendV070Event(state, {
    type: 'accusation_battle_target_chosen',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACCUSATION_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      opponent,
    },
  });
  appendV070Event(state, {
    type: 'accusation_battle_destination_choice_pending',
    actor: opponent,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACCUSATION_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      choices: ['draw_top', 'graveyard'],
    },
  });
}

function markV070AccusationSourceResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.resolvedAccusationBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedAccusationBattleSourceInstanceIds.includes(
    sourceInstanceId,
  )) {
    runtime.resolvedAccusationBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
