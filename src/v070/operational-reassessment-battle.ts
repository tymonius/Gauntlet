import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import {
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
  v070BattleCommitment,
} from './battle-effect-status';
import {
  completeV070OperationalReassessmentBattleRevealChoice,
  queueV070OperationalReassessmentBattleRevealChoice,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleEffectHandler } from './witchcraft-handler-resolver';
import {
  resolveV070Withdrawal,
  type PlayerId,
} from './rules';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';
import { settleV070RefusedTermsWithoutWinner } from './diplomats';
import { applyV070BlasphemyForBattleReveal } from './inquisition';

export const V070_OPERATIONAL_REASSESSMENT_ID =
  'intelligence-operational-reassessment' as const;
export const V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT =
  'After Tactics are revealed, choose one: withdraw; or replace this card with an eligible card from your Hand, face up. If you replace it, put this card in your Graveyard.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredOperationalReassessmentGambitCommitments?:
      V070BattleCardCommitment[];
  }
}

function validateAuthority(): void {
  for (const content of [v070CanonicalContent, currentCanonicalContent]) {
    const effect = content.cardsById
      .get(V070_OPERATIONAL_REASSESSMENT_ID)?.effects
      .find(candidate => candidate.label === 'Gambit/Tactic');
    if (effect?.text !== V070_OPERATIONAL_REASSESSMENT_BATTLE_TEXT) {
      throw new Error(
        'Operational Reassessment Gambit/Tactic text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

export function deferV070OperationalReassessmentGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredOperationalReassessmentGambitCommitments ??= [];
  if (runtime.deferredOperationalReassessmentGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) {
    return;
  }
  runtime.deferredOperationalReassessmentGambitCommitments.push({
    ...commitment,
  });
}

export function takeV070DeferredOperationalReassessmentGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred =
    runtime.deferredOperationalReassessmentGambitCommitments ?? [];
  runtime.deferredOperationalReassessmentGambitCommitments = [];

  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId
      === V070_OPERATIONAL_REASSESSMENT_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

export function registerV070OperationalReassessmentBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Operational Reassessment battle resolution requires an active battle.',
    );
  }
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source
    || source.owner !== owner
    || source.role !== role
    || state.cardInstances[sourceInstanceId]?.cardId
      !== V070_OPERATIONAL_REASSESSMENT_ID) {
    throw new V070GameActionError(
      'Operational Reassessment source no longer matches its battle role.',
    );
  }

  queueV070OperationalReassessmentBattleRevealChoice(state, {
    kind: 'operational_reassessment',
    owner,
    sourceInstanceId,
    role,
    candidateInstanceIds: v070PostTacticsReplacementEligibleHandInstanceIds(
      state,
      owner,
      role,
    ),
  });
}

export type V070OperationalReassessmentResolution =
  | { withdrew: true; replacement: null }
  | {
      withdrew: false;
      replacement: V070BattleCardCommitment;
    };

export function resolveV070OperationalReassessmentBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'withdraw' | 'replace',
  replacementInstanceId?: string,
): V070OperationalReassessmentResolution {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingOperationalReassessmentBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.operationalReassessmentBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'No Operational Reassessment battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Operational Reassessment controller may resolve it.',
    );
  }

  if (choice === 'withdraw') {
    completeV070OperationalReassessmentBattleRevealChoice(state);
    markV070BattleCardEffectApplied(state, pending.sourceInstanceId);
    withdrawFromBattle(state, playerId, pending.sourceInstanceId);
    return { withdrew: true, replacement: null };
  }

  if (!replacementInstanceId
    || !pending.candidateInstanceIds.includes(replacementInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible Operational Reassessment replacement from Hand.',
    );
  }

  const liveCandidates = v070PostTacticsReplacementEligibleHandInstanceIds(
    state,
    playerId,
    pending.role,
  );
  if (!liveCandidates.includes(replacementInstanceId)) {
    throw new V070GameActionError(
      'The chosen Operational Reassessment replacement is no longer eligible.',
    );
  }

  completeV070OperationalReassessmentBattleRevealChoice(state);
  const replacement = replaceSource(
    state,
    playerId,
    pending.sourceInstanceId,
    pending.role,
    replacementInstanceId,
  );
  return {
    withdrew: false,
    replacement,
  };
}

export function v070OperationalReassessmentReplacementInstanceIds(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return v070PostTacticsReplacementEligibleHandInstanceIds(state, owner, role);
}

export function v070PostTacticsReplacementEligibleHandInstanceIds(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  return state.players[owner].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    if (!cardId) return false;
    const card = v070CanonicalContent.cardsById.get(cardId);
    if (!card) return false;

    const effect = card.effects.find(candidate =>
      candidate.label === 'Gambit/Tactic'
      || candidate.label === (role === 'gambit' ? 'Gambit' : 'Tactic')
    );
    if (!effect || timingAlreadyPassed(cardId, effect.text, role)) {
      return false;
    }

    const handler = resolveV070WitchcraftBattleEffectHandler(cardId);
    return Boolean(
      handler
      && handler.expectedText === effect.text,
    );
  });
}

