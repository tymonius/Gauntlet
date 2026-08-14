import { describe, expect, test } from 'vitest';
import {
  activateInvasionAction,
  applyInvasionBattleMode,
  bankDetente,
  bankExtraordinaryRendition,
  canBeginRiteFromNaturesAltar,
  canCompleteAltarRiteThisTurn,
  clearBattleCardsWithMartyrdom,
  extraordinaryRenditionDiscardOrder,
  placeLandslide,
  placeLandslideAfterBattle,
  placeNaturesAltarAfterBattle,
  placeNaturesAltarByAction,
  playMartyrdomBeforeBattleCardsClear,
  releaseExtraordinaryRendition,
  resolveCompoundInterest,
  resolveDetenteAcceptance,
  resolveLandslideRetreatChain,
  type MartyrdomState,
} from './cards';
import type { FrontLineState } from './rules';

describe('clean v0.6.2 Invasion', () => {
  test('Opening Action grants two advance-only positions and ends on pending battle', () => {
    expect(activateInvasionAction('opening')).toEqual({
      additionalAdvance: 2,
      advanceOnly: true,
      endsOnPendingBattle: true,
    });
    expect(() => activateInvasionAction('denouement')).toThrow(/Opening/);
  });

  test('Battle mode adds one Reserve card and one Tactic only for the attacker', () => {
    expect(applyInvasionBattleMode({ reserveLimit: 3, tacticLimit: 1 }, 'attacker'))
      .toEqual({ reserveLimit: 4, tacticLimit: 2 });
    expect(applyInvasionBattleMode({ reserveLimit: 3, tacticLimit: 1 }, 'defender'))
      .toEqual({ reserveLimit: 3, tacticLimit: 1 });
  });
});

describe('clean v0.6.2 Landslide', () => {
  test('Action placement permits at most one Landslide on a Territory', () => {
    const once = placeLandslide({ territoryCount: 6, overlays: {} }, 'A', 2);
    expect(once.overlays[2]).toBe('A');
    expect(() => placeLandslide(once, 'B', 2)).toThrow(/no more than one Landslide/i);
  });

  test('Battle placement requires losing and retreating, then uses the contested Territory', () => {
    const state = placeLandslideAfterBattle(
      { territoryCount: 6, overlays: {} },
      'A',
      { lost: true, retreated: true, contestedPosition: 3 },
    );
    expect(state.overlays[3]).toBe('A');
  });

  test('consecutive Landslides chain through additional retreat and each is discarded once', () => {
    const result = resolveLandslideRetreatChain(
      { territoryCount: 6, overlays: { 2: 'A', 1: 'B' } },
      'A',
      2,
    );
    expect(result.position).toBe(0);
    expect(result.discardedOwners).toEqual(['A', 'B']);
    expect(result.state.overlays).toEqual({});
  });

  test('a Landslide can push a retreat beyond the owner end of the Gauntlet', () => {
    const result = resolveLandslideRetreatChain(
      { territoryCount: 6, overlays: { 0: 'B' } },
      'A',
      0,
    );
    expect(result.position).toBe(-1);
    expect(result.discardedOwners).toEqual(['B']);
  });
});

describe('clean v0.6.2 Détente and Compound Interest', () => {
  test('Détente triggers only on a Proposal already ratified when offered and only once per turn', () => {
    let state = bankDetente({ banked: false, lastTriggeredTurn: null });
    let result = resolveDetenteAcceptance(state, { turnNumber: 4, proposalWasRatifiedWhenOffered: false });
    expect(result.influenceGained).toBe(0);
    result = resolveDetenteAcceptance(state, { turnNumber: 4, proposalWasRatifiedWhenOffered: true });
    expect(result.influenceGained).toBe(1);
    state = result.state;
    expect(resolveDetenteAcceptance(state, { turnNumber: 4, proposalWasRatifiedWhenOffered: true }).influenceGained).toBe(0);
  });

  test('Compound Interest reveal is optional and requires a nonempty Treasury', () => {
    const zones = { drawPile: ['A', 'B'], treasury: ['Treasury Card'], discardPile: [] as string[] };
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: false,
    }).zones).toEqual(zones);
    expect(resolveCompoundInterest({ ...zones, treasury: [] }, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'treasury',
    }).revealedCard).toBeNull();
  });

  test('once Compound Interest reveals the top card it must enter Treasury or Discard Pile', () => {
    const zones = { drawPile: ['A', 'B'], treasury: ['T'], discardPile: [] as string[] };
    expect(() => resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
    })).toThrow(/Treasury or the Discard Pile/);
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'treasury',
    }).zones).toEqual({ drawPile: ['B'], treasury: ['T', 'A'], discardPile: [] });
    expect(resolveCompoundInterest(zones, {
      banked: true,
      afterNormalDraw: true,
      reveal: true,
      destination: 'discard',
    }).zones).toEqual({ drawPile: ['B'], treasury: ['T'], discardPile: ['A'] });
  });
});

