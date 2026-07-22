import type { CardID, PlayerID, SpaceID } from './ids';

export interface TerritoryOverlayState {
  cardId: CardID;
  owner: PlayerID;
  faceUp: boolean;
}

export interface MilitaryCardState {
  storedCards: Partial<Record<CardID, CardID>>;
  freeOrderAbilityIds: string[];
  pursuitBattleCount: number;
  victoryRestrictions?: {
    noMovement?: boolean;
    noCapture?: boolean;
    noOrders?: boolean;
  };
}

export type PendingMilitaryChoice =
  | {
      kind: 'battlefield_promotion';
      playerId: PlayerID;
      sourceCardId: CardID;
      options: CardID[];
    }
  | {
      kind: 'shock_and_awe';
      playerId: PlayerID;
      sourceCardId: CardID;
      location: SpaceID;
      defeatedPlayer: PlayerID;
      options: Array<'breakthrough' | 'consolidate'>;
    };
