import type { PlayerId } from './rules';
import type { V070GameState } from './engine';
import * as previous from './views-pre-capital-gains';
import { pendingV070CapitalGainsAftermath } from './capital-gains-battle';
import { pendingV070ExcommunicationAftermath } from './excommunication-battle';
import { pendingV070SuppliesAftermath } from './supplies-battle';

export * from './views-pre-capital-gains';

export interface V070CapitalGainsAftermathView {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export interface V070ExcommunicationAftermathView {
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  maximumCombinedValue: 3;
  candidateInstanceIds?: string[];
}

export interface V070SuppliesAftermathView {
  playerId: PlayerId;
  owner: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export type V070GameView = previous.V070GameView & {
  pendingCapitalGainsAftermath: V070CapitalGainsAftermathView | null;
  pendingExcommunicationAftermath: V070ExcommunicationAftermathView | null;
  pendingSuppliesAftermath: V070SuppliesAftermathView | null;
};

export function viewV070GameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): V070GameView {
  const core = previous.viewV070GameForPlayer(state, viewer);
  const capitalGains = pendingV070CapitalGainsAftermath(state);
  const pendingCapitalGainsAftermath: V070CapitalGainsAftermathView | null =
    capitalGains
      ? {
          playerId: capitalGains.playerId,
          owner: capitalGains.owner,
          sourceInstanceId: capitalGains.sourceInstanceId,
          candidateCount: capitalGains.candidateInstanceIds.length,
          ...(viewer === capitalGains.playerId
            ? {
                candidateInstanceIds: [...capitalGains.candidateInstanceIds],
              }
            : {}),
        }
      : null;

  const excommunication = pendingV070ExcommunicationAftermath(state);
  const pendingExcommunicationAftermath:
    V070ExcommunicationAftermathView | null = excommunication
      ? {
          playerId: excommunication.playerId,
          owner: excommunication.owner,
          opponent: excommunication.opponent,
          sourceInstanceId: excommunication.sourceInstanceId,
          candidateCount: excommunication.candidateInstanceIds.length,
          maximumCombinedValue: excommunication.maximumCombinedValue,
          ...(viewer === excommunication.playerId
            ? {
                candidateInstanceIds: [
                  ...excommunication.candidateInstanceIds,
                ],
              }
            : {}),
        }
      : null;

  const supplies = pendingV070SuppliesAftermath(state);
  const pendingSuppliesAftermath: V070SuppliesAftermathView | null = supplies
    ? {
        playerId: supplies.playerId,
        owner: supplies.owner,
        sourceInstanceId: supplies.sourceInstanceId,
        candidateCount: supplies.candidateInstanceIds.length,
        ...(viewer === supplies.playerId
          ? {
              candidateInstanceIds: [...supplies.candidateInstanceIds],
            }
          : {}),
      }
    : null;

  return {
    ...core,
    pendingCapitalGainsAftermath,
    pendingExcommunicationAftermath,
    pendingSuppliesAftermath,
  };
}
