import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  actionCostForDirectCardProcedure,
  additionalTacticPermission,
  bankMarginLoan,
  defaultBoundCardDestinationWhenBindingEnds,
  hasInherentBankAction,
  mayDrawAtStartOfTurn,
  orderRevealStageEffects,
  removeMarginLoan,
  resolveMarginLoanAfterIncome,
  resolveStartTurnDraw,
  type MarginLoanState,
  type MarginLoanZones,
} from './cards';

describe('v0.6.3 centralized card procedures', () => {
  test('Asset cards have the inherent Bank Action without printed boilerplate', () => {
    const holdTheLine = v063CanonicalContent.cardsById.get('military-hold-the-line');
    expect(holdTheLine).toBeDefined();
    expect(hasInherentBankAction(holdTheLine!)).toBe(true);
  });

  test('directly permitted card use spends no additional Action unless expressly stated', () => {
    expect(actionCostForDirectCardProcedure({ directlyPermittedByRuleOrEffect: true })).toBe(0);
    expect(actionCostForDirectCardProcedure({
      directlyPermittedByRuleOrEffect: true,
      expresslyUsesAction: true,
    })).toBe(1);
  });

  test('additional Tactics default to Reserve and do not reopen prior windows', () => {
    expect(additionalTacticPermission(1)).toEqual({
      amount: 1,
      source: 'Reserve',
      faceUpAfterReveal: false,
      reopensEarlierWindows: false,
      normalTacticDestination: true,
    });
    expect(additionalTacticPermission(1, 'Hand', true)).toMatchObject({
      source: 'Hand',
      faceUpAfterReveal: true,
      reopensEarlierWindows: false,
    });
  });

  test('bound cards default to their owners Discard Piles when binding ends', () => {
    expect(defaultBoundCardDestinationWhenBindingEnds([
      { cardId: 'one', owner: 'A' },
      { cardId: 'two', owner: 'B' },
      { cardId: 'three', owner: 'A' },
    ])).toEqual({ A: ['one', 'three'], B: ['two'] });
  });

  test('reveal-stage interference resolves before ordinary effects while retaining stable order', () => {
    const ordered = orderRevealStageEffects([
      { id: 'ordinary-1', interferesWithAnotherRevealedCard: false },
      { id: 'interference-1', interferesWithAnotherRevealedCard: true },
      { id: 'interference-2', interferesWithAnotherRevealedCard: true },
      { id: 'ordinary-2', interferesWithAnotherRevealedCard: false },
    ]);
    expect(ordered.map((effect) => effect.id)).toEqual([
      'interference-1',
      'interference-2',
      'ordinary-1',
      'ordinary-2',
    ]);
  });
});

describe('late v0.6.3 card corrections', () => {
  test('Armistice upkeep cannot be skipped by suppressing the normal Draw', () => {
    const armistice = v063CanonicalContent.cardsById.get('neutral-armistice');
    expect(armistice?.cost).toBe(4);
    expect(armistice?.effects.find((effect) => effect.label === 'Asset')?.text).toBe(
      'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.',
    );
  });

  test('Contingency Plan covers any defined Removal and gives +2 Battle Total while behind', () => {
    const contingencyPlan = v063CanonicalContent.cardsById.get('neutral-contingency-plan');
    expect(contingencyPlan?.cost).toBe(1);
    expect(contingencyPlan?.effects.find((effect) => effect.label === 'Asset')?.text).toBe('If this card is Removed, +1 Card.');
    expect(contingencyPlan?.effects.find((effect) => effect.label === 'Gambit/Tactic')?.text).toBe(
      'If your opponent controls more Territories than you, +2 Battle Total.',
    );
  });

  test('Manifest Destiny creates a normal Territory with a normal Deed without special purchase rules', () => {
    const manifestDestiny = v063CanonicalContent.cardsById.get('neutral-manifest-destiny');
    expect(manifestDestiny?.cost).toBe(5);
    expect(manifestDestiny?.rules_notes).toContain('After entering the Gauntlet, this card is a normal Territory with a normal Deed.');
  });
});

describe('persistent Margin Loan', () => {
  const zones = (): MarginLoanZones => ({
    hand: ['Collateral', 'Other'],
    treasury: ['Treasury Collateral'],
    discardPile: [],
    graveyard: [],
  });

  test('banks collateral from Hand or Treasury, gains value +2 Capital, and grants +1 Action', () => {
    const fromHand = bankMarginLoan(zones(), 'Collateral', 4);
    expect(fromHand.loan).toEqual({ banked: true, collateral: 'Collateral', collateralValue: 4 });
    expect(fromHand.zones.hand).toEqual(['Other']);
    expect(fromHand.capitalGained).toBe(6);
    expect(fromHand.additionalActions).toBe(1);

    const fromTreasury = bankMarginLoan(zones(), 'Treasury Collateral', 3, 'treasury');
    expect(fromTreasury.zones.treasury).toEqual([]);
    expect(fromTreasury.zones.hand).toEqual(['Collateral', 'Other']);
    expect(fromTreasury.capitalGained).toBe(5);
  });

  test('may remain banked after income instead of being forced to settle next turn', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    const carried = resolveMarginLoanAfterIncome(loan, zones(), 'carry', 0);
    expect(carried.loan).toEqual(loan);
    expect(carried.capitalPaid).toBe(0);
  });

  test('a banked Margin Loan prevents only the start-of-turn draw modeled here', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    expect(mayDrawAtStartOfTurn([loan])).toBe(false);
    const result = resolveStartTurnDraw({ drawPile: ['Top'], hand: ['Held'] }, [loan]);
    expect(result).toEqual({
      zones: { drawPile: ['Top'], hand: ['Held'] },
      drawnCard: null,
      normalDrawOccurred: false,
    });

    const ordinary = resolveStartTurnDraw({ drawPile: ['Top'], hand: ['Held'] });
    expect(ordinary).toEqual({
      zones: { drawPile: [], hand: ['Held', 'Top'] },
      drawnCard: 'Top',
      normalDrawOccurred: true,
    });
  });

  test('Repay returns collateral to Hand and discards Margin Loan', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    const repaid = resolveMarginLoanAfterIncome(loan, zones(), 'repay', 7);
    expect(repaid.capitalPaid).toBe(7);
    expect(repaid.loan.banked).toBe(false);
    expect(repaid.zones.hand).toContain('Collateral');
    expect(repaid.zones.discardPile).toEqual(['Margin Loan']);
    expect(repaid.zones.graveyard).toEqual([]);
  });

  test('Default or Removal puts both Margin Loan and collateral in the Graveyard', () => {
    const loan: MarginLoanState = { banked: true, collateral: 'Collateral', collateralValue: 4 };
    const defaulted = resolveMarginLoanAfterIncome(loan, zones(), 'default', 0);
    expect(defaulted.zones.graveyard).toEqual(['Margin Loan', 'Collateral']);
    expect(defaulted.loan.banked).toBe(false);

    const removed = removeMarginLoan(loan, zones());
    expect(removed.zones.graveyard).toEqual(['Margin Loan', 'Collateral']);
  });
});
