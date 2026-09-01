import type { CardID, GameState, PlayerID } from '../types/v06';
import { faceUpAssetCopies } from './asset-facing';
import { illegalOccupationSuppressesBankedAssets } from './neutral-illegal-occupation';

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
