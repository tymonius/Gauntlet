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
import { V070_COUNTERINTELLIGENCE_ID } from './counterintelligence';

const counterintelligenceBattleEffect =
  v070CanonicalContent.cardsById
    .get(V070_COUNTERINTELLIGENCE_ID)
    ?.effects.find(effect => effect.label === 'Gambit/Tactic');
if (!counterintelligenceBattleEffect) {
  throw new Error(
    'Published v0.7.0 Counterintelligence is missing its Gambit/Tactic effect.',
  );
}
export const V070_COUNTERINTELLIGENCE_BATTLE_TEXT =
  counterintelligenceBattleEffect.text;

export function eligibleV070CounterintelligenceBattleReactions(
  state: V070GameState,
  owner: PlayerId,
  role: 'gambit' | 'tactic',
): string[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const participant = runtime.participants[owner];
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
      !commitment.faceUp
      && state.cardInstances[commitment.instanceId]?.cardId
        === V070_COUNTERINTELLIGENCE_ID
      && !isV070BattleCardEffectNegated(state, commitment.instanceId)
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)
    )
    .map(commitment => commitment.instanceId);
}

export function applyV070CounterintelligenceBattleReaction(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  input: {
    opposingPlayer: PlayerId;
    opposingSourceInstanceId: string;
    opposingSourceCardId: string;
    targetInstanceId: string;
    role: 'gambit' | 'tactic';
  },
): void {
  const runtime = state.battleRuntime;
  const commitment = v070BattleCommitment(state, instanceId);
  if (!state.battle || !runtime || !commitment) {
    throw new V070GameActionError(
      'Counterintelligence battle reaction requires an active committed card.',
    );
  }
  if (commitment.owner !== owner
    || commitment.role !== input.role
    || state.cardInstances[instanceId]?.cardId !== V070_COUNTERINTELLIGENCE_ID
    || commitment.faceUp
    || isV070BattleCardEffectNegated(state, instanceId)
    || hasV070BattleCardEffectApplied(state, instanceId)) {
    throw new V070GameActionError(
      'That Counterintelligence can no longer prevent the pending reveal.',
    );
  }
  if (input.opposingPlayer === owner) {
    throw new V070GameActionError(
      'Counterintelligence only prevents an opposing revealing effect.',
    );
  }

  const revealed = revealV070BattleCommitmentEarly(state, {
    targetInstanceId: instanceId,
    sourceKind: 'effect',
    sourceController: owner,
    sourceInstanceId: instanceId,
    sourceId: V070_COUNTERINTELLIGENCE_ID,
  });
  if (!revealed) {
    throw new V070GameActionError(
      'Counterintelligence must still be face down to reveal itself for this reaction.',
    );
  }

  runtime.participants[owner].battleModifier += 1;
  markV070BattleCardEffectApplied(state, instanceId);

  appendV070Event(state, {
    type: 'counterintelligence_battle_effect_prevented',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: instanceId,
      sourceCardId: V070_COUNTERINTELLIGENCE_ID,
      opposingPlayer: input.opposingPlayer,
      opposingSourceInstanceId: input.opposingSourceInstanceId,
      opposingSourceCardId: input.opposingSourceCardId,
      protectedTargetInstanceId: input.targetInstanceId,
      revealRole: input.role,
      battleTotalDelta: 1,
    },
  });
  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: V070_COUNTERINTELLIGENCE_ID,
      role: input.role,
      timing: 'pre_normal_reveal',
      revealClass: 'interference',
    },
  });
}
