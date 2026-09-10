import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
  negateV070BattleCardEffect,
  v070BattleCommitment,
} from './battle-effect-status';
import { restrictV070BattleTargetsByDecoys } from './decoys-battle';

export const V070_TYRANNY_ID = 'inquisition-tyranny' as const;
export const V070_TYRANNY_BATTLE_TEXT =
  'Negate one opposing Gambit or Tactic that has not taken effect.' as const;
export const V070_SABOTAGE_ID = 'neutral-sabotage' as const;
export const V070_SABOTAGE_BATTLE_TEXT =
  "Choose one opposing Gambit or Tactic at that stage that has not taken effect. Negate it and put it in its owner's Discard Pile immediately." as const;

export type V070BattleNegationSourceCardId =
  | typeof V070_TYRANNY_ID
  | typeof V070_SABOTAGE_ID;

export interface V070BattleNegationChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  sourceCardId: V070BattleNegationSourceCardId;
  role: 'gambit' | 'tactic';
  discardTargetImmediately: boolean;
  candidateInstanceIds: string[];
}

function assertReleasedText(
  cardId: V070BattleNegationSourceCardId,
  expectedText: string,
): void {
  const card = v070CanonicalContent.cardsById.get(cardId);
  const effect = card?.effects.find(entry => entry.label === 'Gambit/Tactic');
  if (!card || effect?.text !== expectedText) {
    throw new Error(
      `Released v0.7.0 ${cardId} battle text no longer matches executable authority.`,
    );
  }
}

assertReleasedText(V070_TYRANNY_ID, V070_TYRANNY_BATTLE_TEXT);
assertReleasedText(V070_SABOTAGE_ID, V070_SABOTAGE_BATTLE_TEXT);

export function registerV070TyrannyBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  registerBattleNegation(
    state,
    owner,
    sourceInstanceId,
    V070_TYRANNY_ID,
    role,
    false,
  );
}

export function registerV070SabotageBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  registerBattleNegation(
    state,
    owner,
    sourceInstanceId,
    V070_SABOTAGE_ID,
    role,
    true,
  );
}

export function pendingV070BattleNegationChoice(
  state: V070GameState,
): V070BattleNegationChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'battle_negation' ? pending : null;
}

export function openV070BattleNegationChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070BattleNegationChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    eligibleV070BattleNegationTargets(
      state,
      pending.owner,
      pending.sourceCardId,
      pending.role,
    ).includes(instanceId)
  );

  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'battle_negation');
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    appendV070Event(state, {
      type: 'battle_negation_no_eligible_target',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: pending.sourceCardId,
        opponent: pending.opponent,
        revealRole: pending.role,
        reason: 'eligible_targets_no_longer_available',
      },
    });
    return false;
  }

  if (available.length === 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'battle_negation');
    resolveBattleNegationTarget(
      state,
      pending.owner,
      pending.sourceInstanceId,
      pending.sourceCardId,
      pending.role,
      pending.discardTargetImmediately,
      available[0],
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'battle_negation_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: pending.sourceCardId,
      revealRole: pending.role,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'battle_negation_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: pending.sourceCardId,
      revealRole: pending.role,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070BattleNegationChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070BattleNegationChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError('No Tyranny or Sabotage battle choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Tyranny or Sabotage owner may choose the opposing battle card.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !eligibleV070BattleNegationTargets(
      state,
      playerId,
      pending.sourceCardId,
      pending.role,
    ).includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Tyranny or Sabotage must choose an eligible opposing Gambit or Tactic whose effect has not taken effect.',
    );
  }

  completeV070BattleRevealChoice(state, 'battle_negation');
  resolveBattleNegationTarget(
    state,
    playerId,
    pending.sourceInstanceId,
    pending.sourceCardId,
    pending.role,
    pending.discardTargetImmediately,
    targetInstanceId,
  );
}