function timingAlreadyPassed(
  cardId: string,
  text: string,
  role: 'gambit' | 'tactic',
): boolean {
  if (cardId === 'inquisition-confession'
    || cardId === 'neutral-scouting-report'
    || cardId === 'neutral-counterintelligence') {
    return true;
  }
  if (/^When you (?:set|choose) this card\b/.test(text)) return true;
  if (/^After Tactics are chosen\b/.test(text)) return true;
  if (/^Before Tactics normally reveal\b/.test(text)) return true;
  if (/^When Tactics are revealed\b/.test(text)) return true;
  if (role === 'gambit' && /^When Gambits are revealed\b/.test(text)) {
    return true;
  }
  return false;
}

function replaceSource(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  role: 'gambit' | 'tactic',
  replacementInstanceId: string,
): V070BattleCardCommitment {
  const runtime = state.battleRuntime!;
  const participant = runtime.participants[owner];
  const source = v070BattleCommitment(state, sourceInstanceId);
  if (!source || source.owner !== owner || source.role !== role) {
    throw new V070GameActionError(
      'Operational Reassessment is no longer available to replace.',
    );
  }

  const hand = state.players[owner].zones.hand;
  const handIndex = hand.indexOf(replacementInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError(
      'The Operational Reassessment replacement must still be in Hand.',
    );
  }

  const replacement: V070BattleCardCommitment = {
    instanceId: replacementInstanceId,
    owner,
    role,
    faceUp: true,
  };

  let replaced = false;
  if (role === 'gambit') {
    if (participant.gambit?.instanceId === sourceInstanceId) {
      participant.gambit = replacement;
      replaced = true;
    } else {
      const index = participant.additionalGambits.findIndex(
        candidate => candidate.instanceId === sourceInstanceId,
      );
      if (index >= 0) {
        participant.additionalGambits[index] = replacement;
        replaced = true;
      }
    }
  } else if (participant.tactic?.instanceId === sourceInstanceId) {
    participant.tactic = replacement;
    replaced = true;
  } else {
    const index = participant.additionalTactics.findIndex(
      candidate => candidate.instanceId === sourceInstanceId,
    );
    if (index >= 0) {
      participant.additionalTactics[index] = replacement;
      replaced = true;
    }
  }

  if (!replaced) {
    throw new V070GameActionError(
      'Operational Reassessment no longer occupies the battle role it must replace.',
    );
  }

  hand.splice(handIndex, 1);
  if (!state.players[owner].zones.graveyard.includes(sourceInstanceId)) {
    state.players[owner].zones.graveyard.push(sourceInstanceId);
  }
  markV070BattleCardEffectApplied(state, sourceInstanceId);

  const replacementCardId =
    state.cardInstances[replacementInstanceId]?.cardId ?? '';
  applyV070BlasphemyForBattleReveal(
    state,
    owner,
    replacementCardId,
    role,
  );

  appendV070Event(state, {
    type: `${role}_revealed`,
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId: replacementInstanceId,
      cardId: replacementCardId,
      faceUp: true,
      source: 'Operational Reassessment',
      replacedInstanceId: sourceInstanceId,
    },
  });
  appendV070Event(state, {
    type: 'operational_reassessment_battle_replaced',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_OPERATIONAL_REASSESSMENT_ID,
      sourceDestination: 'graveyard',
      replacementInstanceId,
      replacementCardId,
      role,
      replacementFaceUp: true,
    },
  });

  return replacement;
}

function withdrawFromBattle(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Operational Reassessment cannot withdraw after the battle has ended.',
    );
  }

  const previousPositions = { ...battle.positions };
  state.battle = resolveV070Withdrawal(battle, [playerId]);
  runtime.pendingOutcome = null;
  runtime.stage = 'aftermath';
  runtime.trainingGroundsRedrawResolved = true;

  // Withdrawal terminates the current reveal procedure.
  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealDeferredOrdinaryCommitments = [];
  runtime.pendingRevealEffectClass = null;
  runtime.pendingRevealEffectEncounteredAt = null;
  runtime.pendingRevealEffectNextPlayer = null;
  runtime.pendingRevealForcedInstanceId = null;
  runtime.pendingRevealEffectOrderChoice = null;
  runtime.battleRevealChoices = [];
  runtime.battleRevealChoiceOpen = false;
  runtime.deferredOperationalReassessmentGambitCommitments = [];

  for (const participant of ['A', 'B'] as const) {
    const from = previousPositions[participant];
    const to = state.battle.positions[participant];
    if (from !== to) {
      openV070BlockadeChoicesForPositionChange(
        state,
        participant,
        from,
        to,
      );
    }
  }

  settleV070RefusedTermsWithoutWinner(state);

  appendV070Event(state, {
    type: 'operational_reassessment_battle_withdrawal',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_OPERATIONAL_REASSESSMENT_ID,
      playerId,
      positions: { ...state.battle.positions },
    },
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
