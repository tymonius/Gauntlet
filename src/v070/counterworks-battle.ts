import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
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

export const V070_COUNTERWORKS_ID = 'neutral-counterworks' as const;
export const V070_COUNTERWORKS_BATTLE_TEXT =
  'Reveal one opposing face-down Gambit or Tactic at the same stage. You may replace this card with an eligible card from your Reserve, face up. If you replace it, put this card in your Graveyard.' as const;

export type V070CounterworksPreRevealChoice =
  | {
      kind: 'counterworks_source_order';
      playerId: PlayerId;
      role: 'gambit' | 'tactic';
      candidateInstanceIds: string[];
    }
  | {
      kind: 'counterworks_target';
      playerId: PlayerId;
      role: 'gambit' | 'tactic';
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'counterintelligence_pre_reveal';
      playerId: PlayerId;
      role: 'gambit' | 'tactic';
      opposingPlayer: PlayerId;
      opposingSourceInstanceId: string;
      targetInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'counterworks_replacement';
      playerId: PlayerId;
      role: 'gambit' | 'tactic';
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    };

export type V070CounterworksPreRevealAction =
  | {
      type: 'choose_counterworks_source';
      playerId: PlayerId;
      sourceInstanceId: string;
    }
  | {
      type: 'choose_counterworks_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'choose_counterintelligence_pre_reveal';
      playerId: PlayerId;
      counterintelligenceInstanceId: string;
    }
  | {
      type: 'resolve_counterworks_replacement';
      playerId: PlayerId;
      replacementInstanceId?: string;
    };

declare module './battle-types' {
  interface V070BattleRuntime {
    counterworksPreRevealRole?: 'gambit' | 'tactic' | null;
    counterworksPreRevealNextPlayer?: PlayerId | null;
    counterworksPreRevealChoice?: V070CounterworksPreRevealChoice | null;
    counterworksPreRevealReady?: boolean;
  }
}

function validateV070CounterworksAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_COUNTERWORKS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_COUNTERWORKS_BATTLE_TEXT) {
    throw new Error('v0.7.0 Counterworks battle text drifted from released authority.');
  }
}

validateV070CounterworksAuthority();

export function hasV070CounterworksPreRevealSource(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): boolean {
  return (['A', 'B'] as const).some(playerId =>
    unresolvedCounterworksSources(state, playerId, role).length > 0
  );
}

export function beginV070CounterworksPreReveal(
  state: V070GameState,
  playerId: PlayerId,
  role: 'gambit' | 'tactic',
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Counterworks pre-reveal resolution requires an active battle.',
    );
  }
  const expectedStage = role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics';
  if (runtime.stage !== expectedStage) {
    throw new V070GameActionError(
      `Counterworks ${role} resolution requires the ${expectedStage} stage.`,
    );
  }
  if (playerId !== battle.attacker) {
    throw new V070GameActionError(
      `The attacker advances the shared ${role} reveal procedure.`,
    );
  }
  if (runtime.counterworksPreRevealRole) {
    throw new V070GameActionError(
      'A Counterworks pre-reveal procedure is already active.',
    );
  }

  runtime.counterworksPreRevealRole = role;
  runtime.counterworksPreRevealChoice = null;
  runtime.counterworksPreRevealReady = false;
  runtime.counterworksPreRevealNextPlayer = firstCounterworksPlayer(state, role);
}

export function pendingV070CounterworksPreRevealChoice(
  state: V070GameState,
): V070CounterworksPreRevealChoice | null {
  return state.battleRuntime?.counterworksPreRevealChoice ?? null;
}

