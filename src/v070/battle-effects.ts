import { v070CanonicalContent } from '../content/v070';
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
  V070_COUNTERWORKS_BATTLE_TEXT,
  V070_COUNTERWORKS_ID,
} from './counterworks-battle';
import {
  V070_COUNTERINTELLIGENCE_BATTLE_TEXT,
} from './counterintelligence-battle';
import { V070_COUNTERINTELLIGENCE_ID } from './counterintelligence';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';

export * from './battle-effects-pre-counterworks';

const counterworksHandler: previous.V070BattleEffectHandler = {
  cardId: V070_COUNTERWORKS_ID,
  expectedText: V070_COUNTERWORKS_BATTLE_TEXT,
  timing: 'reveal',
  // Counterworks resolves in the pre-normal-reveal procedure owned by the
  // outer battle facade. It is filtered before the normal reveal scheduler.
  apply: () => undefined,
};

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
  V070_COUNTERWORKS_ID,
  V070_COUNTERINTELLIGENCE_ID,
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  if (cardId === V070_COUNTERWORKS_ID) return counterworksHandler;
  if (cardId === V070_COUNTERINTELLIGENCE_ID) {
    return counterintelligenceHandler;
  }
  return previous.v070BattleEffectHandler(cardId);
}

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (cardId === V070_COUNTERINTELLIGENCE_ID) return 'interference';
  if (cardId === V070_COUNTERWORKS_ID) return 'interference';
  return previous.v070BattleRevealEffectClass(cardId);
}

/**
 * Counterworks must not mutate hidden battle state before the ordinary reveal
 * validator knows every same-stage effect is executable. The outer battle
 * facade uses this pure check before opening the pre-normal-reveal window.
 */
export function v070BattleRoleSupportsPreReveal(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  const commitments = (['A', 'B'] as const).flatMap(playerId => {
    const participant = runtime.participants[playerId];
    return role === 'gambit'
      ? [
          ...(participant.gambit ? [participant.gambit] : []),
          ...participant.additionalGambits,
        ]
      : [
          ...(participant.tactic ? [participant.tactic] : []),
          ...participant.additionalTactics,
        ];
  });

  return commitments.every(commitment => {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    const card = v070CanonicalContent.cardsById.get(cardId);
    if (!card) return false;
    if (card.trait === 'Arcane'
      && v070MonasterySuppressesArcaneBattleEffects(state)) {
      return true;
    }
    const relevant = card.effects.filter(effect =>
      effect.label === (role === 'gambit' ? 'Gambit' : 'Tactic')
      || effect.label === 'Gambit/Tactic'
    );
    if (relevant.length === 0) return true;
    const handler = v070BattleEffectHandler(cardId);
    return Boolean(
      handler
      && relevant.length === 1
      && relevant[0]?.text === handler.expectedText,
    );
  });
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const forwarded: V070BattleCardCommitment[] = [];

  for (const commitment of commitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    if (cardId !== V070_COUNTERWORKS_ID
      && cardId !== V070_COUNTERINTELLIGENCE_ID) {
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

    if (cardId === V070_COUNTERWORKS_ID
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)) {
      return unsupportedPreRevealCommitment(state, commitment, encounteredAt);
    }

    if (cardId === V070_COUNTERINTELLIGENCE_ID
      && !hasV070BattleCardEffectApplied(state, commitment.instanceId)) {
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

function unsupportedPreRevealCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId
    ?? V070_COUNTERWORKS_ID;
  const card = v070CanonicalContent.cardsById.get(cardId);
  const relevant = card?.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  ) ?? [];
  return relevant.map(effect => ({
    owner: commitment.owner,
    instanceId: commitment.instanceId,
    cardId,
    role: commitment.role,
    label: effect.label,
    text: effect.text,
    encounteredAt,
  }));
}
