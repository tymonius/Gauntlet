import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  actionCostForDirectCardProcedure,
  activateInvasionAction,
  additionalTacticPermission,
  applyInvasionBattleMode,
  bankDetente,
  bankExtraordinaryRendition,
  bankMarginLoan,
  canBeginRiteFromNaturesAltar,
  canCompleteAltarRiteThisTurn,
  clearOpponentReserveUnderMartyrdom,
  completeMartyrdomAfterBattleCardsClear,
  defaultBoundCardDestinationWhenBindingEnds,
  extraordinaryRenditionDiscardOrder,
  hasInherentBankAction,
  mayDrawAtStartOfTurn,
  orderRevealStageEffects,
  placeLandslide,
  placeLandslideAfterBattle,
  placeNaturesAltarAfterBattle,
  placeNaturesAltarByAction,
  playMartyrdomBeforeBattleCardsClear,
  releaseExtraordinaryRendition,
  removeMarginLoan,
  resolveCompoundInterest,
  resolveDetenteAcceptance,
  resolveLandslideRetreatChain,
  resolveMarginLoanAfterIncome,
  resolveMartyrdom,
  resolveStartTurnDraw,
  type MarginLoanState,
  type MarginLoanZones,
  type MartyrdomState,
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

  test('bound cards default to their owners Discard Piles when their host leaves play', () => {
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

describe('published authority for migrated card handlers', () => {
  const effect = (id: string, label: string) =>
    v063CanonicalContent.cardsById.get(id)?.effects.find((entry) => entry.label === label)?.text;

  test('locks the migrated handlers to their v0.6.3 printed effects', () => {
    expect(effect('military-invasion', 'Action')).toBe(
      'During your Movement this turn, you may advance up to two additional Positions. This additional movement may only be used to advance.',
    );
    expect(effect('neutral-landslide', 'Overlay')).toBe(
      "When a player retreats onto this Territory: Retreat +1, if able. Then put this card in its owner's Discard Pile.",
    );
    expect(effect('diplomats-detente', 'Asset')).toBe(
      'The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, +1 Influence.',
    );
    expect(effect('financiers-compound-interest', 'Asset')).toBe(
      'After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile.',
    );
    expect(effect('intelligence-extraordinary-rendition', 'Asset')).toContain(
      'Whenever you discard one or more of your Assets, discard this card before any others, if able.',
    );
    expect(effect('mystics-nature-s-altar', 'Overlay')).toBe(
      'During your Opening, while you are here, you may take the Begin a Rite Faction Action. A Rite begun this way may complete this turn if you control this Territory when its completion condition and timing are satisfied.',
    );
    expect(effect('inquisition-martyrdom', 'Aftermath')).toBe(
      'In the Aftermath before battle cards are cleared, if you lost and this card is in your Hand, you may play it. If you do, put cards remaining in the opponent\'s Reserve in their Graveyard instead of their Discard Pile. After battle cards are cleared, Conviction = 4; put this card in your Graveyard.',
    );
  });
});

describe('Invasion', () => {
  test('grants two advance-only Positions during Movement without inventing an Opening-only play restriction', () => {
    const expected = {
      additionalAdvance: 2,
      advanceOnly: true,
      endsOnPendingBattle: true,
    };
    expect(activateInvasionAction('opening')).toEqual(expected);
    expect(activateInvasionAction('denouement')).toEqual(expected);
  });

  test('increases attacker Reserve and Tactic limits and does nothing for the defender', () => {
    expect(applyInvasionBattleMode({ reserveLimit: 3, tacticLimit: 1 }, 'attacker')).toEqual({
      reserveLimit: 4,
      tacticLimit: 2,
    });
    expect(applyInvasionBattleMode({ reserveLimit: 3, tacticLimit: 1 }, 'defender')).toEqual({
      reserveLimit: 3,
      tacticLimit: 1,
    });
  });
});

describe('Landslide', () => {
  test('places on any Territory with a one-per-Territory limit', () => {
    const state = placeLandslide({ territoryCount: 6, overlays: {} }, 'A', 4);
    expect(state.overlays[4]).toBe('A');
    expect(() => placeLandslide(state, 'B', 4)).toThrow(/no more than one Landslide/);
  });

  test('Battle mode requires losing and retreating', () => {
    const initial = { territoryCount: 6, overlays: {} };
    expect(placeLandslideAfterBattle(initial, 'A', {
      lost: true,
      retreated: true,
      contestedPosition: 3,
    }).overlays[3]).toBe('A');
    expect(() => placeLandslideAfterBattle(initial, 'A', {
      lost: false,
      retreated: true,
      contestedPosition: 3,
    })).toThrow(/requires losing and retreating/);
  });

  test('chains across consecutive Territories', () => {
    const result = resolveLandslideRetreatChain({
      territoryCount: 6,
      overlays: { 3: 'A', 4: 'B' },
    }, 'B', 3);
    expect(result.position).toBe(5);
    expect(result.discardedOwners).toEqual(['A', 'B']);
    expect(result.state.overlays).toEqual({});
  });

  test('an additional retreat from the defender own final Territory goes beyond the Gauntlet', () => {
    const result = resolveLandslideRetreatChain({
      territoryCount: 6,
      overlays: { 5: 'A' },
    }, 'B', 5);
    expect(result.position).toBe(6);
    expect(result.discardedOwners).toEqual(['A']);
  });
});

describe('Détente', () => {
  test('enforces one banked copy and triggers once each turn only for an already-ratified Proposal', () => {
    const state = bankDetente({ banked: false, lastTriggeredTurn: null });
    expect(() => bankDetente(state)).toThrow(/only one banked Détente/);
    expect(resolveDetenteAcceptance(state, {
      turnNumber: 4,
      proposalWasRatifiedWhenOffered: false,
    }).influenceGained).toBe(0);

    const first = resolveDetenteAcceptance(state, {
      turnNumber: 4,
      proposalWasRatifiedWhenOffered: true,
    });
    expect(first.influenceGained).toBe(1);
    expect(resolveDetenteAcceptance(first.state, {
      turnNumber: 4,
      proposalWasRatifiedWhenOffered: true,
    }).influenceGained).toBe(0);
    expect(resolveDetenteAcceptance(first.state, {
      turnNumber: 5,
      proposalWasRatifiedWhenOffered: true,
    }).influenceGained).toBe(1);
  });
});

describe('Compound Interest', () => {
  const zones = {
    drawPile: ['top', 'next'],
    treasury: ['capital'],
    discardPile: ['spent'],
  };

  test('requires the post-normal-Draw timing and a nonempty Treasury', () => {
    expect(resolveCompoundInterest({ ...zones, treasury: [] }, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'treasury',
    }).revealedCard).toBeNull();
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: false,
      reveal: true,
      destination: 'treasury',
    }).revealedCard).toBeNull();
  });

  test('makes reveal optional and sends a revealed card only to Treasury or Discard', () => {
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: false,
    })).toEqual({ zones, revealedCard: null });

    const treasury = resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'treasury',
    });
    expect(treasury.revealedCard).toBe('top');
    expect(treasury.zones.drawPile).toEqual(['next']);
    expect(treasury.zones.treasury).toEqual(['capital', 'top']);

    const discard = resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'discard',
    });
    expect(discard.zones.discardPile).toEqual(['spent', 'top']);
  });
});

