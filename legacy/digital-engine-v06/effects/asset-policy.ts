import type { GameState } from '../types/game';
import type { CardID, PlayerID } from '../types/ids';
import type { PlayerState } from '../types/player';

export const ILLEGAL_OCCUPATION = 'neutral-illegal-occupation';

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

/** Counts only physical banked Assets that are currently face up. */
export function faceUpAssetCount(player: PlayerState): number {
  const remaining = [...player.zones.assetBank];
  let faceDown = 0;
  for (const cardId of player.faceDownAssets ?? []) {
    if (removeOne(remaining, cardId)) faceDown += 1;
  }
  return Math.max(0, player.zones.assetBank.length - faceDown);
}

export function faceDownAssetCount(player: PlayerState, cardId?: CardID): number {
  const remaining = [...player.zones.assetBank];
  let count = 0;
  for (const candidate of player.faceDownAssets ?? []) {
    if (!removeOne(remaining, candidate)) continue;
    if (!cardId || candidate === cardId) count += 1;
  }
  return count;
}

export function faceUpAssetCopies(player: PlayerState, cardId: CardID): number {
  const total = player.zones.assetBank.filter((candidate) => candidate === cardId).length;
  return Math.max(0, total - faceDownAssetCount(player, cardId));
}

/**
 * Returns the controller whose banked Illegal Occupation is suppressing the
 * target player's Asset Bank, if any. The source Asset must itself be active.
 */
export function illegalOccupationSourceFor(
  game: GameState,
  targetPlayerId: PlayerID,
): PlayerID | undefined {
  const occupied = game.board.spaces.find((space) => space.occupant === targetPlayerId);
  if (!occupied || occupied.kind !== 'territory') return undefined;
  const sourcePlayerId = occupied.controller;
  if (!sourcePlayerId || sourcePlayerId === targetPlayerId) return undefined;
  if (faceUpAssetCopies(game.players[sourcePlayerId], ILLEGAL_OCCUPATION) < 1) return undefined;
  if (game.battle?.bankedAssetUseProhibited?.includes(sourcePlayerId)) return undefined;
  return sourcePlayerId;
}

export function illegalOccupationSuppressesBankedAssets(
  game: GameState,
  targetPlayerId: PlayerID,
): boolean {
  return Boolean(illegalOccupationSourceFor(game, targetPlayerId));
}

/** Returns whether the player's banked card effects are currently active. */
export function bankedAssetUseAllowed(game: GameState, playerId: PlayerID): boolean {
  return !game.battle?.bankedAssetUseProhibited?.includes(playerId)
    && !illegalOccupationSuppressesBankedAssets(game, playerId);
}

/** Returns the number of active face-up copies of one banked Asset. */
export function activeBankedAssetCopies(game: GameState, playerId: PlayerID, cardId: CardID): number {
  if (!bankedAssetUseAllowed(game, playerId)) return 0;
  const player = game.players[playerId];
  if (!player) return 0;
  const seditionSuppressed = game.battle?.seditionInactiveAssets?.[playerId]
    ?.filter((candidate) => candidate === cardId).length ?? 0;
  return Math.max(0, faceUpAssetCopies(player, cardId) - seditionSuppressed);
}

export function bankedAssetCardUseAllowed(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return activeBankedAssetCopies(game, playerId, cardId) > 0;
}
