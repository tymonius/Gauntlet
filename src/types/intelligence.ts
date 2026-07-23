import type { CardID, PlayerID, SpaceID } from './ids';

export type IntelligenceMissionKind = 'normal' | 'special_operation';
export type IntelligenceBattleSource = 'hand' | 'battle_draw';

export interface PublicIntelligenceMissionView {
  faceDown?: true;
  kind: IntelligenceMissionKind;
  startedTurn: number;
}

export interface IntelligenceMissionState extends PublicIntelligenceMissionView {
  cardId: CardID;
  requirementSatisfied: boolean;
  evidence: string[];
  startedLogIndex?: number;
}

export interface IgnoredTerritoryEffectsState {
  turn: number;
  effectKeys: string[];
}

export interface IntelligenceState {
  activeMission?: IntelligenceMissionState;
  specialOperation?: IntelligenceMissionState;
  surveillanceUsedBattleId?: string;
  ignoredTerritoryEffects?: IgnoredTerritoryEffectsState;
}

export interface PublicIntelligenceState {
  activeMission?: PublicIntelligenceMissionView;
  specialOperation?: PublicIntelligenceMissionView;
}

interface PendingIntelligenceBattleCard {
  battleId: string;
  targetOwner: PlayerID;
  targetCardId: CardID;
  targetSource: IntelligenceBattleSource;
  resumePriorityPlayer?: PlayerID;
}

export type PendingIntelligenceChoice =
  | (PendingIntelligenceBattleCard & {
      kind: 'surveillance';
      playerId: PlayerID;
      options: ['pass', 'surveil'];
    })
  | (PendingIntelligenceBattleCard & {
      kind: 'interference';
      playerId: PlayerID;
      options: ['pass', 'interfere'];
    })
  | {
      kind: 'interference_replacement';
      playerId: PlayerID;
      intelligencePlayerId: PlayerID;
      battleId: string;
      source: IntelligenceBattleSource;
      removedCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'mission_control';
      playerId: PlayerID;
      battleId?: never;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'fieldcraft';
      playerId: PlayerID;
      battleId?: never;
      spaceId: SpaceID;
      effectId: string;
      options: ['pass', 'ignore'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'spies_discard';
      playerId: PlayerID;
      battleId?: never;
      opponentId: PlayerID;
      inspectedHand: CardID[];
      handOptions: CardID[];
      options: ['select'];
    }
  | {
      kind: 'assassins_discard';
      playerId: PlayerID;
      battleId?: never;
      opponentId: PlayerID;
      opponentHandOptions: CardID[];
      options: ['select'];
    }
  | {
      kind: 'operational_reassessment';
      playerId: PlayerID;
      battleId?: never;
      returnedMissionCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['select'];
    };
