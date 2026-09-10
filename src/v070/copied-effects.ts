import type { V070CanonicalCard, V070CanonicalCardEffect } from '../content/v070';
import type { PlayerId } from './rules';

export type V070CopyableEffectLabel = 'Action' | 'Gambit' | 'Tactic' | 'Gambit/Tactic';

export interface V070EffectReference {
  cardId: string;
  cardName: string;
  label: V070CopyableEffectLabel;
  text: string;
}

export interface V070CardInstanceReference {
  instanceId: string;
  cardId: string;
}

export interface V070EffectInstanceReference extends V070EffectReference {
  sourceInstanceId: string;
  sourceZoneIndex: number;
}

export interface V070CopiedEffectApplication extends V070EffectReference {
  controller: PlayerId;
  chainDepth: 1 | 2;
  sourceCardMovesMerelyBecauseCopied: false;
  printedEffectOrCallerMayMoveSource: true;
  sourceCardIsPlayedSetOrChosen: false;
  sourceEventTriggers: false;
  remakeChoices: true;
  repayCosts: true;
  chainAllowsFurtherCopiedApplication: boolean;
}

export type V070CanApplyEffectNow = (effect: V070EffectReference) => boolean;

const COPYABLE_LABELS = new Set<V070CopyableEffectLabel>([
  'Action',
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
]);

export function isV070CopyableEffectLabel(label: string): label is V070CopyableEffectLabel {
  return COPYABLE_LABELS.has(label as V070CopyableEffectLabel);
}

export function v070EffectReference(
  card: Pick<V070CanonicalCard, 'id' | 'name' | 'effects'>,
  effect: V070CanonicalCardEffect,
): V070EffectReference {
  if (!isV070CopyableEffectLabel(effect.label)) {
    throw new Error(`${effect.label} is not a copyable v0.7.0 card-effect heading.`);
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
 * This title-level helper intentionally deduplicates identical card ids. Use
 * eligibleV070CopiedEffectInstances when the physical source card matters.
 */
export function eligibleV070CopiedEffects(
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  cardIds: readonly string[],
  allowedLabels: readonly V070CopyableEffectLabel[],
  canApplyNow: V070CanApplyEffectNow,
): V070EffectReference[] {
  const allowed = new Set(allowedLabels);
  const results: V070EffectReference[] = [];
  const seen = new Set<string>();

  for (const cardId of cardIds) {
    const card = cardsById.get(cardId);
    if (!card) continue;
    for (const effect of card.effects) {
      if (!isV070CopyableEffectLabel(effect.label) || !allowed.has(effect.label)) continue;
      const reference = v070EffectReference(card, effect);
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
 * Instance-preserving variant for callers that later move the exact physical
 * source card selected from a Graveyard or another zone.
 */
export function eligibleV070CopiedEffectInstances(
  cardsById: ReadonlyMap<string, V070CanonicalCard>,
  cardInstances: readonly V070CardInstanceReference[],
  allowedLabels: readonly V070CopyableEffectLabel[],
  canApplyNow: V070CanApplyEffectNow,
): V070EffectInstanceReference[] {
  const allowed = new Set(allowedLabels);
  const results: V070EffectInstanceReference[] = [];

  cardInstances.forEach((instance, sourceZoneIndex) => {
    const card = cardsById.get(instance.cardId);
    if (!card) return;
    for (const effect of card.effects) {
      if (!isV070CopyableEffectLabel(effect.label) || !allowed.has(effect.label)) continue;
      const reference = v070EffectReference(card, effect);
      if (!canApplyNow(reference)) continue;
      results.push({
        ...reference,
        sourceInstanceId: instance.instanceId,
        sourceZoneIndex,
      });
    }
  });

  return results;
}

/**
 * Start the new application created when an effect tells a player to apply or
 * repeat another printed effect.
 *
 * Applying/copying does not itself move, play, set, or choose the source card.
 * The printed effect or the caller's own later instruction may still move that
 * physical source card when it expressly says to do so. Choices and costs for
 * the new application are made and paid again by its controller.
 */
export function beginV070CopiedEffectApplication(
  effect: V070EffectReference,
  controller: PlayerId,
): V070CopiedEffectApplication {
  return {
    ...effect,
    controller,
    chainDepth: 1,
    sourceCardMovesMerelyBecauseCopied: false,
    printedEffectOrCallerMayMoveSource: true,
    sourceCardIsPlayedSetOrChosen: false,
    sourceEventTriggers: false,
    remakeChoices: true,
    repayCosts: true,
    chainAllowsFurtherCopiedApplication: true,
  };
}

/**
 * A first copied/repeated application may create one further application only
 * when its own printed text instructs that application. Chain depth alone is not
 * permission. The resulting second copied application is the end of the chain.
 */
export function continueV070CopiedEffectApplication(
  parent: V070CopiedEffectApplication,
  effect: V070EffectReference,
  controller: PlayerId,
  parentEffectInstructsFurtherApplication: boolean,
): V070CopiedEffectApplication {
  if (!parentEffectInstructsFurtherApplication) {
    throw new Error('A copied effect may continue the chain only when its printed text instructs another application.');
  }
  if (!parent.chainAllowsFurtherCopiedApplication || parent.chainDepth !== 1) {
    throw new Error('A v0.7.0 copied-effect chain cannot create a third application layer.');
  }
  return {
    ...effect,
    controller,
    chainDepth: 2,
    sourceCardMovesMerelyBecauseCopied: false,
    printedEffectOrCallerMayMoveSource: true,
    sourceCardIsPlayedSetOrChosen: false,
    sourceEventTriggers: false,
    remakeChoices: true,
    repayCosts: true,
    chainAllowsFurtherCopiedApplication: false,
  };
}

export function assertV070CopiedEffectCanApplyNow(
  effect: V070EffectReference,
  canApplyNow: V070CanApplyEffectNow,
): void {
  if (!canApplyNow(effect)) {
    throw new Error(`${effect.cardName}'s ${effect.label} effect cannot apply at the current timing.`);
  }
}
