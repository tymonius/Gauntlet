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

export const V070_PALISADE_WALL_ID = 'neutral-palisade-wall' as const;
export const V070_PALISADE_WALL_BATTLE_TEXT =
  'If you are the defender, negate one opposing Gambit that has not taken effect. If there is no eligible Gambit, gain Advantage instead.' as const;

export interface V070PalisadeWallBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070PalisadeWallAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_PALISADE_WALL_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_PALISADE_WALL_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Palisade Wall battle text drifted from released authority.',
    );
  }
}

validateV070PalisadeWallAuthority();

export function registerV070PalisadeWallBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Palisade Wall battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_PALISADE_WALL_ID) {
    throw new V070GameActionError(
      'Palisade Wall battle source does not match the revealed card instance.',
    );
  }

  if (battle.defender !== owner) {
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'palisade_wall_battle_inapplicable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_PALISADE_WALL_ID,
        reason: 'owner_not_defender',
      },
    });
    return;
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = eligibleV070PalisadeWallGambits(state, owner);
  if (candidates.length === 0) {
    gainPalisadeWallAdvantage(state, owner, sourceInstanceId, 'no_eligible_gambit');
    return;
  }
  if (candidates.length === 1) {
    negatePalisadeWallTarget(state, owner, sourceInstanceId, candidates[0]);
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'palisade_wall',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  });
}

export function pendingV070PalisadeWallBattleChoice(
  state: V070GameState,
): V070PalisadeWallBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'palisade_wall' ? pending : null;
}

export function openV070PalisadeWallBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070PalisadeWallBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    eligibleV070PalisadeWallGambits(state, pending.owner).includes(instanceId)
  );

  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'palisade_wall');
    gainPalisadeWallAdvantage(
      state,
      pending.owner,
      pending.sourceInstanceId,
      'eligible_gambits_no_longer_available',
    );
    return false;
  }
  if (available.length === 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'palisade_wall');
    negatePalisadeWallTarget(
      state,
      pending.owner,
      pending.sourceInstanceId,
      available[0],
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'palisade_wall_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PALISADE_WALL_ID,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'palisade_wall_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070PalisadeWallBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070PalisadeWallBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Palisade Wall battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Palisade Wall owner may choose the opposing Gambit to negate.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !eligibleV070PalisadeWallGambits(state, playerId)
      .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Palisade Wall must choose an opposing Gambit whose effect has not taken effect.',
    );
  }

  completeV070BattleRevealChoice(state, 'palisade_wall');
  negatePalisadeWallTarget(
    state,
    playerId,
    pending.sourceInstanceId,
    targetInstanceId,
  );
}

export function eligibleV070PalisadeWallGambits(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const gambits = [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
  ];

  return gambits
    .filter(commitment =>
      !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

function negatePalisadeWallTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    V070_PALISADE_WALL_ID,
  );
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'palisade_wall_battle_gambit_negated',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_PALISADE_WALL_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
    },
  });
}

function gainPalisadeWallAdvantage(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  reason: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Palisade Wall Advantage requires an active battle runtime.',
    );
  }
  runtime.participants[owner].advantage += 1;
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'palisade_wall_battle_advantage_gained',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_PALISADE_WALL_ID,
      advantageGained: 1,
      reason,
    },
  });
}
