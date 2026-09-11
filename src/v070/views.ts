import type { PlayerId } from './rules';
import type { V070GameState } from './engine';
import {
  viewV070GameForPlayer as viewV070GameForPlayerCore,
  type V070GameView as V070CoreGameView,
} from './views-core';
import { pendingV070SubversionTurnAsset } from './subversion-turn';
import { pendingV070CompoundInterestChoice } from './compound-interest';

export * from './views-core';

export interface V070SubversionTurnAssetView {
  playerId: PlayerId;
  targetOwner: PlayerId;
  targetAssetInstanceId: string;
  effectLabel: string;
  candidateCount: number;
  candidateSubversionInstanceIds?: string[];
}

export interface V070CompoundInterestView {
  kind: 'use' | 'destination';
  playerId: PlayerId;
  assetInstanceId: string;
  revealedInstanceId?: string;
  revealedCardId?: string;
}

export type V070GameView = V070CoreGameView & {
  pendingSubversionTurnAsset: V070SubversionTurnAssetView | null;
  pendingCompoundInterestChoice: V070CompoundInterestView | null;
};

export function viewV070GameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): V070GameView {
  const core = viewV070GameForPlayerCore(state, viewer);
  const pending = pendingV070SubversionTurnAsset(state);
  const pendingSubversionTurnAsset: V070SubversionTurnAssetView | null =
    pending
      ? {
          playerId: pending.playerId,
          targetOwner: pending.targetOwner,
          targetAssetInstanceId: pending.targetAssetInstanceId,
          effectLabel: pending.effectLabel,
          candidateCount: pending.candidateSubversionInstanceIds.length,
          ...(pending.playerId === viewer
            ? {
                candidateSubversionInstanceIds: [
                  ...pending.candidateSubversionInstanceIds,
                ],
              }
            : {}),
        }
      : null;

  const compound = pendingV070CompoundInterestChoice(state);
  const pendingCompoundInterestChoice: V070CompoundInterestView | null =
    compound
      ? compound.kind === 'destination'
        ? {
            kind: compound.kind,
            playerId: compound.playerId,
            assetInstanceId: compound.assetInstanceId,
            revealedInstanceId: compound.revealedInstanceId,
            revealedCardId:
              state.cardInstances[compound.revealedInstanceId]?.cardId,
          }
        : {
            kind: compound.kind,
            playerId: compound.playerId,
            assetInstanceId: compound.assetInstanceId,
          }
      : null;

  return {
    ...core,
    pendingSubversionTurnAsset,
    pendingCompoundInterestChoice,
  };
}