describe('clean v0.6.2 Extraordinary Rendition', () => {
  test('binds one opposing Hand card face up and returns it to owner Discard Pile on exit', () => {
    const banked = bankExtraordinaryRendition(
      { banked: false, boundCard: null },
      'B',
      ['X', 'Y'],
      'Y',
    );
    expect(banked.opponentHand).toEqual(['X']);
    expect(banked.state.boundCard).toEqual({ id: 'Y', owner: 'B', faceUp: true });
    const released = releaseExtraordinaryRendition(banked.state, { A: [], B: ['old'] });
    expect(released.discardPiles.B).toEqual(['old', 'Y']);
  });

  test('Extraordinary Rendition is discarded before other controlled Assets when able', () => {
    expect(extraordinaryRenditionDiscardOrder(['Other', 'Extraordinary Rendition', 'Third']))
      .toEqual(['Extraordinary Rendition', 'Other', 'Third']);
  });
});

describe("clean v0.6.2 Nature's Altar", () => {
  test('Action placement is current or adjacent Territory and Battle placement requires a win', () => {
    expect(placeNaturesAltarByAction('A', 2, 3, 6)).toEqual({ owner: 'A', territoryIndex: 3 });
    expect(() => placeNaturesAltarByAction('A', 2, 4, 6)).toThrow(/current or an adjacent/);
    expect(placeNaturesAltarAfterBattle('A', { won: true, contestedPosition: 4, territoryCount: 6 }))
      .toEqual({ owner: 'A', territoryIndex: 4 });
  });

  test('Opening permission requires the token on the Altar Territory', () => {
    const altar = { owner: 'A' as const, territoryIndex: 2 };
    expect(canBeginRiteFromNaturesAltar(altar, { phase: 'opening', player: 'A', playerPosition: 2 })).toBe(true);
    expect(canBeginRiteFromNaturesAltar(altar, { phase: 'denouement', player: 'A', playerPosition: 2 })).toBe(false);
  });

  test('same-turn Rite completion is tethered to control at completion timing, not token position', () => {
    const altar = { owner: 'A' as const, territoryIndex: 2 };
    const controls: FrontLineState = {
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: 4, B: 5 },
    };
    expect(canCompleteAltarRiteThisTurn(altar, controls, {
      player: 'A',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(true);
    expect(canCompleteAltarRiteThisTurn(altar, { ...controls, control: { A: 2, B: 4 } }, {
      player: 'A',
      completionConditionSatisfied: true,
      completionTimingReached: true,
    })).toBe(false);
  });
});

describe('clean v0.6.2 Martyrdom sequencing', () => {
  const base = (): MartyrdomState => ({
    hand: ['Martyrdom', 'Other'],
    graveyard: [],
    conviction: 1,
    opponentReserve: ['R1', 'R2'],
    opponentDiscardPile: ['old'],
    opponentGraveyard: ['G'],
    battleResult: 'loss',
    retreatRequired: true,
    occupationApplies: true,
    martyrdomAwaitingBattleCardClear: false,
  });

  test('playing Martyrdom before clear does not prematurely move Reserve or set Conviction', () => {
    const pending = playMartyrdomBeforeBattleCardsClear(base(), { duringAftermathBeforeClear: true });
    expect(pending.hand).toEqual(['Other']);
    expect(pending.opponentReserve).toEqual(['R1', 'R2']);
    expect(pending.opponentGraveyard).toEqual(['G']);
    expect(pending.conviction).toBe(1);
    expect(pending.martyrdomAwaitingBattleCardClear).toBe(true);
  });

  test('battle-card clear sends remaining Reserve to Graveyard, then sets Conviction to 4 and buries Martyrdom', () => {
    const pending = playMartyrdomBeforeBattleCardsClear(base(), { duringAftermathBeforeClear: true });
    const resolved = clearBattleCardsWithMartyrdom(pending);
    expect(resolved.opponentReserve).toEqual([]);
    expect(resolved.opponentGraveyard).toEqual(['G', 'R1', 'R2']);
    expect(resolved.conviction).toBe(4);
    expect(resolved.graveyard).toEqual(['Martyrdom']);
    expect(resolved.retreatRequired).toBe(true);
    expect(resolved.occupationApplies).toBe(true);
  });

  test('an applicable No Martyrs prevents the losing opponent from playing Martyrdom', () => {
    expect(() => playMartyrdomBeforeBattleCardsClear(base(), {
      duringAftermathBeforeClear: true,
      preventedByNoMartyrs: true,
    })).toThrow(/No Martyrs/);
  });
});
