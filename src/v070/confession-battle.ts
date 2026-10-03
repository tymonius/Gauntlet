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

export const V070_CONFESSION_ID = 'inquisition-confession' as const;
export const V070_CONFESSION_BATTLE_TEXT =
  'After Tactics are chosen, before they are normally revealed, reveal this card if it is face down. Reveal one opposing face-down Tactic. You may return this card to your Reserve and choose another eligible Tactic from your Reserve face down.' as const;

export type V070ConfessionBattleChoice =
  | {
      kind: 'target';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'counterintelligence';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      targetInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'replacement';
      playerId: PlayerId;
      owner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingConfessionBattleChoice?: V070ConfessionBattleChoice | null;
    confessionPreRevealNextPlayer?: PlayerId | null;
  }
}

function validateAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const effect = content.cardsById.get(V070_CONFESSION_ID)?.effects.find(
      candidate => candidate.label === 'Tactic',
    );
    if (effect?.text !== V070_CONFESSION_BATTLE_TEXT) {
      throw new Error(
        'Confession Tactic text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

function tacticCommitments(state: V070GameState, playerId: PlayerId) {
  const participant = state.battleRuntime?.participants[playerId];
  if (!participant) return [];
  return [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
}

function liveConfessionSources(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return tacticCommitments(state, playerId)
    .filter(commitment =>
      state.cardInstances[commitment.instanceId]?.cardId === V070_CONFESSION_ID
      && !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

function nextConfessionPlayer(
  state: V070GameState,
  previousPlayer: PlayerId | null,
): PlayerId | null {
  const battle = state.battle;
  if (!battle) return null;
  const has = (playerId: PlayerId) =>
    liveConfessionSources(state, playerId).length > 0;

  if (previousPlayer === null) {
    if (has(battle.attacker)) return battle.attacker;
    if (has(battle.defender)) return battle.defender;
    return null;
  }

  const alternate =
    previousPlayer === battle.attacker
      ? battle.defender
      : battle.attacker;
  if (has(alternate)) return alternate;
  if (has(previousPlayer)) return previousPlayer;
  return null;
}

function opposingFaceDownTactics(
  state: V070GameState,
  owner: PlayerId,
): string[] {
  return tacticCommitments(state, otherPlayer(owner))
    .filter(commitment => !commitment.faceUp)
    .map(commitment => commitment.instanceId);
}

function tacticEligible(cardId: string | undefined): boolean {
  if (!cardId) return false;
  const card = v070CanonicalContent.cardsById.get(cardId);
  return card?.effects.some(effect =>
    effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
  ) ?? false;
}

function replacementCandidates(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const prohibited = new Set(runtime.disruptionProhibitedInstanceIds ?? []);
  return runtime.participants[owner].reserve.filter(instanceId =>
    instanceId !== sourceInstanceId
    && !prohibited.has(instanceId)
    && tacticEligible(state.cardInstances[instanceId]?.cardId)
  );
}

function revealConfessionSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const commitment = v070BattleCommitment(state, sourceInstanceId);
  if (!commitment
    || commitment.owner !== owner
    || commitment.role !== 'tactic'
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_CONFESSION_ID) {
    throw new V070GameActionError(
      'Confession source must still be an eligible Tactic in this battle.',
    );
  }

  if (!commitment.faceUp) {
    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: sourceInstanceId,
      sourceKind: 'effect',
      sourceController: owner,
      sourceInstanceId,
      sourceId: V070_CONFESSION_ID,
    });
  }

  appendV070Event(state, {
    type: 'confession_battle_source_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_CONFESSION_ID,
    },
  });
}

function openTargetChoice(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  candidateInstanceIds: string[],
): void {
  const runtime = state.battleRuntime!;
  runtime.pendingConfessionBattleChoice = {
    kind: 'target',
    playerId: owner,
    owner,
    sourceInstanceId,
    candidateInstanceIds: [...candidateInstanceIds],
  };
  appendV070Event(state, {
    type: 'confession_battle_target_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      candidateCount: candidateInstanceIds.length,
    },
  });
  appendV070Event(state, {
    type: 'confession_battle_target_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      candidateInstanceIds: [...candidateInstanceIds],
    },
  });
}

function finishSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  const runtime = state.battleRuntime!;
  runtime.pendingConfessionBattleChoice = null;
  runtime.confessionPreRevealNextPlayer =
    nextConfessionPlayer(state, owner);
}

