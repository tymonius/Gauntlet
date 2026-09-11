import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as previous from './battle-effects-pre-counterworks';
import {
  hasV070BattleCardEffectApplied,
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  V070_COUNTERINTELLIGENCE_BATTLE_TEXT,
} from './counterintelligence-battle';
import { V070_COUNTERINTELLIGENCE_ID } from './counterintelligence';

export * from './battle-effects-pre-counterworks';

const counterintelligenceHandler: previous.V070BattleEffectHandler = {
  cardId: V070_COUNTERINTELLIGENCE_ID,
  expectedText: V070_COUNTERINTELLIGENCE_BATTLE_TEXT,
  timing: 'reveal',
  // A face-down Counterintelligence can apply reactively before normal reveal.
  // If it reaches normal reveal without triggering, its condition simply did
  // not occur; this wrapper records that resolution and filters the card.
  apply: () => undefined,
};

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  V070_COUNTERINTELLIGENCE_ID,
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  if (cardId === V070_COUNTERINTELLIGENCE_ID) {
    return counterintelligenceHandler;
  }
  return previous.v070BattleEffectHandler(cardId);
}

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (cardId === V070_COUNTERINTELLIGENCE_ID) return 'interference';
  return previous.v070BattleRevealEffectClass(cardId);
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const forwarded: V070BattleCardCommitment[] = [];

  for (const commitment of commitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    if (cardId !== V070_COUNTERINTELLIGENCE_ID) {
      forwarded.push(commitment);
      continue;
    }

    if (isV070BattleCardEffectNegated(state, commitment.instanceId)) {
      appendV070Event(state, {
        type: 'battle_card_effect_skipped_negated',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
        },
      });
      continue;
    }

    if (!hasV070BattleCardEffectApplied(state, commitment.instanceId)) {
      markV070BattleCardEffectApplied(state, commitment.instanceId);
      appendV070Event(state, {
        type: 'battle_card_effect_applied',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
          timing: 'reveal',
          revealClass: 'interference',
          conditionMet: false,
        },
      });
    }
  }

  if (forwarded.length === 0) return [];
  return previous.resolveV070SupportedRevealEffects(
    state,
    forwarded,
    encounteredAt,
  );
}