/**
 * Sabotage explicitly says "at that stage", so it may target only the current
 * reveal role. Tyranny omits that restriction: once Tactics reveal, an earlier
 * Gambit whose deferred effect has not yet taken effect remains a legal target.
 */
export function eligibleV070BattleNegationTargets(
  state: V070GameState,
  owner: PlayerId,
  sourceCardId: V070BattleNegationSourceCardId,
  sourceRole: 'gambit' | 'tactic',
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const gambits = [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
  ];
  const tactics = [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
  const commitments = sourceCardId === V070_SABOTAGE_ID
    ? (sourceRole === 'gambit' ? gambits : tactics)
    : [...gambits, ...tactics];

  const eligible = commitments
    .filter(commitment =>
      !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
  return restrictV070BattleTargetsByDecoys(state, opponent, eligible);
}

function registerBattleNegation(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070BattleNegationSourceCardId,
  role: 'gambit' | 'tactic',
  discardTargetImmediately: boolean,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Tyranny and Sabotage battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== sourceCardId) {
    throw new V070GameActionError(
      'Tyranny or Sabotage battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const eligible = eligibleV070BattleNegationTargets(
    state,
    owner,
    sourceCardId,
    role,
  );
  if (eligible.length === 0) {
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'battle_negation_no_eligible_target',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId,
        opponent,
        revealRole: role,
      },
    });
    return;
  }

  if (eligible.length === 1) {
    resolveBattleNegationTarget(
      state,
      owner,
      sourceInstanceId,
      sourceCardId,
      role,
      discardTargetImmediately,
      eligible[0],
    );
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'battle_negation',
    owner,
    opponent,
    sourceInstanceId,
    sourceCardId,
    role,
    discardTargetImmediately,
    candidateInstanceIds: eligible,
  });
}

function resolveBattleNegationTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: V070BattleNegationSourceCardId,
  role: 'gambit' | 'tactic',
  discardTargetImmediately: boolean,
  targetInstanceId: string,
): void {
  const target = v070BattleCommitment(state, targetInstanceId);
  if (!target
    || (sourceCardId === V070_SABOTAGE_ID && target.role !== role)) {
    throw new V070GameActionError(
      sourceCardId === V070_SABOTAGE_ID
        ? 'The Sabotage target is no longer a battle card at this reveal stage.'
        : 'The Tyranny target is no longer an eligible opposing battle card.',
    );
  }

  negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    sourceCardId,
  );
  if (discardTargetImmediately) {
    moveCommitmentToDiscardImmediately(state, target);
  }
  markV070BattleCardEffectApplied(state, sourceInstanceId);

  appendV070Event(state, {
    type: discardTargetImmediately
      ? 'sabotage_battle_card_negated_and_discarded'
      : 'tyranny_battle_card_negated',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      targetOwner: target.owner,
      targetRole: target.role,
      destination: discardTargetImmediately ? 'discard' : 'battle',
    },
  });
}

function moveCommitmentToDiscardImmediately(
  state: V070GameState,
  target: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  const participant = runtime.participants[target.owner];

  if (target.role === 'gambit') {
    if (participant.gambit?.instanceId === target.instanceId) {
      participant.gambit = null;
    }
    participant.additionalGambits = participant.additionalGambits.filter(
      commitment => commitment.instanceId !== target.instanceId,
    );
  } else {
    if (participant.tactic?.instanceId === target.instanceId) {
      participant.tactic = null;
    }
    participant.additionalTactics = participant.additionalTactics.filter(
      commitment => commitment.instanceId !== target.instanceId,
    );
    participant.reserve = participant.reserve.filter(
      instanceId => instanceId !== target.instanceId,
    );
  }

  const zones = state.players[target.owner].zones;
  zones.hand = zones.hand.filter(instanceId => instanceId !== target.instanceId);
  zones.graveyard = zones.graveyard.filter(instanceId => instanceId !== target.instanceId);
  if (!zones.discardPile.includes(target.instanceId)) {
    zones.discardPile.push(target.instanceId);
  }
}
