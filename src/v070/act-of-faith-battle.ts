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

export type V070ActOfFaithAftermathStage =
  | 'reveal_count'
  | 'graveyard';

export interface V070PendingActOfFaithAftermath {
  sourceInstanceId: string;
  owner: PlayerId;
  opponent: PlayerId;
  playerId: PlayerId;
  stage: V070ActOfFaithAftermathStage;
  maximumRevealCount: number;
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

export function openV070ActOfFaithAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return false;
  if (runtime.pendingActOfFaithAftermath) return true;

  const owner = state.cardInstances[sourceInstanceId]?.owner;
  if (owner !== 'A' && owner !== 'B') {
    markV070ActOfFaithSourceResolved(state, sourceInstanceId);
    return false;
  }
  if (!unresolvedV070ActOfFaithSourcesForPlayer(state, owner)
    .includes(sourceInstanceId)) {
    return false;
  }

  const opponent = otherPlayer(owner);
  const maximumRevealCount = Math.min(
    2,
    state.players[opponent].zones.drawPile.length,
  );
  if (maximumRevealCount === 0) {
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

  runtime.pendingActOfFaithAftermath = {
    sourceInstanceId,
    owner,
    opponent,
    playerId: owner,
    stage: 'reveal_count',
    maximumRevealCount,
    candidateInstanceIds: [],
  };
  appendV070Event(state, {
    type: 'act_of_faith_battle_reveal_count_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent,
      maximumRevealCount,
    },
  });
  return true;
}

export function resolveV070ActOfFaithRevealCount(
  state: V070GameState,
  playerId: PlayerId,
  revealCount: number,
): PlayerId | null {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingActOfFaithAftermath;
  if (!runtime || !pending || pending.stage !== 'reveal_count') {
    throw new V070GameActionError(
      'There is no pending Act of Faith reveal-count choice.',
    );
  }
  if (pending.playerId !== playerId || pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Act of Faith owner may choose how many cards to reveal.',
    );
  }
  if (!Number.isInteger(revealCount)
    || revealCount < 0
    || revealCount > pending.maximumRevealCount) {
    throw new V070GameActionError(
      `Act of Faith may reveal from zero to ${pending.maximumRevealCount} card(s).`,
    );
  }

  if (revealCount === 0) {
    const owner = pending.owner;
    const sourceInstanceId = pending.sourceInstanceId;
    runtime.pendingActOfFaithAftermath = null;
    markV070ActOfFaithSourceResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'act_of_faith_battle_reveal_declined',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACT_OF_FAITH_ID,
        opponent: pending.opponent,
      },
    });
    return owner;
  }

  const candidates = state.players[pending.opponent].zones.drawPile
    .slice(0, revealCount);
  if (candidates.length !== revealCount) {
    throw new V070GameActionError(
      'The opponent no longer has enough cards on top of their Draw Pile for that Act of Faith choice.',
    );
  }

  appendV070Event(state, {
    type: 'act_of_faith_battle_cards_revealed',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent: pending.opponent,
      candidateInstanceIds: [...candidates],
      candidateCardIds: candidates.map(
        instanceId => state.cardInstances[instanceId]?.cardId ?? null,
      ),
    },
  });

  if (candidates.length === 1) {
    const [targetInstanceId] = candidates;
    state.players[pending.opponent].zones.drawPile.shift();
    state.players[pending.opponent].zones.graveyard.push(targetInstanceId);
    const owner = pending.owner;
    const sourceInstanceId = pending.sourceInstanceId;
    runtime.pendingActOfFaithAftermath = null;
    markV070ActOfFaithSourceResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'act_of_faith_battle_resolved_single_card',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ACT_OF_FAITH_ID,
        opponent: pending.opponent,
        graveyardInstanceId: targetInstanceId,
        graveyardCardId:
          state.cardInstances[targetInstanceId]?.cardId ?? null,
      },
    });
    return owner;
  }

  runtime.pendingActOfFaithAftermath = {
    ...pending,
    stage: 'graveyard',
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'act_of_faith_battle_graveyard_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_ACT_OF_FAITH_ID,
      opponent: pending.opponent,
      candidateInstanceIds: [...candidates],
      candidateCardIds: candidates.map(
        instanceId => state.cardInstances[instanceId]?.cardId ?? null,
      ),
    },
  });
  return null;
}

export function resolveV070ActOfFaithGraveyardChoice(
  state: V070GameState,
  playerId: PlayerId,
  graveyardInstanceId: string,
): PlayerId {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingActOfFaithAftermath;
  if (!runtime || !pending || pending.stage !== 'graveyard') {
    throw new V070GameActionError(
      'There is no pending Act of Faith Graveyard choice.',
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
