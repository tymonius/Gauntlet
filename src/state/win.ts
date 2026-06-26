import type { GameState, PlayerID, SpaceID } from '../types';

export type WinConditionReason = 'opponent_heartland_occupied';

export interface WinConditionResult {
  winner: PlayerID;
  reason: WinConditionReason;
  spaceId: SpaceID;
  defeatedPlayer: PlayerID;
}

function heartlandOwnerFromSpaceId(spaceId: SpaceID): PlayerID | undefined {
  const match = /^(.+)-heartland$/.exec(spaceId);
  return match?.[1];
}

export function checkWinConditions(game: GameState): WinConditionResult | undefined {
  for (const space of game.board.spaces) {
    if (space.kind !== 'heartland' || !space.occupant) continue;

    const heartlandOwner = space.controller ?? heartlandOwnerFromSpaceId(space.id);
    if (!heartlandOwner || heartlandOwner === space.occupant) continue;

    return {
      winner: space.occupant,
      defeatedPlayer: heartlandOwner,
      reason: 'opponent_heartland_occupied',
      spaceId: space.id,
    };
  }

  return undefined;
}

export function applyWinConditionResult(game: GameState, result: WinConditionResult | undefined): void {
  if (!result || game.winner) return;

  game.winner = result.winner;
  game.phase = 'game_over';
  game.priorityPlayer = result.winner;
  game.battle = undefined;
  game.pendingAssetBankDiscards = undefined;
}

export function evaluateWinConditions(game: GameState): WinConditionResult | undefined {
  const result = checkWinConditions(game);
  applyWinConditionResult(game, result);
  return result;
}
