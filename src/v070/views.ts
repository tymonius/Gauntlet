import type { PlayerId } from './rules';
import type { V070GameState } from './engine';
import * as previous from './views-pre-capital-gains';
import { pendingV070CapitalGainsAftermath } from './capital-gains-battle';

export * from './views-pre-capital-gains';

export interface V070CapitalGainsAftermathView {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export type V070GameView = previous.V070GameView & {
  pendingCapitalGainsAftermath: V070CapitalGainsAftermathView | null;
};

export function viewV070GameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): V070GameView {
  const core = previous.viewV070GameForPlayer(state, viewer);
  const pending = pendingV070CapitalGainsAftermath(state);
  const pendingCapitalGainsAftermath: V070CapitalGainsAftermathView | null =
    pending
      ? {
          playerId: pending.playerId,
          owner: pending.owner,
          sourceInstanceId: pending.sourceInstanceId,
          candidateCount: pending.candidateInstanceIds.length,
          ...(viewer === pending.playerId
            ? {
                candidateInstanceIds: [...pending.candidateInstanceIds],
              }
            : {}),
        }
      : null;

  return {
    ...core,
    pendingCapitalGainsAftermath,
  };
}
