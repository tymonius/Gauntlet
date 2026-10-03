import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
  v070BattleCommitment,
} from './battle-effect-status';
import { revealV070BattleCommitmentEarly } from './battle-early-reveal';
import {
  preventV070OpposingBattleCardReveal,
} from './counterintelligence';
import {
  applyV070CounterintelligenceBattleReaction,
  eligibleV070CounterintelligenceBattleReactions,
} from './counterintelligence-battle';

export const V070_SCOUTING_REPORT_ID = 'neutral-scouting-report' as const;
export const V070_SCOUTING_REPORT_BATTLE_TEXT =
  'Reveal one opposing face-down Gambit or Tactic at the same stage. You may replace this card with an eligible card from your Reserve, face up. If you replace it, put this card in your Graveyard.' as const;

export type V070ScoutingReportBattleChoice =
  | {
      kind: 'target';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      role: 'gambit' | 'tactic';
      candidateInstanceIds: string[];
    }
  | {
      kind: 'counterintelligence';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      role: 'gambit' | 'tactic';
      targetInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'replacement';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      role: 'gambit' | 'tactic';
      candidateInstanceIds: string[];
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingScoutingReportBattleChoice?: V070ScoutingReportBattleChoice | null;
  }
}

function validateAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const effect = content.cardsById.get(V070_SCOUTING_REPORT_ID)?.effects.find(
      candidate => candidate.label === 'Gambit/Tactic',
    );
    if (effect?.text !== V070_SCOUTING_REPORT_BATTLE_TEXT) {
      throw new Error(
        'Scouting Report Gambit/Tactic text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function roleCommitments(
  state: V070GameState,
  playerId: PlayerId,
  role: 'gambit' | 'tactic',
) {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
}

export function v070ScoutingReportPreRevealSourceInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return roleCommitments(state, playerId, role)
    .filter(commitment =>
      state.cardInstances[commitment.instanceId]?.cardId
        === V070_SCOUTING_REPORT_ID
      && !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

function opposingFaceDownCards(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return roleCommitments(state, otherPlayer(owner), role)
    .filter(commitment => !commitment.faceUp)
    .map(commitment => commitment.instanceId);
}

function roleEligible(
  cardId: string | undefined,
  role: 'gambit' | 'tactic',
): boolean {
  if (!cardId) return false;
  const card = v070CanonicalContent.cardsById.get(cardId);
  return card?.effects.some(effect =>
    effect.label === 'Gambit/Tactic'
    || effect.label === (role === 'gambit' ? 'Gambit' : 'Tactic')
  ) ?? false;
}

function replacementCandidates(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const prohibited = new Set(runtime.disruptionProhibitedInstanceIds ?? []);
  return runtime.participants[owner].reserve.filter(instanceId =>
    instanceId !== sourceInstanceId
    && !prohibited.has(instanceId)
    && roleEligible(state.cardInstances[instanceId]?.cardId, role)
  );
}

function revealSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source
    || source.owner !== owner
    || source.role !== role
    || state.cardInstances[sourceInstanceId]?.cardId
      !== V070_SCOUTING_REPORT_ID) {
    throw new V070GameActionError(
      'Scouting Report source must still be committed in the current reveal stage.',
    );
  }
  if (!source.faceUp) {
    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: sourceInstanceId,
      sourceKind: 'effect',
      sourceController: owner,
      sourceInstanceId,
      sourceId: V070_SCOUTING_REPORT_ID,
    });
  }
  appendV070Event(state, {
    type: 'scouting_report_battle_source_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_SCOUTING_REPORT_ID,
      role,
    },
  });
}

function finishSource(
  state: V070GameState,
  sourceInstanceId: string,
): void {
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  if (state.battleRuntime) {
    state.battleRuntime.pendingScoutingReportBattleChoice = null;
  }
}

function openReplacementOrFinish(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  const candidates = replacementCandidates(
    state,
    owner,
    role,
    sourceInstanceId,
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'scouting_report_battle_replacement_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_SCOUTING_REPORT_ID,
        role,
      },
    });
    finishSource(state, sourceInstanceId);
    return;
  }

  state.battleRuntime!.pendingScoutingReportBattleChoice = {
    kind: 'replacement',
    playerId: owner,
    owner,
    sourceInstanceId,
    role,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'scouting_report_battle_replacement_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      role,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'scouting_report_battle_replacement_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      role,
      candidateInstanceIds: [...candidates],
    },
  });
}

