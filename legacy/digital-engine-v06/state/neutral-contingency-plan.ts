import type { CardID, GameEvent, GameState, PlayerID } from '../types/v06';
import { drawFromDeck } from './draw';

export const CONTINGENCY_PLAN = 'neutral-contingency-plan';

/**
 * Resolves the Action-form trigger only when Contingency Plan was discarded by
 * the engine's Asset-limit discard-down action. Other ways the Asset leaves
 * play do not call this hook.
 */
export function applyContingencyPlanAssetLimitDraw(
  game: GameState,
  playerId: PlayerID,
  discardedCardIds: readonly CardID[],
  activeCopiesBeforeDiscard?: number,
): CardID[] {
  const discardedCopies = discardedCardIds.filter((cardId) => cardId === CONTINGENCY_PLAN).length;
  const copyCount = Math.min(discardedCopies, activeCopiesBeforeDiscard ?? discardedCopies);
  if (copyCount === 0) return [];

  const player = game.players[playerId];
  if (!player) return [];

  const draw = drawFromDeck(player, { count: copyCount });
  player.zones.hand.push(...draw.drawnCards);
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: playerId,
    type: 'neutral_contingency_plan_draw',
    message: `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} after discarding Contingency Plan because their Asset limit decreased.`,
    payload: {
      discardedCopies: copyCount,
      drawnCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
    visibility: 'public',
  } satisfies GameEvent);
  return draw.drawnCards;
}