export function advanceV070CounterworksPreReveal(
  state: V070GameState,
): boolean {
  const runtime = state.battleRuntime;
  const role = runtime?.counterworksPreRevealRole;
  if (!runtime || !role) return false;
  if (runtime.counterworksPreRevealChoice) return true;

  while (true) {
    const playerId = normalizeNextCounterworksPlayer(state, role);
    if (!playerId) {
      runtime.counterworksPreRevealReady = true;
      return false;
    }

    const candidates = unresolvedCounterworksSources(state, playerId, role);
    if (candidates.length > 1) {
      openChoice(state, {
        kind: 'counterworks_source_order',
        playerId,
        role,
        candidateInstanceIds: candidates,
      });
      return true;
    }
    if (candidates.length === 0) {
      runtime.counterworksPreRevealNextPlayer = firstCounterworksPlayer(state, role);
      continue;
    }

    processCounterworksSource(state, playerId, role, candidates[0]);
    if (runtime.counterworksPreRevealChoice) return true;
  }
}

export function resolveV070CounterworksPreRevealAction(
  state: V070GameState,
  action: V070CounterworksPreRevealAction,
): void {
  const pending = pendingV070CounterworksPreRevealChoice(state);
  if (!pending) {
    throw new V070GameActionError(
      'There is no Counterworks pre-reveal choice to resolve.',
    );
  }
  if (pending.playerId !== action.playerId) {
    throw new V070GameActionError(
      'Only the player controlling the pending pre-reveal choice may resolve it.',
    );
  }

  switch (pending.kind) {
    case 'counterworks_source_order': {
      if (action.type !== 'choose_counterworks_source'
        || !pending.candidateInstanceIds.includes(action.sourceInstanceId)) {
        throw new V070GameActionError(
          'Choose one eligible Counterworks source to resolve next.',
        );
      }
      clearChoice(state);
      processCounterworksSource(
        state,
        action.playerId,
        pending.role,
        action.sourceInstanceId,
      );
      return;
    }
    case 'counterworks_target': {
      if (action.type !== 'choose_counterworks_target'
        || !pending.candidateInstanceIds.includes(action.targetInstanceId)) {
        throw new V070GameActionError(
          'Choose one eligible opposing face-down battle card.',
        );
      }
      clearChoice(state);
      resolveCounterworksTarget(
        state,
        action.playerId,
        pending.role,
        pending.sourceInstanceId,
        action.targetInstanceId,
      );
      return;
    }
    case 'counterintelligence_pre_reveal': {
      if (action.type !== 'choose_counterintelligence_pre_reveal'
        || !pending.candidateInstanceIds.includes(
          action.counterintelligenceInstanceId,
        )) {
        throw new V070GameActionError(
          'Choose one eligible Counterintelligence to reveal.',
        );
      }
      const stillEligible = eligibleV070CounterintelligenceBattleReactions(
        state,
        action.playerId,
        pending.role,
      );
      if (!stillEligible.includes(action.counterintelligenceInstanceId)) {
        throw new V070GameActionError(
          'That Counterintelligence can no longer prevent the pending reveal.',
        );
      }
      clearChoice(state);
      applyV070CounterintelligenceBattleReaction(
        state,
        action.playerId,
        action.counterintelligenceInstanceId,
        {
          opposingPlayer: pending.opposingPlayer,
          opposingSourceInstanceId: pending.opposingSourceInstanceId,
          opposingSourceCardId: V070_COUNTERWORKS_ID,
          targetInstanceId: pending.targetInstanceId,
          role: pending.role,
        },
      );
      completeCounterworksSource(
        state,
        pending.opposingPlayer,
        pending.role,
        pending.opposingSourceInstanceId,
        'prevented_by_counterintelligence',
      );
      return;
    }
    case 'counterworks_replacement': {
      if (action.type !== 'resolve_counterworks_replacement') {
        throw new V070GameActionError(
          'Resolve or decline the pending Counterworks replacement.',
        );
      }
      if (action.replacementInstanceId !== undefined
        && !pending.candidateInstanceIds.includes(action.replacementInstanceId)) {
        throw new V070GameActionError(
          'Choose an eligible Reserve card for Counterworks or decline replacement.',
        );
      }
      clearChoice(state);
      resolveCounterworksReplacement(
        state,
        action.playerId,
        pending.role,
        pending.sourceInstanceId,
        action.replacementInstanceId,
      );
      return;
    }
  }
}

