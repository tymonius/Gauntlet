import type { CardID } from './ids';

export type IntelligenceMissionKind = 'normal' | 'special_operation';

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
}

export interface PublicIntelligenceState {
  activeMission?: PublicIntelligenceMissionView;
  specialOperation?: PublicIntelligenceMissionView;
}
