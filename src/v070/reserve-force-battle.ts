import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import {
  markV070BattleCardEffectApplied,
  v070BattleCommitment,
} from './battle-effect-status';
import {
  completeV070ReserveForceBattleRevealChoice,
  queueV070ReserveForceBattleRevealChoice,
} from './battle-reveal-choices';
import {
  v070PostTacticsReplacementEligibleHandInstanceIds,
} from './operational-reassessment-battle';
import { applyV070BlasphemyForBattleReveal } from './inquisition';
import type { PlayerId } from './rules';

export const V070_RESERVE_FORCE_ID = 'military-reserve-force' as const;
export const V070_RESERVE_FORCE_BATTLE_TEXT =
  'After Tactics are revealed, you may replace this card with up to two eligible cards from your Hand, face up. If replaced, put this card in your Graveyard; otherwise discard it in the Aftermath.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredReserveForceGambitCommitments?: V070BattleCardCommitment[];
    pendingReserveForceReplacementCommitments?: V070BattleCardCommitment[];
  }
}

function validateAuthority(): void {
  for (const [label, content] of [
    ['frozen v0.7.0', v070CanonicalContent],
    ['current', currentCanonicalContent],
  ] as const) {
    const effect = content.cardsById.get(V070_RESERVE_FORCE_ID)
      ?.effects.find(candidate => candidate.label === 'Gambit/Tactic');
    if (effect?.text !== V070_RESERVE_FORCE_BATTLE_TEXT) {
      throw new Error(
        `Reserve Force battle text drifted from ${label} gameplay authority.`,
      );
    }
  }
}

validateAuthority();

export function deferV070ReserveForceGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredReserveForceGambitCommitments ??= [];
  if (runtime.deferredReserveForceGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) {
    return;
  }
  runtime.deferredReserveForceGambitCommitments.push({ ...commitment });
}

export function takeV070DeferredReserveForceGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredReserveForceGambitCommitments ?? [];
  runtime.deferredReserveForceGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_RESERVE_FORCE_ID
    && battleContainsCommitment(state, commitment)
  );
}

export function registerV070ReserveForceBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Reserve Force battle resolution requires an active battle.',
    );
  }
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source
    || source.owner !== owner
    || source.role !== role
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_RESERVE_FORCE_ID) {
    throw new V070GameActionError(
      'Reserve Force source no longer matches its battle role.',
    );
  }

  queueV070ReserveForceBattleRevealChoice(state, {
    kind: 'reserve_force',
    owner,
    sourceInstanceId,
    role,
    candidateInstanceIds:
      v070PostTacticsReplacementEligibleHandInstanceIds(
        state,
        owner,
        role,
      ),
  });
}

export interface V070ReserveForceResolution {
  replacements: V070BattleCardCommitment[];
  sourceDestination: 'discard' | 'graveyard';
}

export function resolveV070ReserveForceBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  replacementInstanceIds: readonly string[],
): V070ReserveForceResolution {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingReserveForceBattleRevealChoice;
  if (!runtime || !pending || !runtime.reserveForceBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'No Reserve Force battle replacement choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Reserve Force controller may choose its replacements.',
    );
  }
  if (replacementInstanceIds.length > 2
    || new Set(replacementInstanceIds).size !== replacementInstanceIds.length) {
    throw new V070GameActionError(
      'Reserve Force may choose up to two different replacement cards.',
    );
  }
  for (const instanceId of replacementInstanceIds) {
    if (!pending.candidateInstanceIds.includes(instanceId)) {
      throw new V070GameActionError(
        'Reserve Force must choose originally eligible replacement cards from Hand.',
      );
    }
  }

  const liveCandidates =
    v070PostTacticsReplacementEligibleHandInstanceIds(
      state,
      playerId,
      pending.role,
    );
  if (replacementInstanceIds.some(
    instanceId => !liveCandidates.includes(instanceId),
  )) {
    throw new V070GameActionError(
      'A chosen Reserve Force replacement is no longer eligible.',
    );
  }

  completeV070ReserveForceBattleRevealChoice(state);

  if (replacementInstanceIds.length === 0) {
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    registerSourceDiscardOverride(
      state,
      playerId,
      pending.sourceInstanceId,
    );
    appendV070Event(state, {
      type: 'reserve_force_battle_not_replaced',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_RESERVE_FORCE_ID,
        role: pending.role,
        aftermathDestination: 'discard',
      },
    });
    return {
      replacements: [],
      sourceDestination: 'discard',
    };
  }

  const replacements = replaceSourceWithHandCards(
    state,
    playerId,
    pending.sourceInstanceId,
    pending.role,
    replacementInstanceIds,
  );
  runtime.pendingReserveForceReplacementCommitments = [
    ...(runtime.pendingReserveForceReplacementCommitments ?? []),
    ...replacements,
  ];
  return {
    replacements,
    sourceDestination: 'graveyard',
  };
}

