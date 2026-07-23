import type { CardID, SpaceID } from './ids';

export interface FinancierState {
  treasury: CardID[];
  deedsOwned: SpaceID[];
  subsidizeBonusThisBattle?: number;
  hostileTakeoverEligibleSpaceId?: SpaceID;
  lineOfCreditUsedTurn?: number;
}

export type PendingFinancierChoice =
  | { kind: 'play_the_market'; playerId: string; cardId: CardID; options: [1, 2, 3, 4, 5, 6] }
  | { kind: 'subsidize'; playerId: string; maximumBonus: number; options: number[] }
  | { kind: 'deed_purchase'; playerId: string; spaceId: SpaceID; cost: number; currentOwner?: string; collateralOptions: CardID[]; maximumCollateralContribution: number };
