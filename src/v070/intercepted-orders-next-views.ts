import type { PlayerId } from './rules';
import type { V070GameState } from './engine';
import {
  viewV070GameForPlayer,
  type V070GameView,
} from './views';
import { pendingInterceptedOrdersChoice } from './intercepted-orders-battle-choices';

/** Next-release only: not imported by the frozen v0.7.0/v0.7.2 view facade. */
export interface InterceptedOrdersChoiceView {
  kind: 'target' | 'replacement';
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export type NextReleaseGameView = V070GameView & {
  pendingInterceptedOrders: InterceptedOrdersChoiceView | null;
};

export function viewNextReleaseGameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): NextReleaseGameView {
  const core = viewV070GameForPlayer(state, viewer);
  const pending = pendingInterceptedOrdersChoice(state);
  const pendingInterceptedOrders: InterceptedOrdersChoiceView | null =
    pending
      ? {
          kind: pending.kind,
          playerId: pending.playerId,
          owner: pending.owner,
          sourceInstanceId: pending.sourceInstanceId,
          candidateCount: pending.candidateInstanceIds.length,
          ...(viewer === pending.playerId
            ? { candidateInstanceIds: [...pending.candidateInstanceIds] }
            : {}),
        }
      : null;

  return { ...core, pendingInterceptedOrders };
}
