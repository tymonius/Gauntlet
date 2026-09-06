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

export const V070_DISRUPTION_ID = 'neutral-disruption' as const;
export const V070_DISRUPTION_BATTLE_TEXT =
  "Choose one opposing Gambit or Tactic at that stage that has not taken effect. Negate it. Return a Gambit to its owner's Hand or a Tactic to its owner's Reserve. That specific card cannot be set or chosen again during this battle." as const;

export interface V070DisruptionBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  role: 'gambit' | 'tactic';
  candidateInstanceIds: string[];
}

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Exact instances returned by Disruption and barred for the rest of this battle. */
    disruptionProhibitedInstanceIds?: string[];
  }
}

function validateV070DisruptionAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_DISRUPTION_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_DISRUPTION_BATTLE_TEXT) {
    throw new Error('v0.7.0 Disruption battle text drifted from released authority.');
  }
}

validateV070DisruptionAuthority();

export function registerV070DisruptionBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Disruption battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_DISRUPTION_ID) {
    throw new V070GameActionError(
      'Disruption battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const eligible = eligibleV070DisruptionTargets(state, owner, role);
  if (eligible.length === 0) {
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'disruption_battle_no_eligible_target',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_DISRUPTION_ID,
        opponent,
        revealRole: role,
      },
    });
    return;
  }
  if (eligible.length === 1) {
    resolveDisruptionTarget(state, owner, sourceInstanceId, role, eligible[0]);
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'disruption',
    owner,
    opponent,
    sourceInstanceId,
    role,
    candidateInstanceIds: eligible,
  });
}

export function pendingV070DisruptionBattleChoice(
  state: V070GameState,
): V070DisruptionBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'disruption' ? pending : null;
}

export function openV070DisruptionBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070DisruptionBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    eligibleV070DisruptionTargets(state, pending.owner, pending.role)
      .includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'disruption');
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    appendV070Event(state, {
      type: 'disruption_battle_no_eligible_target',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_DISRUPTION_ID,
        opponent: pending.opponent,
        revealRole: pending.role,
        reason: 'eligible_targets_no_longer_available',
      },
    });
    return false;
  }
  if (available.length === 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'disruption');
    resolveDisruptionTarget(
      state,
      pending.owner,
      pending.sourceInstanceId,
      pending.role,
      available[0],
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'disruption_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_DISRUPTION_ID,
      revealRole: pending.role,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'disruption_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      revealRole: pending.role,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070DisruptionBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070DisruptionBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError('No Disruption battle choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Disruption owner may choose the battle card to negate.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !eligibleV070DisruptionTargets(state, playerId, pending.role)
      .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Disruption must choose an opposing card at this reveal stage whose effect has not taken effect.',
    );
  }

  completeV070BattleRevealChoice(state, 'disruption');
  resolveDisruptionTarget(
    state,
    playerId,
    pending.sourceInstanceId,
    pending.role,
    targetInstanceId,
  );
}

export function eligibleV070DisruptionTargets(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const commitments = role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];

  return commitments
    .filter(commitment =>
      commitment.role === role
      && !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

export function assertV070DisruptionBattleCardMayBeChosen(
  state: V070GameState,
  instanceId: string | undefined,
): void {
  if (!instanceId) return;
  if (state.battleRuntime?.disruptionProhibitedInstanceIds?.includes(instanceId)) {
    throw new V070GameActionError(
      'A card returned by Disruption cannot be set or chosen again during this battle.',
    );
  }
}

function resolveDisruptionTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
  targetInstanceId: string,
): void {
  const target = v070BattleCommitment(state, targetInstanceId);
  if (!target || target.role !== role) {
    throw new V070GameActionError(
      'Disruption target is no longer a battle card at this reveal stage.',
    );
  }

  negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    V070_DISRUPTION_ID,
  );
  returnDisruptedCommitment(state, target);

  const runtime = state.battleRuntime!;
  runtime.disruptionProhibitedInstanceIds ??= [];
  if (!runtime.disruptionProhibitedInstanceIds.includes(targetInstanceId)) {
    runtime.disruptionProhibitedInstanceIds.push(targetInstanceId);
  }
  markV070BattleCardEffectApplied(state, sourceInstanceId);

  appendV070Event(state, {
    type: 'disruption_battle_card_returned',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_DISRUPTION_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      targetOwner: target.owner,
      targetRole: role,
      destination: role === 'gambit' ? 'hand' : 'reserve',
      prohibitedForBattle: true,
    },
  });
}

function returnDisruptedCommitment(
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
    const hand = state.players[target.owner].zones.hand;
    if (!hand.includes(target.instanceId)) hand.push(target.instanceId);
    return;
  }

  if (participant.tactic?.instanceId === target.instanceId) {
    participant.tactic = null;
  }
  participant.additionalTactics = participant.additionalTactics.filter(
    commitment => commitment.instanceId !== target.instanceId,
  );
  if (!participant.reserve.includes(target.instanceId)) {
    participant.reserve.push(target.instanceId);
  }
}
