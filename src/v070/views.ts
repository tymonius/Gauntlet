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
import { pendingV070LandslideAftermath } from './landslide';
import { pendingV070CounterworksBattleChoice } from './counterworks-battle';
import { pendingV070AccusationAftermath } from './accusation-battle';
import { pendingV070ActOfFaithAftermath } from './act-of-faith-battle';
import {
  pendingV070BrothersInArmsAdditionalTactic,
} from './brothers-in-arms-battle';

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

export interface V070LandslideAftermathView {
  playerId: PlayerId;
  territoryInstanceId: string;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export interface V070CounterworksBattleView {
  playerId: PlayerId;
  sourceInstanceId: string;
  territoryPosition: number;
  candidateOverlayCount: number;
  candidateOverlayInstanceIds: string[];
  canSuppressOverlay: boolean;
  canPreventNextOpposingOverlay: true;
}

export interface V070AccusationAftermathView {
  stage: 'target' | 'destination';
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  targetInstanceId?: string;
  candidateInstanceIds?: string[];
}

export interface V070ActOfFaithAftermathView {
  stage: 'reveal_count' | 'graveyard';
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  maximumRevealCount: number;
  candidateCount: number;
  candidateInstanceIds?: string[];
}

export interface V070BrothersInArmsAdditionalTacticView {
  playerId: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  optional: true;
  candidateInstanceIds?: string[];
}

export type V070GameView = V070PostDrawGameView & {
  pendingWarBondsChoice: V070WarBondsView | null;
  pendingReembodimentRecovery: V070ReembodimentRecoveryView | null;
  pendingLandslideAftermath: V070LandslideAftermathView | null;
  pendingCounterworksBattle: V070CounterworksBattleView | null;
  pendingAccusationAftermath: V070AccusationAftermathView | null;
  pendingActOfFaithAftermath: V070ActOfFaithAftermathView | null;
  pendingBrothersInArmsAdditionalTactic:
    V070BrothersInArmsAdditionalTacticView | null;
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
  const landslide = pendingV070LandslideAftermath(state);
  const pendingLandslideAftermath: V070LandslideAftermathView | null = landslide
    ? {
        playerId: landslide.playerId,
        territoryInstanceId: landslide.territoryInstanceId,
        candidateCount: landslide.candidateInstanceIds.length,
        ...(viewer === landslide.playerId
          ? {
              candidateInstanceIds: [...landslide.candidateInstanceIds],
            }
          : {}),
      }
    : null;
  const counterworks = pendingV070CounterworksBattleChoice(state);
  const pendingCounterworksBattle: V070CounterworksBattleView | null =
    counterworks
      ? {
          playerId: counterworks.owner,
          sourceInstanceId: counterworks.sourceInstanceId,
          territoryPosition: counterworks.territoryPosition,
          candidateOverlayCount:
            counterworks.candidateOverlayInstanceIds.length,
          candidateOverlayInstanceIds: [
            ...counterworks.candidateOverlayInstanceIds,
          ],
          canSuppressOverlay:
            counterworks.candidateOverlayInstanceIds.length > 0,
          canPreventNextOpposingOverlay: true,
        }
      : null;
  const accusation = pendingV070AccusationAftermath(state);
  const pendingAccusationAftermath: V070AccusationAftermathView | null =
    accusation
      ? {
          stage: accusation.stage,
          playerId: accusation.playerId,
          owner: accusation.owner,
          opponent: accusation.opponent,
          sourceInstanceId: accusation.sourceInstanceId,
          candidateCount: accusation.candidateInstanceIds.length,
          ...(accusation.targetInstanceId
            ? { targetInstanceId: accusation.targetInstanceId }
            : {}),
          ...(viewer === accusation.playerId
            ? {
                candidateInstanceIds: [
                  ...accusation.candidateInstanceIds,
                ],
              }
            : {}),
        }
      : null;
  const actOfFaith = pendingV070ActOfFaithAftermath(state);
  const pendingActOfFaithAftermath: V070ActOfFaithAftermathView | null =
    actOfFaith
      ? {
          stage: actOfFaith.stage,
          playerId: actOfFaith.playerId,
          owner: actOfFaith.owner,
          opponent: actOfFaith.opponent,
          sourceInstanceId: actOfFaith.sourceInstanceId,
          maximumRevealCount: actOfFaith.maximumRevealCount,
          candidateCount: actOfFaith.candidateInstanceIds.length,
          ...(actOfFaith.stage === 'graveyard'
            ? {
                candidateInstanceIds: [...actOfFaith.candidateInstanceIds],
              }
            : {}),
        }
      : null;
  const brothersInArms = pendingV070BrothersInArmsAdditionalTactic(state);
  const pendingBrothersInArmsAdditionalTactic:
    V070BrothersInArmsAdditionalTacticView | null = brothersInArms
      ? {
          playerId: brothersInArms.playerId,
          sourceInstanceId: brothersInArms.sourceInstanceId,
          candidateCount: brothersInArms.candidateInstanceIds.length,
          optional: true,
          ...(viewer === brothersInArms.playerId
            ? {
                candidateInstanceIds: [
                  ...brothersInArms.candidateInstanceIds,
                ],
              }
            : {}),
        }
      : null;

  return {
    ...core,
    pendingWarBondsChoice,
    pendingReembodimentRecovery,
    pendingLandslideAftermath,
    pendingCounterworksBattle,
    pendingAccusationAftermath,
    pendingActOfFaithAftermath,
    pendingBrothersInArmsAdditionalTactic,
  };
}
