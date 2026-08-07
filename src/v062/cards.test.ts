import { describe, expect, test } from 'vitest';
import {
  activateInvasionAction,
  applyInvasionBattleMode,
  bankDetente,
  bankExtraordinaryRendition,
  canBeginRiteFromNaturesAltar,
  canCompleteAltarRiteThisTurn,
  extraordinaryRenditionDiscardOrder,
  placeLandslide,
  placeLandslideAfterBattle,
  placeNaturesAltarAfterBattle,
  placeNaturesAltarByAction,
  releaseExtraordinaryRendition,
  resolveCompoundInterest,
  resolveDetenteAcceptance,
  resolveLandslideRetreatChain,
  resolveMartyrdom,
} from './cards';

describe('Invasion', () => {
  test('grants two advance-only Positions during Opening', () => {
    expect(activateInvasionAction('opening')).toEqual({
      additionalAdvance: 2,
      advanceOnly: true,
      endsOnPendingBattle: true,
    });
    expect(() => activateInvasionAction('denouement')).toThrow(/only during Opening/);
  });

  test('increases attacker Reserve and Tactic limits and does nothing for defender', () => {
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

  test('chains across consecutive Territories and discards each triggered Overlay', () => {
    const state = {
      territoryCount: 6,
      overlays: { 3: 'A', 4: 'B' } as const,
    };
    const result = resolveLandslideRetreatChain(state, 'B', 3);
    expect(result.position).toBe(5);
    expect(result.discardedOwners).toEqual(['A', 'B']);
    expect(result.state.overlays).toEqual({});
  });

  test('stops at the end of the Gauntlet but still discards the triggered Overlay', () => {
    const result = resolveLandslideRetreatChain({
      territoryCount: 6,
      overlays: { 5: 'A' },
    }, 'B', 5);
    expect(result.position).toBe(5);
    expect(result.discardedOwners).toEqual(['A']);
  });
});

describe('Détente', () => {
  test('enforces one banked copy', () => {
    const banked = bankDetente({ banked: false, lastTriggeredTurn: null });
    expect(banked.banked).toBe(true);
    expect(() => bankDetente(banked)).toThrow(/only one banked Détente/);
  });

  test('triggers once each turn only for a Proposal already ratified when offered', () => {
    const state = { banked: true, lastTriggeredTurn: null };
    const unratified = resolveDetenteAcceptance(state, {
      turnNumber: 4,
      proposalWasRatifiedWhenOffered: false,
    });
    expect(unratified.influenceGained).toBe(0);

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

  test('makes reveal optional', () => {
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: false,
    })).toEqual({ zones, revealedCard: null });
  });

  test('requires a nonempty Treasury and the after-normal-Draw timing', () => {
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

  test('places a revealed card in Treasury or Discard and never leaves it on top', () => {
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
    expect(() => resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
    })).toThrow(/must enter Treasury or the Discard Pile/);
  });
});

describe('Extraordinary Rendition', () => {
  test('binds a selected opposing Hand card and enforces one banked copy', () => {
    const result = bankExtraordinaryRendition(
      { banked: false, boundCard: null },
      'B',
      ['secret', 'other'],
      'secret',
    );
    expect(result.state).toEqual({
      banked: true,
      boundCard: { id: 'secret', owner: 'B' },
    });
    expect(result.opponentHand).toEqual(['other']);
    expect(() => bankExtraordinaryRendition(result.state, 'B', ['other'], 'other')).toThrow(/only one banked/);
  });

  test('must be discarded before other controlled Assets', () => {
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

  test('returns the bound card to its owner’s Discard Pile when it leaves play', () => {
    const result = releaseExtraordinaryRendition({
      banked: true,
      boundCard: { id: 'secret', owner: 'B' },
    }, {
      A: ['a'],
      B: ['b'],
    });
    expect(result.state).toEqual({ banked: false, boundCard: null });
    expect(result.discardPiles.B).toEqual(['b', 'secret']);
  });
});

describe("Nature's Altar", () => {
  test('Action mode places only on the current or an adjacent Territory', () => {
    expect(placeNaturesAltarByAction('A', 2, 3, 6)).toEqual({ owner: 'A', territoryIndex: 3 });
    expect(() => placeNaturesAltarByAction('A', 2, 4, 6)).toThrow(/current or an adjacent/);
  });

  test('Battle mode requires a win and places on the contested Territory', () => {
    expect(placeNaturesAltarAfterBattle('A', {
      won: true,
      contestedPosition: 3,
      territoryCount: 6,
    })).toEqual({ owner: 'A', territoryIndex: 3 });
    expect(() => placeNaturesAltarAfterBattle('A', {
      won: false,
      contestedPosition: 3,
      territoryCount: 6,
    })).toThrow(/requires winning/);
  });

  test('allows Begin a Rite only during Opening with the token on the Altar', () => {
    const overlay = { owner: 'A' as const, territoryIndex: 2 };
    expect(canBeginRiteFromNaturesAltar(overlay, {
      phase: 'opening',
      player: 'A',
      playerPosition: 2,
    })).toBe(true);
    expect(canBeginRiteFromNaturesAltar(overlay, {
      phase: 'denouement',
      player: 'A',
      playerPosition: 2,
    })).toBe(false);
  });

  test('same-turn completion requires control at completion timing', () => {
    const overlay = { owner: 'A' as const, territoryIndex: 2 };
    const frontLine = {
      territoryCount: 6,
      control: { A: 3, B: 2 },
      position: { A: 2, B: 3 },
    };
    expect(canCompleteAltarRiteThisTurn(overlay, frontLine, {
      player: 'A',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(true);
    expect(canCompleteAltarRiteThisTurn(overlay, {
      ...frontLine,
      control: { A: 2, B: 2 },
    }, {
      player: 'A',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(false);
  });
});

describe('Martyrdom', () => {
  test('moves remaining opposing Reserve cards to Graveyard, sets Conviction to 4, and preserves the loss', () => {
    const result = resolveMartyrdom({
      hand: ['Martyrdom', 'other'],
      graveyard: ['old'],
      conviction: 1,
      opponentReserve: ['r1', 'r2'],
      opponentDiscardPile: ['discarded'],
      opponentGraveyard: ['fallen'],
      battleResult: 'loss',
      retreatRequired: true,
      occupationApplies: true,
    }, {
      duringAftermathBeforeClear: true,
    });

    expect(result.hand).toEqual(['other']);
    expect(result.graveyard).toEqual(['old', 'Martyrdom']);
    expect(result.conviction).toBe(4);
    expect(result.opponentReserve).toEqual([]);
    expect(result.opponentDiscardPile).toEqual(['discarded']);
    expect(result.opponentGraveyard).toEqual(['fallen', 'r1', 'r2']);
    expect(result.battleResult).toBe('loss');
    expect(result.retreatRequired).toBe(true);
    expect(result.occupationApplies).toBe(true);
  });

  test('requires a loss, the proper Aftermath timing, and Martyrdom in Hand', () => {
    const base = {
      hand: ['Martyrdom'],
      graveyard: [] as string[],
      conviction: 0,
      opponentReserve: [] as string[],
      opponentDiscardPile: [] as string[],
      opponentGraveyard: [] as string[],
      battleResult: 'win' as const,
      retreatRequired: false,
      occupationApplies: false,
    };
    expect(() => resolveMartyrdom(base, { duringAftermathBeforeClear: true })).toThrow(/only after losing/);
    expect(() => resolveMartyrdom({ ...base, battleResult: 'loss' }, {
      duringAftermathBeforeClear: false,
    })).toThrow(/before battle cards are cleared/);
  });
});
