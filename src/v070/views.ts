import type { PlayerId } from './rules';
import type { V070GameState } from './engine';
import {
  viewV070GameForPlayer as viewV070GameForPlayerPostDraw,
  type V070GameView as V070PostDrawGameView,
} from './views-postdraw';
import { pendingV070WarBondsChoice } from './war-bonds';
import {
  viewV070ReembodimentRecoveryForPlayer,
} from './reembodiment';

export * from './views-postdraw';

export interface V070WarBondsView {
  playerId: PlayerId;
  assetInstanceId: string;
  handCount: number;
  candidateHandInstanceIds?: string[];
}

export interface V070ReembodimentRecoveryView {
  playerId: PlayerId;
  assetInstanceId: string;
  sourceLabel: string;
  triggerValue: number;
  candidateCount: number;
  duringBattle: boolean;
  candidateInstanceIds?: string[];
}

export type V070GameView = V070PostDrawGameView & {
  pendingWarBondsChoice: V070WarBondsView | null;
  pendingReembodimentRecovery: V070ReembodimentRecoveryView | null;
};

export function viewV070GameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): V070GameView {
  const core = viewV070GameForPlayerPostDraw(state, viewer);
  const pending = pendingV070WarBondsChoice(state);
  const pendingWarBondsChoice: V070WarBondsView | null = pending
    ? {
        playerId: pending.playerId,
        assetInstanceId: pending.assetInstanceId,
        handCount: state.players[pending.playerId].zones.hand.length,
        ...(viewer === pending.playerId
          ? {
              candidateHandInstanceIds: [
                ...state.players[pending.playerId].zones.hand,
              ],
            }
          : {}),
      }
    : null;
  const pendingReembodimentRecovery =
    viewV070ReembodimentRecoveryForPlayer(state, viewer);

  return {
    ...core,
    pendingWarBondsChoice,
    pendingReembodimentRecovery,
  };
}
