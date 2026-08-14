import { describe, expect, test } from 'vitest';
import { cleanV063Content } from './content';
import {
  actionCostForDirectCardProcedure,
  additionalTacticPermission,
  bankMarginLoan,
  defaultBoundCardDiscardWhenHostLeavesPlay,
  hasInherentBankAction,
  mayDrawAtStartOfTurn,
  orderRevealStageEffects,
  removeMarginLoan,
  resolveMarginLoanAfterIncome,
  resolveStartTurnDraw,
  type MarginLoanState,
  type MarginLoanZones,
} from './cards';

describe('clean v0.6.3 shared card procedures', () => {
  test('Asset effect provides the inherent Bank Action', () => {
    const holdTheLine = cleanV063Content.cardsById.get('military-hold-the-line');
    expect(holdTheLine).toBeDefined();
    expect(hasInherentBankAction(holdTheLine!)).toBe(true);
  });
  test('directly permitted procedures cost no Action unless expressly stated', () => {
    expect(actionCostForDirectCardProcedure({ directlyPermittedByRuleOrEffect: true })).toBe(0);
    expect(actionCostForDirectCardProcedure({ directlyPermittedByRuleOrEffect: true, expresslyUsesAction: true })).toBe(1);
  });
  test('additional Tactics default to Reserve and do not reopen earlier windows', () => {
    expect(additionalTacticPermission()).toEqual({ amount: 1, source: 'Reserve', faceUpAfterReveal: false, reopensEarlierWindows: false, normalTacticDestination: true });
    expect(additionalTacticPermission(1, 'Hand', true)).toMatchObject({ source: 'Hand', faceUpAfterReveal: true, reopensEarlierWindows: false });
  });
  test('bound cards default to owner Discard Piles when their host leaves play', () => {
    expect(defaultBoundCardDiscardWhenHostLeavesPlay([
      { cardId: 'one', owner: 'A' }, { cardId: 'two', owner: 'B' }, { cardId: 'three', owner: 'A' },
    ])).toEqual({ A: ['one', 'three'], B: ['two'] });
  });
  test('reveal-stage interference resolves before ordinary effects while preserving order within classes', () => {
    const ordered = orderRevealStageEffects([
      { id: 'ordinary-1', interferesWithAnotherRevealedCard: false },
      { id: 'interference-1', interferesWithAnotherRevealedCard: true },
      { id: 'interference-2', interferesWithAnotherRevealedCard: true },
      { id: 'ordinary-2', interferesWithAnotherRevealedCard: false },
    ]);
    expect(ordered.map((effect) => effect.id)).toEqual(['interference-1', 'interference-2', 'ordinary-1', 'ordinary-2']);
  });
});

describe('clean v0.6.3 late card corrections', () => {
  test('Armistice upkeep is at the start of Opening', () => {
    const card = cleanV063Content.cardsById.get('neutral-armistice');
    expect(card?.cost).toBe(4);
    expect(card?.effects.find((effect) => effect.label === 'Asset')?.text).toBe('Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.');
  });
  test('Contingency Plan covers any Removal and grants +2 while behind', () => {
    const card = cleanV063Content.cardsById.get('neutral-contingency-plan');
    expect(card?.effects.find((effect) => effect.label === 'Asset')?.text).toBe('If this card is Removed, +1 Card.');
    expect(card?.effects.find((effect) => effect.label === 'Gambit/Tactic')?.text).toBe('If your opponent controls more Territories than you, +2 Battle Total.');
  });
  test('Manifest Destiny becomes a normal Territory with a normal Deed', () => {
    const card = cleanV063Content.cardsById.get('neutral-manifest-destiny');
    expect(card?.cost).toBe(5);
    expect(card?.rules_notes).toContain('After entering the Gauntlet, this card is a normal Territory with a normal Deed.');
  });
});

describe('clean v0.6.3 persistent Margin Loan', () => {
  const zones = (): MarginLoanZones => ({ hand: ['Collateral', 'Other'], treasury: ['Treasury Collateral'], discardPile: [], graveyard: [] });
  test('banks Hand or Treasury collateral, gains value +2, and grants +1 Action', () => {
    const fromHand = bankMarginLoan(zones(), 'Collateral', 4);
    expect(fromHand.loan).toEqual({ banked: true, collateral: 'Collateral', collateralValue: 4 });
    expect(fromHand.capitalGained).toBe(6);
    expect(fromHand.additionalActions).toBe(1);
    const fromTreasury = bankMarginLoan(zones(), 'Treasury Collateral', 3, 'treasury');
    expect(fromTreasury.zones.treasury).toEqual([]);
    expect(fromTreasury.capitalGained).toBe(5);
  });
  test('may remain banked after income', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    expect(resolveMarginLoanAfterIncome(loan, zones(), 'carry', 0)).toMatchObject({ loan, capitalPaid: 0 });
  });
  test('suppresses the start-of-turn draw while banked', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    expect(mayDrawAtStartOfTurn([loan])).toBe(false);
    expect(resolveStartTurnDraw({ drawPile: ['Top'], hand: ['Held'] }, [loan])).toEqual({ zones: { drawPile: ['Top'], hand: ['Held'] }, drawnCard: null, normalDrawOccurred: false });
  });
  test('Repay returns collateral and discards Margin Loan', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    const result = resolveMarginLoanAfterIncome(loan, zones(), 'repay', 7);
    expect(result.capitalPaid).toBe(7);
    expect(result.zones.hand).toContain('Collateral');
    expect(result.zones.discardPile).toEqual(['Margin Loan']);
  });
  test('Default or Removal puts Margin Loan and collateral in the Graveyard', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    expect(resolveMarginLoanAfterIncome(loan, zones(), 'default', 0).zones.graveyard).toEqual(['Margin Loan', 'Collateral']);
    expect(removeMarginLoan(loan, zones()).zones.graveyard).toEqual(['Margin Loan', 'Collateral']);
  });
});
