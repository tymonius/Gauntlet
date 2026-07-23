import type { BattleParticipantState, BattleState, CardID, PlayerID } from '../types';

function counts(cards: CardID[]): Map<CardID, number> {
  const result = new Map<CardID, number>();
  for (const cardId of cards) result.set(cardId, (result.get(cardId) ?? 0) + 1);
  return result;
}

export function availableBattleHandCards(
  battle: BattleState,
  participant: BattleParticipantState,
): CardID[] {
  const blocked = counts(battle.blockedBattleDrawCards?.[participant.playerId] ?? []);
  const seen = new Map<CardID, number>();
  return participant.battleDraw.filter((cardId) => {
    const occurrence = (seen.get(cardId) ?? 0) + 1;
    seen.set(cardId, occurrence);
    return occurrence > (blocked.get(cardId) ?? 0);
  });
}

export function removeAvailableBattleHandCard(
  battle: BattleState,
  participant: BattleParticipantState,
  cardId: CardID,
): boolean {
  const blockedCount = (battle.blockedBattleDrawCards?.[participant.playerId] ?? []).filter((candidate) => candidate === cardId).length;
  let occurrence = 0;
  const index = participant.battleDraw.findIndex((candidate) => {
    if (candidate !== cardId) return false;
    occurrence += 1;
    return occurrence > blockedCount;
  });
  if (index < 0) return false;
  participant.battleDraw.splice(index, 1);
  return true;
}

export function blockBattleHandCard(
  battle: BattleState,
  playerId: PlayerID,
  cardId: CardID,
): void {
  battle.blockedBattleDrawCards ??= {};
  battle.blockedBattleDrawCards[playerId] ??= [];
  battle.blockedBattleDrawCards[playerId]!.push(cardId);
}
