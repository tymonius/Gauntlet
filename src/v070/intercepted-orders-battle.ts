import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import { markV070BattleCardEffectApplied } from './battle-effect-status';

/**
 * Next-release groundwork, deliberately NOT installed in the live v0.7.2
 * reveal handler registry. The current card is still Gambit/Tactic; its
 * proposed Tactic-only text must be promoted through release governance first.
 */
export const INTERCEPTED_ORDERS_CARD_ID =
  'intelligence-intercepted-orders' as const;
export const INTERCEPTED_ORDERS_NEXT_TACTIC_TEXT =
  "Reveal the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve." as const;

type ReplacementSlot =
  | { kind: 'normal' }
  | { kind: 'additional'; index: number };

export interface InterceptedOrdersReturn {
  sourceInstanceId: string;
  sourceOwner: PlayerId;
  targetOwner: PlayerId;
  targetInstanceId: string;
  slot: ReplacementSlot;
  replacementCandidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Exact instances barred after Intercepted Orders returns them. */
    interceptedOrdersBarredInstanceIds?: string[];
  }
}

function opposingPlayer(owner: PlayerId): PlayerId {
  return owner === 'A' ? 'B' : 'A';
}

function assertSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError('Intercepted Orders needs an active battle.');
  }
  if (runtime.stage !== 'reveal_tactics' && runtime.stage !== 'outcome') {
    throw new V070GameActionError(
      'Intercepted Orders only resolves during the Tactic reveal procedure.',
    );
  }
  const source = state.cardInstances[sourceInstanceId];
  const participant = runtime.participants[owner];
  const committed = [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ].some(card => card.instanceId === sourceInstanceId && card.role === 'tactic');
  if (!source
    || source.owner !== owner
    || source.cardId !== INTERCEPTED_ORDERS_CARD_ID
    || !committed) {
    throw new V070GameActionError(
      'Intercepted Orders must be a Tactic committed by its owner.',
    );
  }
}

/** Selection is among physically committed opposing Tactics, not Reserve cards. */
export function interceptedOrdersTacticTargets(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const participant = runtime.participants[opposingPlayer(owner)];
  return [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ]
    .filter(card => card.role === 'tactic')
    .map(card => card.instanceId);
}

function canChooseReplacement(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): boolean {
  const card = state.cardInstances[instanceId];
  const participant = state.battleRuntime?.participants[playerId];
  if (!card || card.owner !== playerId
    || !participant?.reserve.includes(instanceId)) {
    return false;
  }
  const banned = state.battleRuntime?.interceptedOrdersBarredInstanceIds ?? [];
  const disruptionBanned = state.battleRuntime?.disruptionProhibitedInstanceIds ?? [];
  if (banned.includes(instanceId) || disruptionBanned.includes(instanceId)) {
    return false;
  }
  // Current and frozen v0.7.0 indices are read-only authority views. The
  // future-release card's proposed heading must be promoted before wiring.
  const definition =
    currentCanonicalContent.cardsById.get(card.cardId)
    ?? v070CanonicalContent.cardsById.get(card.cardId);
  return Boolean(definition?.effects.some(effect =>
    effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
  ));
}

export function interceptedOrdersReplacementCandidates(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  const reserve = state.battleRuntime?.participants[playerId].reserve ?? [];
  return reserve.filter(instanceId =>
    canChooseReplacement(state, playerId, instanceId)
  );
}

/**
 * First effect instruction: reveal the opponent's Reserve only.
 * Its exact identities are disclosed to the effect controller, not published.
 */
export function revealInterceptedOrdersOpposingReserve(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): string[] {
  assertSource(state, owner, sourceInstanceId);
  const opponent = opposingPlayer(owner);
  const cards = [...state.battleRuntime!.participants[opponent].reserve];
  appendV070Event(state, {
    type: 'intercepted_orders_reserve_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: INTERCEPTED_ORDERS_CARD_ID,
      opponent,
      count: cards.length,
    },
  });
  appendV070Event(state, {
    type: 'intercepted_orders_reserve_identity',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      opponent,
      cardInstanceIds: cards,
    },
  });
  return cards;
}

/** Complete the effect when the opponent committed no Tactic to return. */
export function completeInterceptedOrdersWithoutTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  assertSource(state, owner, sourceInstanceId);
  if (interceptedOrdersTacticTargets(state, owner).length > 0) {
    throw new V070GameActionError(
      'Intercepted Orders still has an opposing Tactic to return.',
    );
  }
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'intercepted_orders_no_opposing_tactic',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: INTERCEPTED_ORDERS_CARD_ID,
    },
  });
}

