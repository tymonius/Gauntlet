import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_ACT_OF_FAITH_ID = 'inquisition-act-of-faith' as const;

const actOfFaithBattleEffect = v070CanonicalContent.cardsById
  .get(V070_ACT_OF_FAITH_ID)
  ?.effects.find(effect => effect.label === 'Gambit/Tactic');
if (!actOfFaithBattleEffect) {
  throw new Error(
    'Published v0.7.0 Act of Faith is missing its Gambit/Tactic effect.',
  );
}
export const V070_ACT_OF_FAITH_BATTLE_TEXT = actOfFaithBattleEffect.text;

export interface V070PendingActOfFaithAftermath {
  sourceInstanceId: string;
  owner: PlayerId;
  opponent: PlayerId;
  playerId: PlayerId;
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    actOfFaithBattleSourceInstanceIds?: string[];
    resolvedActOfFaithBattleSourceInstanceIds?: string[];
    pendingActOfFaithAftermath?: V070PendingActOfFaithAftermath | null;
  }
}

export function registerV070ActOfFaithBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || !state.battle) {
    throw new V070GameActionError(
      'Act of Faith battle registration requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.cardId !== V070_ACT_OF_FAITH_ID
    || state.cardInstances[sourceInstanceId]?.owner !== owner) {
    throw new V070GameActionError(
      'Act of Faith registration requires the matching battle-card instance.',
    );
  }

  runtime.actOfFaithBattleSourceInstanceIds ??= [];
  if (!runtime.actOfFaithBattleSourceInstanceIds.includes(sourceInstanceId)) {
    runtime.actOfFaithBattleSourceInstanceIds.push(sourceInstanceId);
  }

  appendV070Event(state, {
    type: 'act_of_faith_battle_aftermath_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
    },
  });
}

export function pendingV070ActOfFaithAftermath(
  state: V070GameState,
): V070PendingActOfFaithAftermath | null {
  return state.battleRuntime?.pendingActOfFaithAftermath ?? null;
}

export function unresolvedV070ActOfFaithSourcesForPlayer(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedActOfFaithBattleSourceInstanceIds ?? [],
  );
  return (runtime.actOfFaithBattleSourceInstanceIds ?? []).filter(
    instanceId =>
      !resolved.has(instanceId)
      && state.cardInstances[instanceId]?.owner === playerId,
  );
}

export function openV070ActOfFaithAftermathForPlayer(
  state: V070GameState,
  owner: PlayerId,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingActOfFaithAftermath) return true;

  const sourceInstanceId = unresolvedV070ActOfFaithSourcesForPlayer(
    state,
    owner,
  )[0];
  if (!sourceInstanceId) return false;

  const opponent = otherPlayer(owner);
  const candidates = state.players[opponent].zones.drawPile.slice(0, 2);

  appendV070Event(state, {
    type: 'act_of_faith_battle_cards_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent,
      candidateInstanceIds: [...candidates],
      candidateCardIds: candidates.map(
        instanceId => state.cardInstances[instanceId]?.cardId ?? null,
      ),
    },
  });

  if (candidates.length === 0) {
    markV070ActOfFaithSourceResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'act_of_faith_battle_resolved_empty_draw_pile',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACT_OF_FAITH_ID,
        opponent,
      },
    });
    return false;
  }

  if (candidates.length === 1) {
    const [targetInstanceId] = candidates;
    state.players[opponent].zones.drawPile.shift();
    state.players[opponent].zones.graveyard.push(targetInstanceId);
    markV070ActOfFaithSourceResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'act_of_faith_battle_resolved_single_card',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACT_OF_FAITH_ID,
        opponent,
        graveyardInstanceId: targetInstanceId,
        graveyardCardId:
          state.cardInstances[targetInstanceId]?.cardId ?? null,
      },
    });
    return false;
  }

  runtime.pendingActOfFaithAftermath = {
    sourceInstanceId,
    owner,
    opponent,
    playerId: owner,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'act_of_faith_battle_graveyard_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent,
      candidateInstanceIds: [...candidates],
      candidateCardIds: candidates.map(
        instanceId => state.cardInstances[instanceId]?.cardId ?? null,
      ),
    },
  });
  return true;
}

export function resolveV070ActOfFaithAftermath(
  state: V070GameState,
  playerId: PlayerId,
  graveyardInstanceId: string,
): PlayerId {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingActOfFaithAftermath;
  if (!runtime || !pending) {
    throw new V070GameActionError(
      'There is no pending Act of Faith Aftermath choice.',
    );
  }
  if (pending.playerId !== playerId || pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Act of Faith owner may choose which revealed card enters the Graveyard.',
    );
  }
  if (!pending.candidateInstanceIds.includes(graveyardInstanceId)) {
    throw new V070GameActionError(
      'Choose one of the cards revealed by Act of Faith.',
    );
  }

  const drawPile = state.players[pending.opponent].zones.drawPile;
  if (pending.candidateInstanceIds.some(
    (instanceId, index) => drawPile[index] !== instanceId,
  )) {
    throw new V070GameActionError(
      'The cards revealed by Act of Faith are no longer on top of the Draw Pile.',
    );
  }

  drawPile.splice(0, pending.candidateInstanceIds.length);
  const discardInstanceIds = pending.candidateInstanceIds.filter(
    instanceId => instanceId !== graveyardInstanceId,
  );
  state.players[pending.opponent].zones.graveyard.push(graveyardInstanceId);
  state.players[pending.opponent].zones.discardPile.push(...discardInstanceIds);

  appendV070Event(state, {
    type: 'act_of_faith_battle_graveyard_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent: pending.opponent,
      graveyardInstanceId,
      graveyardCardId:
        state.cardInstances[graveyardInstanceId]?.cardId ?? null,
      discardInstanceIds: [...discardInstanceIds],
      discardCardIds: discardInstanceIds.map(
        instanceId => state.cardInstances[instanceId]?.cardId ?? null,
      ),
    },
  });

  const owner = pending.owner;
  const sourceInstanceId = pending.sourceInstanceId;
  runtime.pendingActOfFaithAftermath = null;
  markV070ActOfFaithSourceResolved(state, sourceInstanceId);
  return owner;
}

export function removeV070ActOfFaithBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.actOfFaithBattleSourceInstanceIds =
    runtime.actOfFaithBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingActOfFaithAftermath?.sourceInstanceId === sourceInstanceId) {
    runtime.pendingActOfFaithAftermath = null;
  }
}

function markV070ActOfFaithSourceResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.resolvedActOfFaithBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedActOfFaithBattleSourceInstanceIds.includes(
    sourceInstanceId,
  )) {
    runtime.resolvedActOfFaithBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
