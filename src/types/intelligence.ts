import type { CardID, PlayerID } from './ids';

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
}

export interface IntelligenceState {
  activeMission?: IntelligenceMissionState;
  specialOperation?: IntelligenceMissionState;
  surveillanceUsedBattleId?: string;
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
    };
