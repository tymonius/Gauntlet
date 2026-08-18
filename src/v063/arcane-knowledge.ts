import type { V063CanonicalCard } from '../content/v063';
import type { PlayerId } from './rules';
import {
  assertV063CopiedEffectCanApplyNow,
  beginV063CopiedEffectApplication,
  eligibleV063CopiedEffects,
  v063EffectReference,
  type V063CanApplyEffectNow,
  type V063CopiedEffectApplication,
  type V063CopyableEffectLabel,
  type V063EffectReference,
} from './copied-effects';

export const V063_ARCANE_KNOWLEDGE_ID = 'neutral-arcane-knowledge' as const;

export interface ArcaneKnowledgeActionZones {
  graveyard: string[];
  discardPile: string[];
}

/** Printed Action: move one chosen card from your Graveyard to your Discard Pile. */
export function resolveV063ArcaneKnowledgeAction(
  zones: ArcaneKnowledgeActionZones,
  targetCardId: string,
): ArcaneKnowledgeActionZones {
  const index = zones.graveyard.indexOf(targetCardId);
  if (index < 0) throw new Error('Arcane Knowledge must choose a card in your Graveyard.');
  return {
    graveyard: zones.graveyard.filter((_, cardIndex) => cardIndex !== index),
    discardPile: [...zones.discardPile, targetCardId],
  };
}

export interface ArcaneKnowledgeBattleChoice extends V063EffectReference {
  sourceZone: 'graveyard';
}

const ARCANE_KNOWLEDGE_BATTLE_LABELS: readonly V063CopyableEffectLabel[] = [
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
] as const;

/**
 * Arcane Knowledge may select any Graveyard card whose printed Gambit or Tactic
 * effect can apply now. The current resolver supplies that semantic legality;
 * this procedure intentionally has no card-title whitelist.
 */
export function v063ArcaneKnowledgeBattleChoices(
  graveyard: readonly string[],
  cardsById: ReadonlyMap<string, V063CanonicalCard>,
  canApplyNow: V063CanApplyEffectNow,
): ArcaneKnowledgeBattleChoice[] {
  return eligibleV063CopiedEffects(
    cardsById,
    graveyard,
    ARCANE_KNOWLEDGE_BATTLE_LABELS,
    canApplyNow,
  ).map((effect) => ({ ...effect, sourceZone: 'graveyard' as const }));
}

export function prepareV063ArcaneKnowledgeBattleApplication(input: {
  controller: PlayerId;
  graveyard: readonly string[];
  cardsById: ReadonlyMap<string, V063CanonicalCard>;
  targetCardId: string;
  targetEffectLabel: V063CopyableEffectLabel;
  canApplyNow: V063CanApplyEffectNow;
}): V063CopiedEffectApplication {
  if (!input.graveyard.includes(input.targetCardId)) {
    throw new Error('Arcane Knowledge must choose a card in your Graveyard.');
  }
  if (!ARCANE_KNOWLEDGE_BATTLE_LABELS.includes(input.targetEffectLabel)) {
    throw new Error('Arcane Knowledge may apply only a Gambit or Tactic effect.');
  }

  const card = input.cardsById.get(input.targetCardId);
  if (!card) throw new Error(`Unknown v0.6.3 card: ${input.targetCardId}.`);
  const effect = card.effects.find((entry) => entry.label === input.targetEffectLabel);
  if (!effect) {
    throw new Error(`${card.name} does not have a ${input.targetEffectLabel} effect.`);
  }
  const reference = v063EffectReference(card, effect);
  assertV063CopiedEffectCanApplyNow(reference, input.canApplyNow);
  return beginV063CopiedEffectApplication(reference, input.controller);
}
