import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { applyV070NormalAftermathConviction } from './inquisition';

export const V070_EXCOMMUNICATION_ID = 'inquisition-excommunication' as const;
export const V070_EXCOMMUNICATION_BATTLE_TEXT =
  "In the Aftermath, choose one or more cards in the opponent's Discard Pile with combined card value up to 3. Put them in their Graveyard." as const;
export const V070_EXCOMMUNICATION_BATTLE_MAX_VALUE = 3 as const;

export interface V070PendingExcommunicationAftermath {
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
  maximumCombinedValue: typeof V070_EXCOMMUNICATION_BATTLE_MAX_VALUE;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    excommunicationBattleSourceInstanceIds?: string[];
    resolvedExcommunicationBattleSourceInstanceIds?: string[];
    pendingExcommunicationAftermath?: V070PendingExcommunicationAftermath | null;
  }
}

function validateV070ExcommunicationBattleAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_EXCOMMUNICATION_ID);
  const effect = card?.effects.find(entry => entry.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_EXCOMMUNICATION_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Excommunication battle text drifted from released authority.',
    );
  }
}

validateV070ExcommunicationBattleAuthority();

export function registerV070ExcommunicationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_EXCOMMUNICATION_ID || source.owner !== owner) {
    throw new V070GameActionError(
      'Excommunication battle registration requires its own committed card.',
    );
  }

  runtime.excommunicationBattleSourceInstanceIds ??= [];
  runtime.resolvedExcommunicationBattleSourceInstanceIds ??= [];
  runtime.pendingExcommunicationAftermath ??= null;
  if (!runtime.excommunicationBattleSourceInstanceIds.includes(sourceInstanceId)) {
    runtime.excommunicationBattleSourceInstanceIds.push(sourceInstanceId);
  }
}

export function pendingV070ExcommunicationAftermath(
  state: V070GameState,
): V070PendingExcommunicationAftermath | null {
  return state.battleRuntime?.pendingExcommunicationAftermath ?? null;
}

export function unresolvedV070ExcommunicationSourcesForPlayer(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const resolved = new Set(
    runtime.resolvedExcommunicationBattleSourceInstanceIds ?? [],
  );
  return (runtime.excommunicationBattleSourceInstanceIds ?? []).filter(
    sourceInstanceId =>
      state.cardInstances[sourceInstanceId]?.owner === owner
      && !resolved.has(sourceInstanceId),
  );
}

export function openV070ExcommunicationAftermathForSource(
  state: V070GameState,
  sourceInstanceId: string,
): boolean {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  const source = state.cardInstances[sourceInstanceId];
  if (!battle || source?.cardId !== V070_EXCOMMUNICATION_ID) {
    throw new V070GameActionError(
      'Excommunication Aftermath requires its registered battle source.',
    );
  }
  const owner = source.owner;
  if (owner !== 'A' && owner !== 'B') {
    throw new V070GameActionError('Excommunication source has no valid owner.');
  }
  if (!unresolvedV070ExcommunicationSourcesForPlayer(state, owner)
    .includes(sourceInstanceId)) {
    throw new V070GameActionError(
      'That Excommunication battle effect is no longer pending.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = excommunicationCandidates(state, opponent);
  if (candidates.length === 0) {
    markResolved(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'excommunication_battle_no_eligible_cards',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        opponent,
        maximumCombinedValue: V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
      },
    });
    return false;
  }

  if (candidates.length === 1) {
    moveExcommunicatedCards(
      state,
      owner,
      opponent,
      sourceInstanceId,
      candidates,
    );
    markResolved(state, sourceInstanceId);
    return false;
  }

  runtime.pendingExcommunicationAftermath = {
    playerId: owner,
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: candidates,
    maximumCombinedValue: V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
  };
  appendV070Event(state, {
    type: 'excommunication_battle_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      opponent,
      candidateCount: candidates.length,
      maximumCombinedValue: V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'excommunication_battle_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      opponent,
      candidateInstanceIds: [...candidates],
      maximumCombinedValue: V070_EXCOMMUNICATION_BATTLE_MAX_VALUE,
    },
  });
  return true;
}

