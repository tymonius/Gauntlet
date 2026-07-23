import type { CardID } from './ids';

export type IntelligenceMissionKind = 'normal' | 'special_operation';

export interface IntelligenceMissionState {
  cardId: CardID;
  kind: IntelligenceMissionKind;
  startedTurn: number;
  requirementSatisfied: boolean;
  evidence: string[];
}

export interface IntelligenceState {
  activeMission?: IntelligenceMissionState;
  specialOperation?: IntelligenceMissionState;
}

export interface PublicIntelligenceMissionView {
  faceDown: true;
  kind: IntelligenceMissionKind;
  startedTurn: number;
}

export interface PublicIntelligenceState {
  activeMission?: PublicIntelligenceMissionView;
  specialOperation?: PublicIntelligenceMissionView;
}