export function finishV070CounterworksPreReveal(
  state: V070GameState,
): 'gambit' | 'tactic' {
  const runtime = state.battleRuntime;
  const role = runtime?.counterworksPreRevealRole;
  if (!runtime || !role || !runtime.counterworksPreRevealReady
    || runtime.counterworksPreRevealChoice) {
    throw new V070GameActionError(
      'Counterworks pre-reveal resolution is not ready to finish.',
    );
  }

  runtime.counterworksPreRevealRole = null;
  runtime.counterworksPreRevealNextPlayer = null;
  runtime.counterworksPreRevealChoice = null;
  runtime.counterworksPreRevealReady = false;
  return role;
}

function processCounterworksSource(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
): void {
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source
    || source.owner !== owner
    || source.role !== role
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_COUNTERWORKS_ID
    || isV070BattleCardEffectNegated(state, sourceInstanceId)
    || hasV070BattleCardEffectApplied(state, sourceInstanceId)) {
    throw new V070GameActionError(
      'That Counterworks is no longer eligible to resolve at this reveal stage.',
    );
  }

  if (!source.faceUp) {
    revealV070BattleCommitmentEarly(state, {
      targetInstanceId: sourceInstanceId,
      sourceKind: 'effect',
      sourceController: owner,
      sourceInstanceId,
      sourceId: V070_COUNTERWORKS_ID,
    });
  }

  const targets = eligibleCounterworksTargets(state, owner, role);
  if (targets.length > 1) {
    openChoice(state, {
      kind: 'counterworks_target',
      playerId: owner,
      role,
      sourceInstanceId,
      candidateInstanceIds: targets,
    });
    return;
  }
  if (targets.length === 1) {
    resolveCounterworksTarget(state, owner, role, sourceInstanceId, targets[0]);
    return;
  }

  openReplacementOrComplete(state, owner, role, sourceInstanceId);
}

function resolveCounterworksTarget(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
  targetInstanceId: string,
): void {
  const target = v070BattleCommitment(state, targetInstanceId);
  const opponent = otherPlayer(owner);
  if (!target
    || target.owner !== opponent
    || target.role !== role
    || target.faceUp) {
    throw new V070GameActionError(
      'Counterworks must reveal an opposing face-down card at the same stage.',
    );
  }

  if (preventV070OpposingBattleCardReveal(
    state,
    owner,
    opponent,
    {
      purpose: 'Counterworks battle effect',
      sourceInstanceId,
      targetInstanceId,
      role,
    },
  )) {
    appendV070Event(state, {
      type: 'counterworks_battle_effect_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_COUNTERWORKS_ID,
        targetInstanceId,
        protectedPlayer: opponent,
        revealRole: role,
        prevention: 'counterintelligence_asset',
      },
    });
    completeCounterworksSource(
      state,
      owner,
      role,
      sourceInstanceId,
      'prevented_by_counterintelligence',
    );
    return;
  }

  const reactions = eligibleV070CounterintelligenceBattleReactions(
    state,
    opponent,
    role,
  );
  if (reactions.length > 1) {
    openChoice(state, {
      kind: 'counterintelligence_pre_reveal',
      playerId: opponent,
      role,
      opposingPlayer: owner,
      opposingSourceInstanceId: sourceInstanceId,
      targetInstanceId,
      candidateInstanceIds: reactions,
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
        opposingSourceCardId: V070_COUNTERWORKS_ID,
        targetInstanceId,
        role,
      },
    );
    appendV070Event(state, {
      type: 'counterworks_battle_effect_prevented',
      actor: opponent,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_COUNTERWORKS_ID,
        targetInstanceId,
        protectedPlayer: opponent,
        revealRole: role,
        prevention: 'counterintelligence_battle',
        counterintelligenceInstanceId: reactions[0],
      },
    });
    completeCounterworksSource(
      state,
      owner,
      role,
      sourceInstanceId,
      'prevented_by_counterintelligence',
    );
    return;
  }

  const revealed = revealV070BattleCommitmentEarly(state, {
    targetInstanceId,
    sourceKind: 'effect',
    sourceController: owner,
    sourceInstanceId,
    sourceId: V070_COUNTERWORKS_ID,
  });
  if (!revealed) {
    throw new V070GameActionError(
      'The Counterworks target is no longer face down.',
    );
  }

  appendV070Event(state, {
    type: 'counterworks_battle_target_revealed',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_COUNTERWORKS_ID,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId ?? null,
      targetOwner: opponent,
      revealRole: role,
    },
  });
  openReplacementOrComplete(state, owner, role, sourceInstanceId);
}