describe('Extraordinary Rendition', () => {
  test('binds the chosen opposing Hand card face up and enforces one banked copy', () => {
    const result = bankExtraordinaryRendition(
      { banked: false, boundCard: null },
      'B',
      ['secret', 'other'],
      'secret',
    );
    expect(result.state).toEqual({
      banked: true,
      boundCard: { id: 'secret', owner: 'B', faceUp: true },
    });
    expect(result.opponentHand).toEqual(['other']);
    expect(() => bankExtraordinaryRendition(result.state, 'B', ['other'], 'other')).toThrow(/only one banked/);
  });

  test('orders Rendition before other Assets already determined to be discarded', () => {
    expect(extraordinaryRenditionDiscardOrder([
      'Compound Interest',
      'Extraordinary Rendition',
      'Détente',
    ])).toEqual([
      'Extraordinary Rendition',
      'Compound Interest',
      'Détente',
    ]);
  });

  test('puts its bound card in the owner Discard Pile when the Asset leaves play', () => {
    const result = releaseExtraordinaryRendition({
      banked: true,
      boundCard: { id: 'secret', owner: 'B', faceUp: true },
    }, {
      A: ['a'],
      B: ['b'],
    });
    expect(result.state).toEqual({ banked: false, boundCard: null });
    expect(result.discardPiles.B).toEqual(['b', 'secret']);
  });
});

