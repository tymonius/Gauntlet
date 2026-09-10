import { v070CanonicalContent, type V070CanonicalCard } from '../content/v070';
import type { PlayerId } from './rules';
import {
  beginV070CopiedEffectApplication,
  continueV070CopiedEffectApplication,
  eligibleV070CopiedEffectInstances,
  type V070CanApplyEffectNow,
  type V070CardInstanceReference,
  type V070CopiedEffectApplication,
  type V070CopyableEffectLabel,
  type V070EffectInstanceReference,
} from './copied-effects';

export const V070_ARCANE_KNOWLEDGE_ID = 'neutral-arcane-knowledge' as const;
export const V070_ARCANE_KNOWLEDGE_BATTLE_TEXT =
  'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.' as const;

const arcaneKnowledgeCard = v070CanonicalContent.cardsById.get(V070_ARCANE_KNOWLEDGE_ID);
const arcaneKnowledgeBattleEffect = arcaneKnowledgeCard?.effects.find(
  effect => effect.label === 'Gambit/Tactic',
);
if (arcaneKnowledgeBattleEffect?.text !== V070_ARCANE_KNOWLEDGE_BATTLE_TEXT) {
  throw new Error('Released v0.7.0 Arcane Knowledge battle text no longer matches the executable authority.');
}

const ARCANE_KNOWLEDGE_BATTLE_LABELS: readonly V070CopyableEffectLabel[] = [
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
] as const;

export interface V070ArcaneKnowledgeBattleChoice extends V070EffectInstanceReference {
  sourceZone: 'graveyard';
}

/**
 * Arcane Knowledge has no title whitelist. The battle resolver supplies the
 * semantic can-apply-now predicate for the exact current timing and game state.
 */
export function v070ArcaneKnowledgeBattleChoices(
  graveyard: readonly V070CardInstanceReference[],
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  canApplyNow: V070CanApplyEffectNow,
): V070ArcaneKnowledgeBattleChoice[] {
  return eligibleV070CopiedEffectInstances(
    cardsById,
    graveyard,
    ARCANE_KNOWLEDGE_BATTLE_LABELS,
    canApplyNow,
  ).map(choice => ({ ...choice, sourceZone: 'graveyard' as const }));
}

export function prepareV070ArcaneKnowledgeBattleApplication(input: {
  controller: PlayerId;
  graveyard: readonly V070CardInstanceReference[];
  cardsById: ReadonlyMap<string, V070CanonicalCard>;
  targetSourceInstanceId: string;
  targetEffectLabel: V070CopyableEffectLabel;
  canApplyNow: V070CanApplyEffectNow;
  parentApplication?: V070CopiedEffectApplication;
}): V070CopiedEffectApplication {
  const choice = v070ArcaneKnowledgeBattleChoices(
    input.graveyard,
    input.cardsById,
    input.canApplyNow,
  ).find(entry => (
    entry.sourceInstanceId === input.targetSourceInstanceId
    && entry.label === input.targetEffectLabel
  ));
  if (!choice) {
    throw new Error('Arcane Knowledge must choose an eligible Gambit or Tactic effect from your Graveyard.');
  }

  return input.parentApplication
    ? continueV070CopiedEffectApplication(
        input.parentApplication,
        choice,
        input.controller,
        true,
      )
    : beginV070CopiedEffectApplication(choice, input.controller);
}