export function resolveV070ExcommunicationAftermathChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceIds: readonly string[],
): PlayerId {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingExcommunicationAftermath;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Excommunication Aftermath choice is pending for that player.',
    );
  }
  if (targetInstanceIds.length === 0) {
    throw new V070GameActionError(
      'Excommunication must choose one or more eligible cards.',
    );
  }
  const unique = new Set(targetInstanceIds);
  if (unique.size !== targetInstanceIds.length) {
    throw new V070GameActionError(
      'Excommunication cannot choose the same physical card more than once.',
    );
  }

  const currentCandidates = new Set(
    excommunicationCandidates(state, pending.opponent),
  );
  for (const instanceId of targetInstanceIds) {
    if (!pending.candidateInstanceIds.includes(instanceId)
      || !currentCandidates.has(instanceId)) {
      throw new V070GameActionError(
        "Excommunication may choose only eligible cards still in the opponent's Discard Pile.",
      );
    }
  }

  const combinedValue = targetInstanceIds.reduce(
    (sum, instanceId) => sum + cardValue(state, instanceId),
    0,
  );
  if (combinedValue > V070_EXCOMMUNICATION_BATTLE_MAX_VALUE) {
    throw new V070GameActionError(
      `Excommunication targets have combined card value ${combinedValue}; maximum is ${V070_EXCOMMUNICATION_BATTLE_MAX_VALUE}.`,
    );
  }

  moveExcommunicatedCards(
    state,
    pending.owner,
    pending.opponent,
    pending.sourceInstanceId,
    targetInstanceIds,
  );
  const owner = pending.owner;
  runtime.pendingExcommunicationAftermath = null;
  markResolved(state, pending.sourceInstanceId);
  return owner;
}

export function removeV070ExcommunicationBattleRegistration(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.excommunicationBattleSourceInstanceIds =
    runtime.excommunicationBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  runtime.resolvedExcommunicationBattleSourceInstanceIds =
    runtime.resolvedExcommunicationBattleSourceInstanceIds?.filter(
      instanceId => instanceId !== sourceInstanceId,
    );
  if (runtime.pendingExcommunicationAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingExcommunicationAftermath = null;
  }
}

function excommunicationCandidates(
  state: V070GameState,
  opponent: PlayerId,
): string[] {
  return state.players[opponent].zones.discardPile.filter(instanceId => {
    const value = optionalCardValue(state, instanceId);
    return value !== null && value <= V070_EXCOMMUNICATION_BATTLE_MAX_VALUE;
  });
}

function moveExcommunicatedCards(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  targetInstanceIds: readonly string[],
): void {
  const selected = new Set(targetInstanceIds);
  const zones = state.players[opponent].zones;
  zones.discardPile = zones.discardPile.filter(
    instanceId => !selected.has(instanceId),
  );
  zones.graveyard.push(...targetInstanceIds);

  applyV070NormalAftermathConviction(state, owner, targetInstanceIds);
  appendV070Event(state, {
    type: 'excommunication_battle_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      opponent,
      targetInstanceIds: [...targetInstanceIds],
      combinedValue: targetInstanceIds.reduce(
        (sum, instanceId) => sum + cardValue(state, instanceId),
        0,
      ),
      destination: 'graveyard',
    },
  });
}

function markResolved(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  const runtime = requireRuntime(state);
  runtime.resolvedExcommunicationBattleSourceInstanceIds ??= [];
  if (!runtime.resolvedExcommunicationBattleSourceInstanceIds
    .includes(sourceInstanceId)) {
    runtime.resolvedExcommunicationBattleSourceInstanceIds.push(sourceInstanceId);
  }
  if (runtime.pendingExcommunicationAftermath?.sourceInstanceId ===
    sourceInstanceId) {
    runtime.pendingExcommunicationAftermath = null;
  }
}

function optionalCardValue(
  state: V070GameState,
  instanceId: string,
): number | null {
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (!cardId) return null;
  return v070CanonicalContent.cardsById.get(cardId)?.value ?? null;
}

function cardValue(
  state: V070GameState,
  instanceId: string,
): number {
  const value = optionalCardValue(state, instanceId);
  if (value === null) {
    throw new V070GameActionError(
      'Excommunication target does not map to a canonical card value.',
    );
  }
  return value;
}

function requireRuntime(state: V070GameState) {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Excommunication battle effect requires an active battle runtime.',
    );
  }
  return runtime;
}