describe("Nature's Altar", () => {
  test('places only on the current or an adjacent Territory by Action and on the contested Territory after a win', () => {
    expect(placeNaturesAltarByAction('A', 2, 3, 6)).toEqual({ owner: 'A', territoryIndex: 3 });
    expect(() => placeNaturesAltarByAction('A', 2, 4, 6)).toThrow(/current or an adjacent/);
    expect(placeNaturesAltarAfterBattle('A', {
      won: true,
      contestedPosition: 3,
      territoryCount: 6,
    })).toEqual({ owner: 'A', territoryIndex: 3 });
  });

  test('Opening permission follows the current Territory controller rather than the Overlay owner', () => {
    const overlay = { owner: 'A' as const, territoryIndex: 2 };
    const frontLine = {
      territoryCount: 6,
      control: { A: 2, B: 4 },
      position: { A: 1, B: 2 },
    };
    expect(canBeginRiteFromNaturesAltar(overlay, frontLine, {
      phase: 'opening',
      player: 'B',
      playerPosition: 2,
    })).toBe(true);
    expect(canBeginRiteFromNaturesAltar(overlay, frontLine, {
      phase: 'opening',
      player: 'A',
      playerPosition: 2,
    })).toBe(false);
  });

  test('same-turn completion requires control at the completion timing, regardless of Overlay ownership', () => {
    const overlay = { owner: 'A' as const, territoryIndex: 2 };
    const controlledByB = {
      territoryCount: 6,
      control: { A: 2, B: 4 },
      position: { A: 1, B: 2 },
    };
    expect(canCompleteAltarRiteThisTurn(overlay, controlledByB, {
      player: 'B',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(true);
    expect(canCompleteAltarRiteThisTurn(overlay, controlledByB, {
      player: 'A',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(false);
  });
});

describe('Martyrdom', () => {
  const base = (): MartyrdomState => ({
    hand: ['Martyrdom', 'other'],
    graveyard: ['old'],
    conviction: 1,
    opponentReserve: ['r1', 'r2'],
    opponentDiscardPile: ['discarded'],
    opponentGraveyard: ['fallen'],
    battleResult: 'loss',
    retreatRequired: true,
    occupationApplies: true,
  });

  test('plays before clear, replaces only Reserve destination during clear, then resolves Conviction and self-destination after clear', () => {
    const played = playMartyrdomBeforeBattleCardsClear(base());
    expect(played.hand).toEqual(['other']);
    expect(played.graveyard).toEqual(['old']);
    expect(played.conviction).toBe(1);
    expect(played.opponentReserve).toEqual(['r1', 'r2']);
    expect(played.opponentReserveDestination).toBe('graveyard');
    expect(played.martyrdomPendingAfterClear).toBe(true);

    const cleared = clearOpponentReserveUnderMartyrdom(played);
    expect(cleared.opponentReserve).toEqual([]);
    expect(cleared.opponentGraveyard).toEqual(['fallen', 'r1', 'r2']);
    expect(cleared.graveyard).toEqual(['old']);
    expect(cleared.conviction).toBe(1);

    const completed = completeMartyrdomAfterBattleCardsClear(cleared);
    expect(completed.conviction).toBe(4);
    expect(completed.graveyard).toEqual(['old', 'Martyrdom']);
    expect(completed.battleResult).toBe('loss');
    expect(completed.retreatRequired).toBe(true);
    expect(completed.occupationApplies).toBe(true);
  });

  test('compatibility helper preserves the final deterministic result while using the staged procedure', () => {
    const result = resolveMartyrdom(base(), { duringAftermathBeforeClear: true });
    expect(result.hand).toEqual(['other']);
    expect(result.graveyard).toEqual(['old', 'Martyrdom']);
    expect(result.conviction).toBe(4);
    expect(result.opponentReserve).toEqual([]);
    expect(result.opponentGraveyard).toEqual(['fallen', 'r1', 'r2']);
  });

  test('requires a loss and the proper Aftermath timing', () => {
    expect(() => playMartyrdomBeforeBattleCardsClear({ ...base(), battleResult: 'win' })).toThrow(/only after losing/);
    expect(() => resolveMartyrdom(base(), { duringAftermathBeforeClear: false })).toThrow(/before battle cards are cleared/);
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