export function takeNextV070ReserveForceReplacementCommitment(
  state: V070GameState,
): V070BattleCardCommitment | null {
  const runtime = state.battleRuntime;
  const queue = runtime?.pendingReserveForceReplacementCommitments;
  if (!runtime || !queue || queue.length === 0) return null;
  return queue.shift() ?? null;
}

export function hasV070ReserveForceReplacementEffectsPending(
  state: V070GameState,
): boolean {
  return (state.battleRuntime?.pendingReserveForceReplacementCommitments
    ?.length ?? 0) > 0;
}

function replaceSourceWithHandCards(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
  replacementInstanceIds: readonly string[],
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime!;
  const participant = runtime.participants[owner];
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source || source.owner !== owner || source.role !== role) {
    throw new V070GameActionError(
      'Reserve Force is no longer available to replace.',
    );
  }

  const replacements = replacementInstanceIds.map(instanceId => ({
    instanceId,
    owner,
    role,
    faceUp: true,
  } satisfies V070BattleCardCommitment));

  const hand = state.players[owner].zones.hand;
  for (const instanceId of replacementInstanceIds) {
    const index = hand.indexOf(instanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'Each Reserve Force replacement must still be in Hand.',
      );
    }
    hand.splice(index, 1);
  }

  if (role === 'gambit') {
    if (participant.gambit?.instanceId === sourceInstanceId) {
      participant.gambit = replacements[0] ?? null;
      participant.additionalGambits.push(...replacements.slice(1));
    } else {
      const index = participant.additionalGambits.findIndex(
        candidate => candidate.instanceId === sourceInstanceId,
      );
      if (index < 0) {
        throw new V070GameActionError(
          'Reserve Force no longer occupies the Gambit role it must replace.',
        );
      }
      participant.additionalGambits.splice(index, 1, ...replacements);
    }
  } else if (participant.tactic?.instanceId === sourceInstanceId) {
    participant.tactic = replacements[0] ?? null;
    participant.additionalTactics.push(...replacements.slice(1));
  } else {
    const index = participant.additionalTactics.findIndex(
      candidate => candidate.instanceId === sourceInstanceId,
    );
    if (index < 0) {
      throw new V070GameActionError(
        'Reserve Force no longer occupies the Tactic role it must replace.',
      );
    }
    participant.additionalTactics.splice(index, 1, ...replacements);
  }

  if (!state.players[owner].zones.graveyard.includes(sourceInstanceId)) {
    state.players[owner].zones.graveyard.push(sourceInstanceId);
  }
  markV070BattleCardEffectApplied(state, sourceInstanceId);

  for (const replacement of replacements) {
    const cardId =
      state.cardInstances[replacement.instanceId]?.cardId ?? '';
    applyV070BlasphemyForBattleReveal(
      state,
      owner,
      cardId,
      role,
    );
    appendV070Event(state, {
      type: `${role}_revealed`,
      actor: owner,
      visibility: 'public',
      payload: {
        instanceId: replacement.instanceId,
        cardId,
        faceUp: true,
        source: 'Reserve Force',
        replacedInstanceId: sourceInstanceId,
      },
    });
  }

  appendV070Event(state, {
    type: 'reserve_force_battle_replaced',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_RESERVE_FORCE_ID,
      sourceDestination: 'graveyard',
      role,
      replacementInstanceIds: [...replacementInstanceIds],
      replacementCount: replacementInstanceIds.length,
      replacementFaceUp: true,
    },
  });

  return replacements;
}

function registerSourceDiscardOverride(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime!;
  const existing = runtime.battleCardAftermathDestinationOverrides.find(
    override =>
      override.playerId === owner
      && override.instanceId === sourceInstanceId,
  );
  if (existing) {
    existing.destination = 'discard';
    existing.sourceCardId = V070_RESERVE_FORCE_ID;
    return;
  }
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: V070_RESERVE_FORCE_ID,
    playerId: owner,
    instanceId: sourceInstanceId,
    destination: 'discard',
  });
}

function battleContainsCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  const participant = state.battleRuntime?.participants[commitment.owner];
  if (!participant) return false;
  const candidates = commitment.role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
  return candidates.some(
    candidate => candidate.instanceId === commitment.instanceId,
  );
}