function revealTargetOrContinue(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
  targetInstanceId: string,
): void {
  const opponent = otherPlayer(owner);
  const target = v070BattleCommitment(state, targetInstanceId);
  if (!target
    || target.owner !== opponent
    || target.role !== role
    || target.faceUp) {
    throw new V070GameActionError(
      'Scouting Report must reveal an opposing face-down card at the same stage.',
    );
  }

  if (preventV070OpposingBattleCardReveal(
    state,
    owner,
    opponent,
    {
      purpose: 'Scouting Report',
      sourceInstanceId,
      targetInstanceId,
      role,
    },
  )) {
    appendV070Event(state, {
      type: 'scouting_report_battle_target_reveal_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        targetInstanceId,
        role,
        preventedBy: 'Counterintelligence Asset',
      },
    });
    openReplacementOrFinish(
      state,
      owner,
      sourceInstanceId,
      role,
    );
    return;
  }

  const reactions =
    eligibleV070CounterintelligenceBattleReactions(
      state,
      opponent,
      role,
    );
  if (reactions.length > 1) {
    state.battleRuntime!.pendingScoutingReportBattleChoice = {
      kind: 'counterintelligence',
      playerId: opponent,
      owner,
      sourceInstanceId,
      role,
      targetInstanceId,
      candidateInstanceIds: [...reactions],
    };
    appendV070Event(state, {
      type: 'scouting_report_counterintelligence_choice_pending',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        role,
        candidateCount: reactions.length,
      },
    });
    appendV070Event(state, {
      type: 'scouting_report_counterintelligence_choice_options',
      actor: opponent,
      visibility: opponent,
      payload: {
        sourceInstanceId,
        role,
        targetInstanceId,
        candidateInstanceIds: [...reactions],
      },
    });
    return;
  }

  if (reactions.length === 1) {
    applyV070CounterintelligenceBattleReaction(
      state,
      opponent,
      reactions[0],
      {
        opposingPlayer: owner,
        opposingSourceInstanceId: sourceInstanceId,
        opposingSourceCardId: V070_SCOUTING_REPORT_ID,
        targetInstanceId,
        role,
      },
    );
    appendV070Event(state, {
      type: 'scouting_report_battle_effect_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        counterintelligenceInstanceId: reactions[0],
      },
    });
    finishSource(state, sourceInstanceId);
    return;
  }

  revealV070BattleCommitmentEarly(state, {
    targetInstanceId,
    sourceKind: 'effect',
    sourceController: owner,
    sourceInstanceId,
    sourceId: V070_SCOUTING_REPORT_ID,
  });
  appendV070Event(state, {
    type: 'scouting_report_battle_target_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      opponent,
      role,
    },
  });
  openReplacementOrFinish(
    state,
    owner,
    sourceInstanceId,
    role,
  );
}

export function beginV070ScoutingReportPreRevealSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  revealSource(state, owner, sourceInstanceId, role);
  const targets = opposingFaceDownCards(state, owner, role);
  if (targets.length > 1) {
    state.battleRuntime!.pendingScoutingReportBattleChoice = {
      kind: 'target',
      playerId: owner,
      owner,
      sourceInstanceId,
      role,
      candidateInstanceIds: [...targets],
    };
    appendV070Event(state, {
      type: 'scouting_report_battle_target_choice_pending',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        role,
        candidateCount: targets.length,
      },
    });
    appendV070Event(state, {
      type: 'scouting_report_battle_target_choice_options',
      actor: owner,
      visibility: owner,
      payload: {
        sourceInstanceId,
        role,
        candidateInstanceIds: [...targets],
      },
    });
    return;
  }
  if (targets.length === 1) {
    revealTargetOrContinue(
      state,
      owner,
      sourceInstanceId,
      role,
      targets[0],
    );
    return;
  }

  appendV070Event(state, {
    type: 'scouting_report_battle_no_face_down_target',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_SCOUTING_REPORT_ID,
      role,
    },
  });
  openReplacementOrFinish(
    state,
    owner,
    sourceInstanceId,
    role,
  );
}

export function pendingV070ScoutingReportBattleChoice(
  state: V070GameState,
): V070ScoutingReportBattleChoice | null {
  return state.battleRuntime?.pendingScoutingReportBattleChoice ?? null;
}

