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

function canonicalTerritoryIdCandidates(territoryId: string): string[] {
  const candidates = new Set([territoryId]);
  if (territoryId.startsWith('territory-')) {
    candidates.add(territoryId.slice('territory-'.length));
  } else {
    candidates.add(`territory-${territoryId}`);
  }
  return [...candidates];
}

/**
 * Returns true for both canonical v0.6 Territory IDs and the legacy unprefixed
 * IDs still accepted by older engine rules and tests.
 */
export function territoryHasPrintedEffect(space?: BoardSpaceState): boolean {
  if (!space
    || !space.revealed
    || (space.kind !== 'territory' && space.kind !== 'arena')
    || !space.territoryId) return false;
  return canonicalTerritoryIdCandidates(space.territoryId)
    .some((territoryId) => v06CanonicalContent.territoriesById.has(territoryId));
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
