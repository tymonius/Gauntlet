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
  | { kind: 'leveraged_buyout_target'; playerId: PlayerID; spaceOptions: SpaceID[] }
  | { kind: 'leveraged_buyout_collateral'; playerId: PlayerID; spaceId: SpaceID; cost: number; capitalAvailable: number; collateralOptions: CardID[]; minimumCollateralValue: number }
  | { kind: 'corner_the_market_purchase'; playerId: PlayerID; spaceOptions: SpaceID[]; options: ['pass', 'purchase']; battleId?: string }
  | { kind: 'deed_purchase'; playerId: PlayerID; spaceId: SpaceID; cost: number; currentOwner?: PlayerID; collateralOptions: CardID[]; maximumCollateralContribution: number; hostileTakeover?: boolean; consumeAction?: boolean; continuation?: 'corner_the_market'; battleId?: string }
  | { kind: 'battle_capital_gains'; playerId: PlayerID; battleId: string; sourceCardId: CardID; eligibleCardIds: CardID[] }
  | { kind: 'battle_monetary_crisis'; playerId: PlayerID; battleId: string; sourceOwner: PlayerID; handOptions: CardID[] }
  | { kind: 'battle_leveraged_buyout'; playerId: PlayerID; battleId: string; spaceId: SpaceID; cost: number; capitalAvailable: number; collateralOptions: CardID[]; minimumCollateralValue: number; options: ['pass', 'purchase'] };