function replaceScoutingReport(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
  replacementInstanceId: string,
): void {
  const runtime = state.battleRuntime!;
  const participant = runtime.participants[owner];
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source || source.owner !== owner || source.role !== role) {
    throw new V070GameActionError(
      'Scouting Report is no longer available to replace.',
    );
  }

  const candidates = replacementCandidates(
    state,
    owner,
    role,
    sourceInstanceId,
  );
  if (!candidates.includes(replacementInstanceId)) {
    throw new V070GameActionError(
      'That Reserve card is not an eligible Scouting Report replacement.',
    );
  }

  const reserveIndex = participant.reserve.indexOf(replacementInstanceId);
  if (reserveIndex < 0) {
    throw new V070GameActionError(
      'The Scouting Report replacement must still be in Reserve.',
    );
  }

  const replacement = {
    instanceId: replacementInstanceId,
    owner,
    role,
    faceUp: true,
  };

  if (role === 'gambit') {
    if (participant.gambit?.instanceId === sourceInstanceId) {
      participant.gambit = replacement;
    } else {
      const index = participant.additionalGambits.findIndex(
        candidate => candidate.instanceId === sourceInstanceId,
      );
      if (index < 0) {
        throw new V070GameActionError(
          'Scouting Report is no longer committed as a Gambit.',
        );
      }
      participant.additionalGambits[index] = replacement;
    }
  } else if (participant.tactic?.instanceId === sourceInstanceId) {
    participant.tactic = replacement;
  } else {
    const index = participant.additionalTactics.findIndex(
      candidate => candidate.instanceId === sourceInstanceId,
    );
    if (index < 0) {
      throw new V070GameActionError(
        'Scouting Report is no longer committed as a Tactic.',
      );
    }
    participant.additionalTactics[index] = replacement;
  }

  participant.reserve.splice(reserveIndex, 1);
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  if (!state.players[owner].zones.graveyard.includes(sourceInstanceId)) {
    state.players[owner].zones.graveyard.push(sourceInstanceId);
  }

  // The replacement is expressly face up. Record its early public state now;
  // normal reveal-stage processing will later apply any timing that remains.
  revealV070BattleCommitmentEarly(state, {
    targetInstanceId: replacementInstanceId,
    sourceKind: 'effect',
    sourceController: owner,
    sourceInstanceId,
    sourceId: V070_SCOUTING_REPORT_ID,
  });

  appendV070Event(state, {
    type: 'scouting_report_battle_replaced',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_SCOUTING_REPORT_ID,
      replacementInstanceId,
      replacementCardId:
        state.cardInstances[replacementInstanceId]?.cardId ?? null,
      role,
      replacementFaceUp: true,
      sourceDestination: 'graveyard',
    },
  });
}

export function resolveV070ScoutingReportBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const pending = pendingV070ScoutingReportBattleChoice(state);
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Scouting Report battle choice is pending for that player.',
    );
  }

  state.battleRuntime!.pendingScoutingReportBattleChoice = null;

  if (pending.kind === 'target') {
    if (!cardInstanceId
      || !pending.candidateInstanceIds.includes(cardInstanceId)) {
      throw new V070GameActionError(
        'Choose one opposing face-down card at the Scouting Report stage.',
      );
    }
    revealTargetOrContinue(
      state,
      pending.owner,
      pending.sourceInstanceId,
      pending.role,
      cardInstanceId,
    );
    return;
  }

  if (pending.kind === 'counterintelligence') {
    if (!cardInstanceId
      || !pending.candidateInstanceIds.includes(cardInstanceId)) {
      throw new V070GameActionError(
        'Choose an eligible Counterintelligence to prevent Scouting Report.',
      );
    }
    applyV070CounterintelligenceBattleReaction(
      state,
      playerId,
      cardInstanceId,
      {
        opposingPlayer: pending.owner,
        opposingSourceInstanceId: pending.sourceInstanceId,
        opposingSourceCardId: V070_SCOUTING_REPORT_ID,
        targetInstanceId: pending.targetInstanceId,
        role: pending.role,
      },
    );
    appendV070Event(state, {
      type: 'scouting_report_battle_effect_prevented',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        counterintelligenceInstanceId: cardInstanceId,
      },
    });
    finishSource(state, pending.sourceInstanceId);
    return;
  }

  if (cardInstanceId === undefined) {
    appendV070Event(state, {
      type: 'scouting_report_battle_replacement_declined',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        role: pending.role,
      },
    });
    finishSource(state, pending.sourceInstanceId);
    return;
  }

  if (!pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'That card was not an eligible Scouting Report replacement.',
    );
  }
  replaceScoutingReport(
    state,
    pending.owner,
    pending.sourceInstanceId,
    pending.role,
    cardInstanceId,
  );
  state.battleRuntime!.pendingScoutingReportBattleChoice = null;
}