function openReplacementOrFinish(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const candidates = replacementCandidates(
    state,
    owner,
    sourceInstanceId,
  );
  if (candidates.length === 0) {
    appendV070Event(state, {
      type: 'confession_battle_replacement_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_CONFESSION_ID,
      },
    });
    finishSource(state, owner, sourceInstanceId);
    return;
  }

  state.battleRuntime!.pendingConfessionBattleChoice = {
    kind: 'replacement',
    playerId: owner,
    owner,
    sourceInstanceId,
    candidateInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'confession_battle_replacement_choice_pending',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'confession_battle_replacement_choice_options',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      candidateInstanceIds: [...candidates],
    },
  });
}

function revealTargetOrContinue(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const opponent = otherPlayer(owner);
  const target = v070BattleCommitment(state, targetInstanceId);
  if (!target
    || target.owner !== opponent
    || target.role !== 'tactic'
    || target.faceUp) {
    throw new V070GameActionError(
      'Confession must reveal an opposing face-down Tactic.',
    );
  }

  if (preventV070OpposingBattleCardReveal(
    state,
    owner,
    opponent,
    {
      purpose: 'Confession',
      sourceInstanceId,
      targetInstanceId,
      role: 'tactic',
    },
  )) {
    appendV070Event(state, {
      type: 'confession_battle_target_reveal_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        targetInstanceId,
        preventedBy: 'Counterintelligence Asset',
      },
    });
    openReplacementOrFinish(state, owner, sourceInstanceId);
    return;
  }

  const reactions =
    eligibleV070CounterintelligenceBattleReactions(
      state,
      opponent,
      'tactic',
    );
  if (reactions.length > 1) {
    state.battleRuntime!.pendingConfessionBattleChoice = {
      kind: 'counterintelligence',
      playerId: opponent,
      owner,
      sourceInstanceId,
      targetInstanceId,
      candidateInstanceIds: [...reactions],
    };
    appendV070Event(state, {
      type: 'confession_counterintelligence_choice_pending',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        candidateCount: reactions.length,
      },
    });
    appendV070Event(state, {
      type: 'confession_counterintelligence_choice_options',
      actor: opponent,
      visibility: opponent,
      payload: {
        sourceInstanceId,
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
        opposingSourceCardId: V070_CONFESSION_ID,
        targetInstanceId,
        role: 'tactic',
      },
    );
    appendV070Event(state, {
      type: 'confession_battle_effect_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        counterintelligenceInstanceId: reactions[0],
      },
    });
    finishSource(state, owner, sourceInstanceId);
    return;
  }

  revealV070BattleCommitmentEarly(state, {
    targetInstanceId,
    sourceKind: 'effect',
    sourceController: owner,
    sourceInstanceId,
    sourceId: V070_CONFESSION_ID,
  });
  appendV070Event(state, {
    type: 'confession_battle_target_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      opponent,
    },
  });
  openReplacementOrFinish(state, owner, sourceInstanceId);
}

function beginSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  revealConfessionSource(state, owner, sourceInstanceId);
  const targets = opposingFaceDownTactics(state, owner);
  if (targets.length > 1) {
    openTargetChoice(state, owner, sourceInstanceId, targets);
    return;
  }
  if (targets.length === 1) {
    revealTargetOrContinue(
      state,
      owner,
      sourceInstanceId,
      targets[0],
    );
    return;
  }

  appendV070Event(state, {
    type: 'confession_battle_no_face_down_target',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_CONFESSION_ID,
    },
  });
  openReplacementOrFinish(state, owner, sourceInstanceId);
}

export function pendingV070ConfessionBattleChoice(
  state: V070GameState,
): V070ConfessionBattleChoice | null {
  return state.battleRuntime?.pendingConfessionBattleChoice ?? null;
}

export function advanceV070ConfessionPreReveal(
  state: V070GameState,
): boolean {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== 'reveal_tactics') {
    return false;
  }
  if (runtime.pendingConfessionBattleChoice) return true;

  let nextPlayer =
    runtime.confessionPreRevealNextPlayer
    ?? nextConfessionPlayer(state, null);

  while (nextPlayer) {
    const sources = liveConfessionSources(state, nextPlayer);
    if (sources.length === 0) {
      nextPlayer = nextConfessionPlayer(state, nextPlayer);
      runtime.confessionPreRevealNextPlayer = nextPlayer;
      continue;
    }

    runtime.confessionPreRevealNextPlayer = nextPlayer;
    beginSource(state, nextPlayer, sources[0]);
    if (runtime.pendingConfessionBattleChoice) return true;
    nextPlayer = runtime.confessionPreRevealNextPlayer ?? null;
  }

  runtime.confessionPreRevealNextPlayer = null;
  return false;
}