function openReplacementOrComplete(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
): void {
  const candidates = eligibleCounterworksReplacements(state, owner, role);
  if (candidates.length === 0) {
    completeCounterworksSource(
      state,
      owner,
      role,
      sourceInstanceId,
      'kept',
    );
    return;
  }

  openChoice(state, {
    kind: 'counterworks_replacement',
    playerId: owner,
    role,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  });
}

function resolveCounterworksReplacement(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
  replacementInstanceId: string | undefined,
): void {
  if (replacementInstanceId === undefined) {
    appendV070Event(state, {
      type: 'counterworks_battle_replacement_declined',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_COUNTERWORKS_ID,
        revealRole: role,
      },
    });
    completeCounterworksSource(state, owner, role, sourceInstanceId, 'kept');
    return;
  }

  if (!eligibleCounterworksReplacements(state, owner, role)
    .includes(replacementInstanceId)) {
    throw new V070GameActionError(
      'That card is no longer an eligible Counterworks replacement.',
    );
  }
  const runtime = state.battleRuntime!;
  const participant = runtime.participants[owner];
  const reserveIndex = participant.reserve.indexOf(replacementInstanceId);
  if (reserveIndex < 0) {
    throw new V070GameActionError(
      'A Counterworks replacement must still be in that player’s Reserve.',
    );
  }
  participant.reserve.splice(reserveIndex, 1);

  const replacement: V070BattleCardCommitment = {
    instanceId: replacementInstanceId,
    owner,
    role,
    faceUp: true,
  };
  replaceCommitment(state, owner, role, sourceInstanceId, replacement);
  if (!state.players[owner].zones.graveyard.includes(sourceInstanceId)) {
    state.players[owner].zones.graveyard.push(sourceInstanceId);
  }

  appendV070Event(state, {
    type: 'counterworks_battle_replaced',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_COUNTERWORKS_ID,
      replacementInstanceId,
      replacementCardId:
        state.cardInstances[replacementInstanceId]?.cardId ?? null,
      revealRole: role,
      replacementFaceUp: true,
      sourceDestination: 'graveyard',
    },
  });
  completeCounterworksSource(
    state,
    owner,
    role,
    sourceInstanceId,
    'replaced',
  );
}

function completeCounterworksSource(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
  outcome: 'kept' | 'replaced' | 'prevented_by_counterintelligence',
): void {
  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId: sourceInstanceId,
      cardId: V070_COUNTERWORKS_ID,
      role,
      timing: 'pre_normal_reveal',
      outcome,
    },
  });

  const runtime = state.battleRuntime!;
  const opponent = otherPlayer(owner);
  runtime.counterworksPreRevealNextPlayer =
    unresolvedCounterworksSources(state, opponent, role).length > 0
      ? opponent
      : unresolvedCounterworksSources(state, owner, role).length > 0
        ? owner
        : firstCounterworksPlayer(state, role);
}

function eligibleCounterworksTargets(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return roleCommitments(state, otherPlayer(owner), role)
    .filter(commitment => !commitment.faceUp)
    .map(commitment => commitment.instanceId);
}

function eligibleCounterworksReplacements(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const prohibited = new Set(runtime.disruptionProhibitedInstanceIds ?? []);
  return runtime.participants[owner].reserve.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    return Boolean(
      cardId
      && cardEligibleForRole(cardId, role)
      && !prohibited.has(instanceId),
    );
  });
}

