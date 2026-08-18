import type { V063CanonicalCard, V063CanonicalCardEffect } from '../content/v063';
import type { PlayerId } from './rules';

export type V063CopyableEffectLabel = 'Action' | 'Gambit' | 'Tactic' | 'Gambit/Tactic';

export interface V063EffectReference {
  cardId: string;
  cardName: string;
  label: V063CopyableEffectLabel;
  text: string;
}

export interface V063CopiedEffectApplication extends V063EffectReference {
  controller: PlayerId;
  chainDepth: 1 | 2;
  sourceCardMoves: false;
  sourceCardIsPlayedSetOrChosen: false;
  sourceEventTriggers: false;
  remakeChoices: true;
  repayCosts: true;
  mayCreateFurtherCopiedApplication: boolean;
}

export type V063CanApplyEffectNow = (effect: V063EffectReference) => boolean;

const COPYABLE_LABELS = new Set<V063CopyableEffectLabel>([
  'Action',
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
]);

export function isV063CopyableEffectLabel(label: string): label is V063CopyableEffectLabel {
  return COPYABLE_LABELS.has(label as V063CopyableEffectLabel);
}

export function v063EffectReference(
  card: Pick<V063CanonicalCard, 'id' | 'name' | 'effects'>,
  effect: V063CanonicalCardEffect,
): V063EffectReference {
  if (!isV063CopyableEffectLabel(effect.label)) {
    throw new Error(`${effect.label} is not a copyable v0.6.3 card-effect heading.`);
  }
  return {
    cardId: card.id,
    cardName: card.name,
    label: effect.label,
    text: effect.text,
  };
}

/**
 * Return printed effects that the caller has proven can apply at the current
 * timing with their printed conditions and legal targets satisfied.
 *
 * This deliberately does not maintain a title whitelist: v0.6.3 copied-effect
 * legality is semantic and timing-dependent, not a fixed registry of cards.
 */
export function eligibleV063CopiedEffects(
  cardsById: ReadonlyMap<string, V063CanonicalCard>,
  cardIds: readonly string[],
  allowedLabels: readonly V063CopyableEffectLabel[],
  canApplyNow: V063CanApplyEffectNow,
): V063EffectReference[] {
  const allowed = new Set(allowedLabels);
  const results: V063EffectReference[] = [];
  const seen = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardsById.get(cardId);
    if (!card) continue;
    for (const effect of card.effects) {
      if (!isV063CopyableEffectLabel(effect.label) || !allowed.has(effect.label)) continue;
      const reference = v063EffectReference(card, effect);
      if (!canApplyNow(reference)) continue;
      const key = `${reference.cardId}\u0000${reference.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(reference);
    }
  }

  return results;
}

/**
 * Start the new application created when an effect tells a player to apply or
 * repeat another printed effect.
 *
 * The source card stays where it is. It is not played, set, chosen, or moved;
 * play/set/choose triggers therefore do not fire. Choices and costs belong to
 * this new application and must be made/paid again by its controller.
 */
export function beginV063CopiedEffectApplication(
  effect: V063EffectReference,
  controller: PlayerId,
): V063CopiedEffectApplication {
  return {
    ...effect,
    controller,
    chainDepth: 1,
    sourceCardMoves: false,
    sourceCardIsPlayedSetOrChosen: false,
    sourceEventTriggers: false,
    remakeChoices: true,
    repayCosts: true,
    mayCreateFurtherCopiedApplication: true,
  };
}

/**
 * A copied/repeated effect may create one further copied application if its own
 * printed text instructs it to. That second application is the end of the chain.
 */
export function continueV063CopiedEffectApplication(
  parent: V063CopiedEffectApplication,
  effect: V063EffectReference,
  controller: PlayerId,
): V063CopiedEffectApplication {
  if (!parent.mayCreateFurtherCopiedApplication || parent.chainDepth !== 1) {
    throw new Error('A v0.6.3 copied-effect chain cannot create a third application layer.');
  }
  return {
    ...effect,
    controller,
    chainDepth: 2,
    sourceCardMoves: false,
    sourceCardIsPlayedSetOrChosen: false,
    sourceEventTriggers: false,
    remakeChoices: true,
    repayCosts: true,
    mayCreateFurtherCopiedApplication: false,
  };
}

export function assertV063CopiedEffectCanApplyNow(
  effect: V063EffectReference,
  canApplyNow: V063CanApplyEffectNow,
): void {
  if (!canApplyNow(effect)) {
    throw new Error(`${effect.cardName}'s ${effect.label} effect cannot apply at the current timing.`);
  }
}
