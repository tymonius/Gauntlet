import { v06CanonicalContent } from '../content/v06';
import type { BoardSpaceState, GameState, PlayerID, SpaceID } from '../types';

function pathfindersSuppressionApplies(
  game: GameState,
  playerId: PlayerID,
  spaceId: SpaceID,
): boolean {
  const movementSequenceIsActive = game.activePlayer === playerId
    && (game.phase === 'movement' || game.phase === 'battle');
  if (!movementSequenceIsActive) return false;
  return game.neutralPathfindersSuppressions?.some((suppression) => (
    suppression.playerId === playerId
    && suppression.spaceId === spaceId
    && suppression.turn === game.turn
  )) ?? false;
}

function overlaySuppressesPrintedEffect(space: BoardSpaceState): boolean {
  return space.overlays?.some((overlay) => (
    overlay.faceUp && overlay.cardId === 'neutral-siege-weaponry'
  )) ?? false;
}

export function territoryHasPrintedEffect(space?: BoardSpaceState): boolean {
  if (!space || (space.kind !== 'territory' && space.kind !== 'arena') || !space.territoryId) return false;
  return v06CanonicalContent.territoriesById.has(space.territoryId);
}

/**
 * Shared source of truth for whether a Territory's printed effect is active in
 * the current movement/battle context. Future Territory rules should consult
 * this helper rather than testing only the Territory ID.
 */
export function territoryPrintedEffectIsActive(
  game: GameState,
  space: BoardSpaceState | undefined,
  movementPlayerId: PlayerID = game.activePlayer,
): boolean {
  if (!territoryHasPrintedEffect(space)) return false;
  if (pathfindersSuppressionApplies(game, movementPlayerId, space!.id)) return false;
  if (overlaySuppressesPrintedEffect(space!)) return false;
  return true;
}

export function clearExpiredPathfindersSuppressions(game: GameState): void {
  const retained = game.neutralPathfindersSuppressions?.filter((suppression) => suppression.turn >= game.turn) ?? [];
  game.neutralPathfindersSuppressions = retained.length > 0 ? retained : undefined;
}
