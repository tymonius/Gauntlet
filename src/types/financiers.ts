import type { CardID, PlayerID, SpaceID } from './ids';

export interface FinancierState {
  treasury: CardID[];
  deedsOwned: SpaceID[];
  subsidizeBonusThisBattle?: number;
  subsidizeOfferedBattleId?: string;
  hostileTakeoverEligibleSpaceId?: SpaceID;
  lineOfCreditUsedTurn?: number;
}

export type PendingFinancierChoice =
  | { kind: 'play_the_market'; playerId: PlayerID; cardId: CardID; options: [1, 2, 3, 4, 5, 6] }
  | { kind: 'subsidize'; playerId: PlayerID; battleId: string; maximumBonus: number; options: number[] }
  | { kind: 'deed_purchase'; playerId: PlayerID; spaceId: SpaceID; cost: number; currentOwner?: PlayerID; collateralOptions: CardID[]; maximumCollateralContribution: number; hostileTakeover?: boolean };
