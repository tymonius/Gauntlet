import type { CardID, GameState, PlayerID } from '../types';

export function markBattleCardsObservedBeforeNormalReveal(
  game: GameState,
  owner: PlayerID,
  cardIds: CardID[],
): void {
  const battle = game.battle;
  if (!battle || cardIds.length === 0) return;
  battle.observedBeforeNormalReveal ??= {};
  battle.observedBeforeNormalReveal[owner] ??= [];
  for (const cardId of cardIds) {
    if (!battle.observedBeforeNormalReveal[owner]!.includes(cardId)) {
      battle.observedBeforeNormalReveal[owner]!.push(cardId);
    }
  }
}

export function wasBattleCardObservedBeforeNormalReveal(
  game: GameState,
  owner: PlayerID,
  cardId: CardID,
): boolean {
  return game.battle?.observedBeforeNormalReveal?.[owner]?.includes(cardId) ?? false;
}