function cardEligibleForRole(
  cardId: string,
  role: 'gambit' | 'tactic',
): boolean {
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) return false;
  const label = role === 'gambit' ? 'Gambit' : 'Tactic';
  return card.effects.some(effect =>
    effect.label === label || effect.label === 'Gambit/Tactic'
  );
}

function unresolvedCounterworksSources(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return roleCommitments(state, owner, role)
    .filter(commitment =>
      state.cardInstances[commitment.instanceId]?.cardId === V070_COUNTERWORKS_ID
      && !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

function roleCommitments(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const participant = runtime.participants[owner];
  if (role === 'gambit') {
    return [
      ...(participant.gambit ? [participant.gambit] : []),
      ...participant.additionalGambits,
    ];
  }
  return [
    ...(participant.tactic ? [participant.tactic] : []),
    ...participant.additionalTactics,
  ];
}

function replaceCommitment(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
  sourceInstanceId: string,
  replacement: V070BattleCardCommitment,
): void {
  const participant = state.battleRuntime!.participants[owner];
  if (role === 'gambit') {
    if (participant.gambit?.instanceId === sourceInstanceId) {
      participant.gambit = replacement;
      return;
    }
    const index = participant.additionalGambits.findIndex(
      commitment => commitment.instanceId === sourceInstanceId,
    );
    if (index >= 0) {
      participant.additionalGambits[index] = replacement;
      return;
    }
  } else {
    if (participant.tactic?.instanceId === sourceInstanceId) {
      participant.tactic = replacement;
      return;
    }
    const index = participant.additionalTactics.findIndex(
      commitment => commitment.instanceId === sourceInstanceId,
    );
    if (index >= 0) {
      participant.additionalTactics[index] = replacement;
      return;
    }
  }
  throw new V070GameActionError(
    'The Counterworks source is no longer committed in this battle.',
  );
}

function firstCounterworksPlayer(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): PlayerId | null {
  const battle = state.battle;
  if (!battle) return null;
  if (unresolvedCounterworksSources(state, battle.attacker, role).length > 0) {
    return battle.attacker;
  }
  if (unresolvedCounterworksSources(state, battle.defender, role).length > 0) {
    return battle.defender;
  }
  return null;
}

function normalizeNextCounterworksPlayer(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): PlayerId | null {
  const runtime = state.battleRuntime;
  const preferred = runtime?.counterworksPreRevealNextPlayer ?? null;
  if (preferred
    && unresolvedCounterworksSources(state, preferred, role).length > 0) {
    return preferred;
  }
  return firstCounterworksPlayer(state, role);
}

function openChoice(
  state: V070GameState,
  choice: V070CounterworksPreRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.counterworksPreRevealChoice) {
    throw new V070GameActionError(
      'Cannot open a Counterworks choice while another pre-reveal choice is pending.',
    );
  }
  runtime.counterworksPreRevealChoice = choice;

  appendV070Event(state, {
    type: `${choice.kind}_pending`,
    actor: choice.playerId,
    visibility: 'public',
    payload: {
      playerId: choice.playerId,
      revealRole: choice.role,
      candidateCount: choice.candidateInstanceIds.length,
      ...(choice.kind === 'counterworks_target'
        || choice.kind === 'counterworks_replacement'
        ? { sourceInstanceId: choice.sourceInstanceId }
        : {}),
      mandatory: choice.kind !== 'counterworks_replacement',
    },
  });
  appendV070Event(state, {
    type: `${choice.kind}_options`,
    actor: choice.playerId,
    visibility: choice.playerId,
    payload: {
      revealRole: choice.role,
      candidateInstanceIds: [...choice.candidateInstanceIds],
    },
  });
}

function clearChoice(state: V070GameState): void {
  if (state.battleRuntime) {
    state.battleRuntime.counterworksPreRevealChoice = null;
  }
}

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}