/**
 * Resolve an explicitly selected committed Tactic. Do not negate its effect:
 * the card says Return, not Negate; earlier effects are never unwound.
 */
export function returnInterceptedOrdersTactic(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): InterceptedOrdersReturn {
  assertSource(state, owner, sourceInstanceId);
  if (!interceptedOrdersTacticTargets(state, owner).includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Intercepted Orders must return a currently committed opposing Tactic.',
    );
  }

  const runtime = state.battleRuntime!;
  const targetOwner = opposingPlayer(owner);
  const participant = runtime.participants[targetOwner];
  let slot: ReplacementSlot;
  if (participant.tactic?.instanceId === targetInstanceId) {
    slot = { kind: 'normal' };
    participant.tactic = null;
  } else {
    const index = participant.additionalTactics.findIndex(
      item => item.instanceId === targetInstanceId,
    );
    if (index < 0) {
      throw new V070GameActionError('The selected Tactic is no longer in battle.');
    }
    slot = { kind: 'additional', index };
    participant.additionalTactics.splice(index, 1);
  }

  if (!participant.reserve.includes(targetInstanceId)) {
    participant.reserve.push(targetInstanceId);
  }
  runtime.interceptedOrdersBarredInstanceIds ??= [];
  if (!runtime.interceptedOrdersBarredInstanceIds.includes(targetInstanceId)) {
    runtime.interceptedOrdersBarredInstanceIds.push(targetInstanceId);
  }

  appendV070Event(state, {
    type: 'intercepted_orders_tactic_returned',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: INTERCEPTED_ORDERS_CARD_ID,
      targetInstanceId,
      targetOwner,
      destination: 'reserve',
      barredForBattle: true,
    },
  });
  return {
    sourceInstanceId,
    sourceOwner: owner,
    targetOwner,
    targetInstanceId,
    slot,
    replacementCandidateInstanceIds:
      interceptedOrdersReplacementCandidates(state, targetOwner),
  };
}

/**
 * Substitute into the vacated commitment slot. The returned card is barred.
 * Per the approved designer ruling, replacements enter play face up.
 * The caller must process only effects whose timing remains available
 * in the current reveal scheduler; this helper does NOT reopen a stage.
 */
export function chooseInterceptedOrdersReplacement(
  state: V070GameState,
  resolution: InterceptedOrdersReturn,
  instanceId?: string,
): V070BattleCardCommitment | null {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError('Intercepted Orders battle no longer exists.');
  }
  if (instanceId === undefined) {
    markV070BattleCardEffectApplied(state, resolution.sourceInstanceId);
    return null;
  }
  if (!resolution.replacementCandidateInstanceIds.includes(instanceId)
    || !canChooseReplacement(state, resolution.targetOwner, instanceId)) {
    throw new V070GameActionError(
      'Replacement must be an eligible Tactic from Reserve; the returned card is barred.',
    );
  }
  const participant = runtime.participants[resolution.targetOwner];
  if (resolution.slot.kind === 'normal' && participant.tactic) {
    throw new V070GameActionError('The replaced normal Tactic slot is occupied.');
  }
  const index = participant.reserve.indexOf(instanceId);
  participant.reserve.splice(index, 1);

  // The approved ruling fixes the replacement's face state. It does not
  // independently authorize effects at timings that have already passed.
  const replacement: V070BattleCardCommitment = {
    instanceId,
    owner: resolution.targetOwner,
    role: 'tactic',
    faceUp: true,
  };
  if (resolution.slot.kind === 'normal') {
    participant.tactic = replacement;
  } else {
    participant.additionalTactics.splice(resolution.slot.index, 0, replacement);
  }
  markV070BattleCardEffectApplied(state, resolution.sourceInstanceId);
  appendV070Event(state, {
    type: 'intercepted_orders_replacement_chosen',
    actor: resolution.targetOwner,
    visibility: 'public',
    payload: {
      sourceInstanceId: resolution.sourceInstanceId,
      cardInstanceId: instanceId,
      cardId: state.cardInstances[instanceId]?.cardId ?? null,
      faceUp: true,
      role: 'tactic',
    },
  });
  return replacement;
}
