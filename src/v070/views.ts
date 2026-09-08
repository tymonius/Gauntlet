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
import { pendingV070CounterworksPreRevealChoice } from './counterworks-battle';
import { pendingV070AccusationAftermath } from './accusation-battle';
import { pendingV070ActOfFaithAftermath } from './act-of-faith-battle';
import {
  pendingV070DeferredAftermathOrder,
  type V070DeferredAftermathEffectKind,
} from './battle-aftermath';

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

export interface V070CounterworksPreRevealView {
  kind:
    | 'counterworks_source_order'
    | 'counterworks_target'
    | 'counterintelligence_pre_reveal'
    | 'counterworks_replacement';
  playerId: PlayerId;
  role: 'gambit' | 'tactic';
  candidateCount: number;
  optional: boolean;
  candidateInstanceIds?: string[];
}

export interface V070DeferredAftermathOrderView {
  playerId: PlayerId;
  candidateCount: number;
  candidateKinds?: V070DeferredAftermathEffectKind[];
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
  playerId: PlayerId;
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateCount: number;
  candidateInstanceIds: string[];
}

export type V070GameView = V070PostDrawGameView & {
  pendingWarBondsChoice: V070WarBondsView | null;
  pendingReembodimentRecovery: V070ReembodimentRecoveryView | null;
  pendingLandslideAftermath: V070LandslideAftermathView | null;
  pendingCounterworksPreReveal: V070CounterworksPreRevealView | null;
  pendingDeferredAftermathOrder: V070DeferredAftermathOrderView | null;
  pendingAccusationAftermath: V070AccusationAftermathView | null;
  pendingActOfFaithAftermath: V070ActOfFaithAftermathView | null;
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
  const preReveal = pendingV070CounterworksPreRevealChoice(state);
  const pendingCounterworksPreReveal: V070CounterworksPreRevealView | null =
    preReveal
      ? {
          kind: preReveal.kind,
          playerId: preReveal.playerId,
          role: preReveal.role,
          candidateCount: preReveal.candidateInstanceIds.length,
          optional: preReveal.kind === 'counterworks_replacement',
          ...(viewer === preReveal.playerId
            ? {
                candidateInstanceIds: [...preReveal.candidateInstanceIds],
              }
            : {}),
        }
      : null;
  const aftermathOrder = pendingV070DeferredAftermathOrder(state);
  const pendingDeferredAftermathOrder: V070DeferredAftermathOrderView | null =
    aftermathOrder
      ? {
          playerId: aftermathOrder.playerId,
          candidateCount: aftermathOrder.candidateKinds.length,
          ...(viewer === aftermathOrder.playerId
            ? { candidateKinds: [...aftermathOrder.candidateKinds] }
            : {}),
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
          playerId: actOfFaith.playerId,
          owner: actOfFaith.owner,
          opponent: actOfFaith.opponent,
          sourceInstanceId: actOfFaith.sourceInstanceId,
          candidateCount: actOfFaith.candidateInstanceIds.length,
          // Act of Faith explicitly reveals these cards, so their instance
          // identities are public to both players while the choice is pending.
          candidateInstanceIds: [...actOfFaith.candidateInstanceIds],
        }
      : null;

  return {
    ...core,
    pendingWarBondsChoice,
    pendingReembodimentRecovery,
    pendingLandslideAftermath,
    pendingCounterworksPreReveal,
    pendingDeferredAftermathOrder,
    pendingAccusationAftermath,
    pendingActOfFaithAftermath,
  };
}
