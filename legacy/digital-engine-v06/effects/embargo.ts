import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  PlayerID,
} from '../types/v06';
import type { BattleCardTarget, EffectContext } from './types';

export const BATTLE_CANCELLATION_CARD_IDS = [
  'card-embargo',
  'neutral-disruption',
  'neutral-sabotage',
] as const satisfies readonly CardID[];

export function isBattleCancellationCard(cardId: CardID): boolean {
  return BATTLE_CANCELLATION_CARD_IDS.includes(cardId as (typeof BATTLE_CANCELLATION_CARD_IDS)[number]);
}

export function activePlayedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((played): played is BattlePlayedCard => Boolean(
      played && !played.canceled && !played.negated && !played.virtual,
    ));
}

export function activeBattleCancellationCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return activePlayedCards(participant).filter((played) => isBattleCancellationCard(played.cardId));
}

function participantFor(context: EffectContext, playerId: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  if (context.battle.attacker.playerId === playerId) return context.battle.attacker;
  if (context.battle.defender.playerId === playerId) return context.battle.defender;
  return undefined;
}

function otherParticipant(context: EffectContext, playerId: PlayerID): BattleParticipantState | undefined {
  if (!context.battle) return undefined;
  if (context.battle.attacker.playerId === playerId) return context.battle.defender;
  if (context.battle.defender.playerId === playerId) return context.battle.attacker;
  return undefined;
}

function removeOne<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  const index = items.findIndex(predicate);
  if (index < 0) return undefined;
  return items.splice(index, 1)[0];
}

function cardName(cardId: CardID): string {
  return cardId === 'card-embargo'
    ? 'Embargo'
    : cardId === 'neutral-disruption'
      ? 'Disruption'
      : cardId === 'neutral-sabotage'
        ? 'Sabotage'
        : cardId;
}

function missingTargetMessage(sources: BattlePlayedCard[]): string {
  const names = [...new Set(sources.map((source) => cardName(source.cardId)))];
  return names.length === 1
    ? `${names[0]} requires a target.`
    : `${names.join(' and ')} require targets.`;
}

function tooManyTargetsMessage(sources: BattlePlayedCard[]): string {
  if (sources.length === 1) return `${cardName(sources[0].cardId)} may choose only one target.`;
  return 'Each active cancellation card may choose only one target.';
}

/**
 * Validates all revealed Battle-card cancellation targets as one ordered batch.
 * Ordering matters for stacked Decoys: each remaining Decoys copy must be
 * canceled before later cancellation effects may target another active card.
 */
export function validateBattleCancellationTargets(context: EffectContext): void {
  if (!context.battle) return;

  const allTargets = context.battleCardTargets ?? [];
  const cancellationTargets = allTargets.filter((target) => isBattleCancellationCard(target.sourceCardId));
  const participants = [context.battle.attacker, context.battle.defender];

  for (const target of cancellationTargets) {
    const source = participantFor(context, target.sourceOwner);
    if (!source || !isBattleCancellationCard(target.sourceCardId)) {
      throw new Error(`Invalid ${cardName(target.sourceCardId)} source.`);
    }
    const availableSource = activeBattleCancellationCards(source)
      .some((played) => played.cardId === target.sourceCardId);
    if (!availableSource) throw new Error(`Invalid ${cardName(target.sourceCardId)} source.`);
  }

  for (const participant of participants) {
    const sources = activeBattleCancellationCards(participant);
    if (sources.length === 0) continue;
    const opponent = otherParticipant(context, participant.playerId);
    if (!opponent) continue;

    const remainingOpposingCards = activePlayedCards(opponent);
    const requiredTargetCount = Math.min(sources.length, remainingOpposingCards.length);
    const chosenTargets = cancellationTargets.filter((target) => target.sourceOwner === participant.playerId);

    if (chosenTargets.length < requiredTargetCount) throw new Error(missingTargetMessage(sources));
    if (chosenTargets.length > requiredTargetCount) throw new Error(tooManyTargetsMessage(sources));

    const remainingSourceIds = sources.map((source) => source.cardId);
    for (const target of chosenTargets) {
      if (!removeOne(remainingSourceIds, (cardId) => cardId === target.sourceCardId)) {
        throw new Error(`Invalid ${cardName(target.sourceCardId)} source.`);
      }
      if (target.targetOwner !== opponent.playerId) {
        throw new Error(`Invalid ${cardName(target.sourceCardId)} target.`);
      }

      const decoysRemain = remainingOpposingCards.some((card) => card.cardId === 'neutral-decoys');
      const eligibleTargets = decoysRemain
        ? remainingOpposingCards.filter((card) => card.cardId === 'neutral-decoys')
        : remainingOpposingCards;
      const chosen = eligibleTargets.find((card) => (
        card.cardId === target.targetCardId && card.owner === target.targetOwner
      ));
      if (!chosen) {
        const otherwiseActive = remainingOpposingCards.some((card) => (
          card.cardId === target.targetCardId && card.owner === target.targetOwner
        ));
        throw new Error(
          otherwiseActive
            ? 'Decoys must be canceled before another active Battle card.'
            : `Invalid ${cardName(target.sourceCardId)} target.`,
        );
      }
      removeOne(remainingOpposingCards, (card) => card === chosen);
    }
  }
}

/** Backward-compatible entry point retained for existing Embargo callers/tests. */
export function validateEmbargoTargets(context: EffectContext): void {
  validateBattleCancellationTargets(context);
}
