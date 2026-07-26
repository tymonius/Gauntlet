import type { GameEvent, GameState, PlayerID } from '../types';

export const FEALTY = 'neutral-fealty';

function hasActiveFealtyAsset(game: GameState, playerId: PlayerID): boolean {
  if (game.battle?.bankedAssetUseProhibited?.includes(playerId)) return false;
  return game.players[playerId]?.zones.assetBank.includes(FEALTY) ?? false;
}

/**
 * Fealty protects only against disadvantage created by an opposing card effect.
 * It does not prevent disadvantage from the protected player's own effects or
 * non-card rules, and a banked copy is inactive when banked Asset use is
 * prohibited for that player in the current battle.
 */
export function fealtyPreventsOpposingCardDisadvantage(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
): boolean {
  return sourcePlayerId !== targetPlayerId && hasActiveFealtyAsset(game, targetPlayerId);
}

export function logFealtyDisadvantagePrevention(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
  sourceName: string,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: targetPlayerId,
    type: 'neutral_fealty_prevented_disadvantage',
    message: `${game.players[targetPlayerId].name}'s Fealty prevented disadvantage from ${sourceName}.`,
    payload: { sourcePlayerId, targetPlayerId, sourceName },
    visibility: 'public',
  } satisfies GameEvent);
}
