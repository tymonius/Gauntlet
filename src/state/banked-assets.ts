import type { GameState, PlayerID } from '../types';
import { illegalOccupationSuppressesBankedAssets } from './neutral-illegal-occupation';

/** Returns whether the player's banked card effects are currently active. */
export function bankedAssetUseAllowed(game: GameState, playerId: PlayerID): boolean {
  return !game.battle?.bankedAssetUseProhibited?.includes(playerId)
    && !illegalOccupationSuppressesBankedAssets(game, playerId);
}