function replaceConfession(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  replacementInstanceId: string,
): void {
  const runtime = state.battleRuntime!;
  const participant = runtime.participants[owner];
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source || source.owner !== owner || source.role !== 'tactic') {
    throw new V070GameActionError(
      'Confession is no longer available to return to Reserve.',
    );
  }

  const candidates = replacementCandidates(
    state,
    owner,
    sourceInstanceId,
  );
  if (!candidates.includes(replacementInstanceId)) {
    throw new V070GameActionError(
      'That card is not an eligible Confession replacement Tactic.',
    );
  }

  const reserveIndex = participant.reserve.indexOf(replacementInstanceId);
  if (reserveIndex < 0) {
    throw new V070GameActionError(
      'The Confession replacement must still be in Reserve.',
    );
  }

  const replacement = {
    instanceId: replacementInstanceId,
    owner,
    role: 'tactic' as const,
    faceUp: false,
  };

  if (participant.tactic?.instanceId === sourceInstanceId) {
    participant.tactic = replacement;
  } else {
    const index = participant.additionalTactics.findIndex(
      candidate => candidate.instanceId === sourceInstanceId,
    );
    if (index < 0) {
      throw new V070GameActionError(
        'Confession is no longer committed as a Tactic.',
      );
    }
    participant.additionalTactics[index] = replacement;
  }

  participant.reserve.splice(reserveIndex, 1);
  participant.reserve.push(sourceInstanceId);

  appendV070Event(state, {
    type: 'confession_battle_replaced',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_CONFESSION_ID,
      replacementFaceDown: true,
    },
  });
  appendV070Event(state, {
    type: 'confession_battle_replacement_identity',
    actor: owner,
    visibility: owner,
    payload: {
      sourceInstanceId,
      replacementInstanceId,
      replacementCardId:
        state.cardInstances[replacementInstanceId]?.cardId ?? null,
    },
  });
}

export function resolveV070ConfessionBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const pending = pendingV070ConfessionBattleChoice(state);
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'No Confession battle choice is pending for that player.',
    );
  }

  state.battleRuntime!.pendingConfessionBattleChoice = null;

  if (pending.kind === 'target') {
    if (!cardInstanceId
      || !pending.candidateInstanceIds.includes(cardInstanceId)) {
      throw new V070GameActionError(
        'Choose one of the opposing face-down Tactics revealed by Confession.',
      );
    }
    revealTargetOrContinue(
      state,
      pending.owner,
      pending.sourceInstanceId,
      cardInstanceId,
    );
    return;
  }

  if (pending.kind === 'counterintelligence') {
    if (!cardInstanceId
      || !pending.candidateInstanceIds.includes(cardInstanceId)) {
      throw new V070GameActionError(
        'Choose an eligible Counterintelligence to prevent Confession.',
      );
    }
    applyV070CounterintelligenceBattleReaction(
      state,
      playerId,
      cardInstanceId,
      {
        opposingPlayer: pending.owner,
        opposingSourceInstanceId: pending.sourceInstanceId,
        opposingSourceCardId: V070_CONFESSION_ID,
        targetInstanceId: pending.targetInstanceId,
        role: 'tactic',
      },
    );
    appendV070Event(state, {
      type: 'confession_battle_effect_prevented',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        counterintelligenceInstanceId: cardInstanceId,
      },
    });
    finishSource(
      state,
      pending.owner,
      pending.sourceInstanceId,
    );
    return;
  }

  if (cardInstanceId === undefined) {
    appendV070Event(state, {
      type: 'confession_battle_replacement_declined',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
      },
    });
    finishSource(
      state,
      pending.owner,
      pending.sourceInstanceId,
    );
    return;
  }

  if (!pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'That card was not an eligible Confession replacement.',
    );
  }
  replaceConfession(
    state,
    pending.owner,
    pending.sourceInstanceId,
    cardInstanceId,
  );
  finishSource(
    state,
    pending.owner,
    pending.sourceInstanceId,
  );
}
