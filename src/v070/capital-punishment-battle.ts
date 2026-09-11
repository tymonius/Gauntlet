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
  v070BattleCommitment,
} from './battle-effect-status';

export const V070_CAPITAL_PUNISHMENT_ID = 'neutral-capital-punishment' as const;
export const V070_CAPITAL_PUNISHMENT_BATTLE_TEXT =
  "Negate one opposing Gambit or Tactic that has not taken effect. In the Aftermath, if you win, put the chosen card in its owner's Graveyard." as const;

export interface V070CapitalPunishmentBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

export interface V070CapitalPunishmentPendingTarget {
  owner: PlayerId;
  sourceInstanceId: string;
  targetInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    capitalPunishmentPendingTargets?: V070CapitalPunishmentPendingTarget[];
    capitalPunishmentAftermathApplied?: boolean;
  }
}

function validateV070CapitalPunishmentAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_CAPITAL_PUNISHMENT_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_CAPITAL_PUNISHMENT_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Capital Punishment battle text drifted from released authority.',
    );
  }
}

validateV070CapitalPunishmentAuthority();

export function registerV070CapitalPunishmentBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Capital Punishment battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_CAPITAL_PUNISHMENT_ID) {
    throw new V070GameActionError(
      'Capital Punishment battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const eligible = eligibleV070CapitalPunishmentTargets(state, owner);
  if (eligible.length === 0) {
    markV070BattleCardEffectApplied(state, sourceInstanceId);
    appendV070Event(state, {
      type: 'capital_punishment_battle_no_eligible_target',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
        opponent,
      },
    });
    return;
  }
  if (eligible.length === 1) {
    resolveCapitalPunishmentTarget(
      state,
      owner,
      sourceInstanceId,
      eligible[0],
    );
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'capital_punishment',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: eligible,
  });
}

export function pendingV070CapitalPunishmentBattleChoice(
  state: V070GameState,
): V070CapitalPunishmentBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'capital_punishment' ? pending : null;
}

export function openV070CapitalPunishmentBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070CapitalPunishmentBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    eligibleV070CapitalPunishmentTargets(state, pending.owner)
      .includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'capital_punishment');
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    appendV070Event(state, {
      type: 'capital_punishment_battle_no_eligible_target',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
        opponent: pending.opponent,
        reason: 'eligible_targets_no_longer_available',
      },
    });
    return false;
  }
  if (available.length === 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'capital_punishment');
    resolveCapitalPunishmentTarget(
      state,
      pending.owner,
      pending.sourceInstanceId,
      available[0],
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'capital_punishment_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
      candidateCount: available.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'capital_punishment_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070CapitalPunishmentBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070CapitalPunishmentBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Capital Punishment battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Capital Punishment owner may choose the battle card to negate.',
    );
  }
  if (!pending.candidateInstanceIds.includes(targetInstanceId)
    || !eligibleV070CapitalPunishmentTargets(state, playerId)
      .includes(targetInstanceId)) {
    throw new V070GameActionError(
      'Capital Punishment must choose an opposing Gambit or Tactic whose effect has not taken effect.',
    );
  }

  completeV070BattleRevealChoice(state, 'capital_punishment');
  resolveCapitalPunishmentTarget(
    state,
    playerId,
    pending.sourceInstanceId,
    targetInstanceId,
  );
}

export function eligibleV070CapitalPunishmentTargets(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const participant = runtime.participants[opponent];
  const commitments = [
    ...(participant.gambit ? [participant.gambit] : []),
    ...participant.additionalGambits,
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];

  return commitments
    .filter(commitment =>
      !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

export function applyV070CapitalPunishmentAftermathEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.capitalPunishmentAftermathApplied) {
    return;
  }

  runtime.capitalPunishmentAftermathApplied = true;
  const pending = runtime.capitalPunishmentPendingTargets ?? [];
  runtime.capitalPunishmentPendingTargets = [];

  for (const effect of pending) {
    if (battle.winner !== effect.owner) continue;
    const target = v070BattleCommitment(state, effect.targetInstanceId);
    if (!target) continue;

    const existing = runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === target.owner
        && override.instanceId === effect.targetInstanceId,
    );
    if (existing) {
      existing.destination = 'graveyard';
      existing.sourceCardId = V070_CAPITAL_PUNISHMENT_ID;
    } else {
      runtime.battleCardAftermathDestinationOverrides.push({
        sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
        playerId: target.owner,
        instanceId: effect.targetInstanceId,
        destination: 'graveyard',
      });
    }

    appendV070Event(state, {
      type: 'capital_punishment_aftermath_graveyard_scheduled',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
        targetInstanceId: effect.targetInstanceId,
        targetCardId:
          state.cardInstances[effect.targetInstanceId]?.cardId ?? null,
        targetOwner: target.owner,
      },
    });
  }
}

function resolveCapitalPunishmentTarget(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  negateV070BattleCardEffect(
    state,
    targetInstanceId,
    sourceInstanceId,
    V070_CAPITAL_PUNISHMENT_ID,
  );
  const runtime = state.battleRuntime!;
  runtime.capitalPunishmentPendingTargets ??= [];
  runtime.capitalPunishmentPendingTargets.push({
    owner,
    sourceInstanceId,
    targetInstanceId,
  });
  markV070BattleCardEffectApplied(state, sourceInstanceId);

  appendV070Event(state, {
    type: 'capital_punishment_battle_card_negated',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_CAPITAL_PUNISHMENT_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
    },
  });
}
