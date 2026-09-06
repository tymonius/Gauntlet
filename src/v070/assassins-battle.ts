import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
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
} from './battle-effect-status';

export const V070_ASSASSINS_ID = 'intelligence-assassins' as const;
export const V070_ASSASSINS_BATTLE_TEXT =
  'Negate one opposing Gambit. If the opponent set no Gambit, the opponent gains Disadvantage.' as const;

export interface V070AssassinsBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070AssassinsAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_ASSASSINS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_ASSASSINS_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Assassins battle text drifted from released authority.',
    );
  }
}

validateV070AssassinsAuthority();

export function registerV070AssassinsBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Assassins battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_ASSASSINS_ID) {
    throw new V070GameActionError(
      'Assassins battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const opposingGambits = opposingV070AssassinsGambits(state, owner);
  if (opposingGambits.length === 0) {
    runtime.participants[opponent].disadvantage += 1;
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'assassins_battle_disadvantage_applied',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ASSASSINS_ID,
        targetPlayer: opponent,
        disadvantageGained: 1,
        reason: 'opponent_set_no_gambit',
      },
    });
    return;
  }

  const eligible = eligibleV070AssassinsGambits(state, owner);
  if (eligible.length === 0) {
    // The fallback is specifically "set no Gambit," not "no eligible Gambit."
    // If a Gambit existed but its effect already took effect (or was negated),
    // complete as much as possible without applying Disadvantage.
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'assassins_battle_no_eligible_gambit',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ASSASSINS_ID,
        opponent,
        reason: 'opponent_gambit_already_resolved_or_negated',
      },
    });
    return;
  }
  if (eligible.length === 1) {
    negateAssassinsTarget(state, owner, sourceInstanceId, eligible[0]);
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'assassins',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: eligible,
  });
}

export function pendingV070AssassinsBattleChoice(
  state: V070GameState,
): V070AssassinsBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'assassins' ? pending : null;
}

export function openV070AssassinsBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070AssassinsBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    eligibleV070AssassinsGambits(state, pending.owner).includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'assassins');
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    appendV070Event(state, {
      type: 'assassins_battle_no_eligible_gambit',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_ASSASSINS_ID,
        opponent: pending.opponent,
        reason: 'eligible_gambits_no_longer_available',
      },
    });
    return false;
  }
  if (available.length === 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'assassins');
    negateAssassinsTarget(
      state,
      pending.owner,
      pending.sourceInstanceId,
      available[0],
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'assassins_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_ASSASSINS_ID,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'assassins_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070AssassinsBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070AssassinsBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError('No Assassins battle choice is pending.');
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Assassins owner may choose the opposing Gambit to negate.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !eligibleV070AssassinsGambits(state, playerId)
      .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Assassins must choose an opposing Gambit whose effect has not taken effect.',
    );
  }

  completeV070BattleRevealChoice(state, 'assassins');
  negateAssassinsTarget(
    state,
    playerId,
    pending.sourceInstanceId,
    targetInstanceId,
  );
}

export function opposingV070AssassinsGambits(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  return [
    ...(participant.gambit ? [participant.gambit.instanceId] : []),
    ...participant.additionalGambits.map(commitment => commitment.instanceId),
  ];
}

export function eligibleV070AssassinsGambits(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  return opposingV070AssassinsGambits(state, owner).filter(instanceId =>
    !isV070BattleCardEffectNegated(state, instanceId)
    && !hasV070BattleCardEffectApplied(state, instanceId)
  );
}

function negateAssassinsTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    V070_ASSASSINS_ID,
  );
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'assassins_battle_gambit_negated',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ASSASSINS_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
    },
  });
}
