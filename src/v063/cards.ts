import type { V063CanonicalCard } from '../content/v063';

export * from '../v062/cards';

export function hasInherentBankAction(card: Pick<V063CanonicalCard, 'effects'>): boolean {
  return card.effects.some((effect) => effect.label === 'Asset');
}

export function actionCostForDirectCardProcedure(input: {
  directlyPermittedByRuleOrEffect: boolean;
  expresslyUsesAction?: boolean;
}): 0 | 1 {
  if (input.expresslyUsesAction) return 1;
  return input.directlyPermittedByRuleOrEffect ? 0 : 1;
}

export type TacticSource = 'Reserve' | 'Hand' | 'specified cards' | 'stored card';

export interface AdditionalTacticPermission {
  amount: number;
  source: TacticSource;
  faceUpAfterReveal: boolean;
  reopensEarlierWindows: false;
  normalTacticDestination: true;
}

export function additionalTacticPermission(
  amount = 1,
  source: TacticSource = 'Reserve',
  afterTacticsRevealed = false,
): AdditionalTacticPermission {
  const normalized = nonnegativeInteger(amount);
  if (normalized < 1) throw new Error('An additional-Tactic permission must add at least one Tactic.');
  return {
    amount: normalized,
    source,
    faceUpAfterReveal: afterTacticsRevealed,
    reopensEarlierWindows: false,
    normalTacticDestination: true,
  };
}

export interface BoundCardState {
  cardId: string;
  owner: 'A' | 'B';
}

export function defaultBoundCardDestinationWhenBindingEnds(
  boundCards: readonly BoundCardState[],
): Record<'A' | 'B', string[]> {
  return {
    A: boundCards.filter((card) => card.owner === 'A').map((card) => card.cardId),
    B: boundCards.filter((card) => card.owner === 'B').map((card) => card.cardId),
  };
}

export interface RevealStageEffect {
  id: string;
  interferesWithAnotherRevealedCard: boolean;
}

export function orderRevealStageEffects<T extends RevealStageEffect>(effects: readonly T[]): T[] {
  return [
    ...effects.filter((effect) => effect.interferesWithAnotherRevealedCard),
    ...effects.filter((effect) => !effect.interferesWithAnotherRevealedCard),
  ];
}

export interface MarginLoanState {
  banked: boolean;
  collateral: string | null;
  collateralValue: number;
}

export interface MarginLoanZones {
  hand: string[];
  discardPile: string[];
  graveyard: string[];
}

export interface MarginLoanActionResolution {
  loan: MarginLoanState;
  zones: MarginLoanZones;
  capitalGained: number;
  additionalActions: 1;
}

export function bankMarginLoan(
  zones: MarginLoanZones,
  collateralCard: string,
  collateralValue: number,
): MarginLoanActionResolution {
  const value = nonnegativeInteger(collateralValue);
  const index = zones.hand.indexOf(collateralCard);
  if (index < 0) throw new Error('Margin Loan collateral must be supplied from the modeled Hand.');
  return {
    loan: { banked: true, collateral: collateralCard, collateralValue: value },
    zones: {
      hand: zones.hand.filter((_, cardIndex) => cardIndex !== index),
      discardPile: [...zones.discardPile],
      graveyard: [...zones.graveyard],
    },
    capitalGained: value + 2,
    additionalActions: 1,
  };
}

export type MarginLoanChoice = 'repay' | 'default' | 'carry';

export interface MarginLoanSettlement {
  loan: MarginLoanState;
  zones: MarginLoanZones;
  capitalPaid: number;
}

export function resolveMarginLoanAfterIncome(
  loan: MarginLoanState,
  zones: MarginLoanZones,
  choice: MarginLoanChoice,
  availableCapital: number,
): MarginLoanSettlement {
  if (!loan.banked || !loan.collateral) throw new Error('Margin Loan must be banked with collateral to settle or carry.');
  const cloned = cloneZones(zones);
  if (choice === 'carry') {
    return { loan: { ...loan }, zones: cloned, capitalPaid: 0 };
  }
  if (choice === 'default') {
    return defaultMarginLoan(loan, cloned);
  }
  const payment = loan.collateralValue + 3;
  if (availableCapital < payment) throw new Error('Insufficient Capital to repay Margin Loan.');
  return {
    loan: { banked: false, collateral: null, collateralValue: 0 },
    zones: {
      hand: [...cloned.hand, loan.collateral],
      discardPile: [...cloned.discardPile, 'Margin Loan'],
      graveyard: cloned.graveyard,
    },
    capitalPaid: payment,
  };
}

export function removeMarginLoan(
  loan: MarginLoanState,
  zones: MarginLoanZones,
): MarginLoanSettlement {
  if (!loan.banked || !loan.collateral) throw new Error('Only a banked Margin Loan can be Removed.');
  return defaultMarginLoan(loan, cloneZones(zones));
}

export function mayDrawAtStartOfTurn(loans: readonly MarginLoanState[]): boolean {
  return !loans.some((loan) => loan.banked);
}

export interface StartTurnDrawZones {
  drawPile: string[];
  hand: string[];
}

export function resolveStartTurnDraw(
  zones: StartTurnDrawZones,
  loans: readonly MarginLoanState[] = [],
): { zones: StartTurnDrawZones; drawnCard: string | null; normalDrawOccurred: boolean } {
  const cloned = { drawPile: [...zones.drawPile], hand: [...zones.hand] };
  if (!mayDrawAtStartOfTurn(loans)) {
    return { zones: cloned, drawnCard: null, normalDrawOccurred: false };
  }
  const [drawnCard, ...drawPile] = cloned.drawPile;
  if (!drawnCard) return { zones: cloned, drawnCard: null, normalDrawOccurred: true };
  return {
    zones: { drawPile, hand: [...cloned.hand, drawnCard] },
    drawnCard,
    normalDrawOccurred: true,
  };
}

function defaultMarginLoan(loan: MarginLoanState, zones: MarginLoanZones): MarginLoanSettlement {
  if (!loan.collateral) throw new Error('Margin Loan Default requires collateral.');
  return {
    loan: { banked: false, collateral: null, collateralValue: 0 },
    zones: {
      hand: zones.hand,
      discardPile: zones.discardPile,
      graveyard: [...zones.graveyard, 'Margin Loan', loan.collateral],
    },
    capitalPaid: 0,
  };
}

function cloneZones(zones: MarginLoanZones): MarginLoanZones {
  return {
    hand: [...zones.hand],
    discardPile: [...zones.discardPile],
    graveyard: [...zones.graveyard],
  };
}

function nonnegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
