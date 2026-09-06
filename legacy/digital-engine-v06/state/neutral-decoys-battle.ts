import type { BattleParticipantState, BattlePlayedCard, CardID } from '../types/v06';

export const DECOYS = 'neutral-decoys';

export function activeBattleCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => Boolean(
      card && !card.canceled && !card.negated && !card.virtual,
    ));
}

export function cancellationCandidatesWithDecoysPriority(
  participant: BattleParticipantState,
): BattlePlayedCard[] {
  const active = activeBattleCards(participant);
  const decoys = active.filter((card) => card.cardId === DECOYS);
  return decoys.length > 0 ? decoys : active;
}

export function cancellationTargetCardIdsWithDecoysPriority(
  participant: BattleParticipantState,
): CardID[] {
  return [...new Set(
    cancellationCandidatesWithDecoysPriority(participant)
      .map((card) => card.cardId),
  )];
}

export function cancellationTargetAllowedByDecoys(
  participant: BattleParticipantState,
  cardId: CardID,
): boolean {
  return cancellationTargetCardIdsWithDecoysPriority(participant).includes(cardId);
}
