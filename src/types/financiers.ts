import type { CardID, PlayerID, SpaceID } from './ids';

export interface FinancierSpeculationState {
  cardId: CardID;
  spaceId: SpaceID;
  resolvesTurn: number;
}

export interface FinancierCapitalGainsState {
  investmentId: string;
  cardId: CardID;
  treasuryCardId: CardID;
  resolvesTurn: number;
}

export interface FinancierMarginLoanState {
  loanId: string;
  cardId: CardID;
  collateralCardId: CardID;
  collateralValue: number;
  resolvesTurn: number;
}

export interface FinancierState {
  treasury: CardID[];
  deedsOwned: SpaceID[];
  speculations?: FinancierSpeculationState[];
  capitalGains?: FinancierCapitalGainsState[];
  marginLoans?: FinancierMarginLoanState[];
  tariffsBankedTurn?: number;
  subsidizeBonusThisBattle?: number;
  subsidizeOfferedBattleId?: string;
  hostileTakeoverEligibleSpaceId?: SpaceID;
  lineOfCreditUsedTurn?: number;
}

export type PendingFinancierChoice =
  | { kind: 'play_the_market'; playerId: PlayerID; cardId: CardID; options: [1, 2, 3, 4, 5, 6] }
  | { kind: 'subsidize'; playerId: PlayerID; battleId: string; maximumBonus: number; options: number[] }
  | { kind: 'liquidation_purchase'; playerId: PlayerID; spaceOptions: SpaceID[]; options: ['pass', 'purchase'] }
  | { kind: 'margin_loan_repayment'; playerId: PlayerID; loanId: string; collateralCardId: CardID; repaymentCost: number; options: ['repay', 'default'] }
  | { kind: 'deed_purchase'; playerId: PlayerID; spaceId: SpaceID; cost: number; currentOwner?: PlayerID; collateralOptions: CardID[]; maximumCollateralContribution: number; hostileTakeover?: boolean; consumeAction?: boolean };
