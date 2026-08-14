import { describe, expect, test } from 'vitest';
import { cleanV063Content } from './content';
import {
  CLEAN_V063_SETUP_SEQUENCE,
  advanceTurnPhase,
  applyV063Capture,
  applyV063MovementChoice,
  arrangeOpeningTerritories,
  beginEffectGrantedMovement,
  canInitiateV063LastStand,
  createCleanV063TurnState,
  createInitialV063FrontLineState,
  createV063LastStandBattle,
  determineFirstPlayer,
  isBeyondOwnEnd,
  placeStartingTokens,
  resolveOpeningSelection,
  retreatFromOwnFinalTerritoryBeyondGauntlet,
  victoryAfterFrontLineAdvance,
  victoryFromFinalTerritoryCapture,
  victoryFromLastStand,
  type FrontLineState,
} from './rules';

describe('clean v0.6.3 authority adapter', () => {
  test('loads complete authority rather than withdrawn candidate data', () => {
    expect(cleanV063Content.rulesVersion).toBe('v0.6.3-clean');
    expect(cleanV063Content.authorityTarget).toBe('clean-v0.6.3-canonical-structured-authority');
    expect(cleanV063Content.content.cards).toHaveLength(128);
    expect(cleanV063Content.content.territories).toHaveLength(25);
    expect(cleanV063Content.cardsById.get('neutral-reserves')?.name).toBe('Second Line');
    expect(cleanV063Content.territoriesById.get('territory-smuggler-s-pass')?.name).toBe("Smuggler's Run");
  });

  test('locks setup and independent Last Stand metadata', () => {
    const deck = cleanV063Content.content.deck_construction;
    expect([deck.opening_draw, deck.opening_discard, deck.opening_hand]).toEqual([4, 1, 3]);
    expect(deck.opening_discard_face_up).toBe(true);
    expect(deck.territory_arrangement_after_opening_selection).toBe(true);
    expect(deck.first_player_after_territory_arrangement).toBe(true);
    const lastStand = cleanV063Content.content.battlefield.last_stand;
    expect(lastStand.final_territory_control_required).toBe(false);
    expect(lastStand.final_territory_capture_required).toBe(false);
    expect(lastStand.separate_movement_sequence_required).toBe(true);
  });
});

describe('clean v0.6.3 setup', () => {
  test('uses the adopted setup sequence', () => {
    expect(CLEAN_V063_SETUP_SEQUENCE).toEqual([
      'prepare_faction_components', 'shuffle_deck_to_draw_pile', 'draw_four', 'discard_one_face_up',
      'arrange_territories', 'form_and_reveal_gauntlet', 'place_player_tokens', 'determine_first_player',
    ]);
  });
  test('draws four, discards one face up, and keeps three', () => {
    expect(resolveOpeningSelection(['one', 'two', 'three', 'four', 'five'], 1)).toEqual({
      hand: ['one', 'three', 'four'], discardPile: ['two'], drawPile: ['five'], openingDiscard: 'two',
    });
  });
  test('permits informed reordering but not Territory substitution', () => {
    expect(arrangeOpeningTerritories(['A', 'B', 'C'], ['C', 'A', 'B'])).toEqual(['C', 'A', 'B']);
    expect(() => arrangeOpeningTerritories(['A', 'B', 'C'], ['A', 'B', 'D'])).toThrow(/selected Territories/);
  });
  test('places tokens on own-end Territories without movement or entering', () => {
    expect(placeStartingTokens()).toEqual({ positions: { A: 0, B: 5 }, movementOccurred: false, enteredTerritory: false });
    expect(createInitialV063FrontLineState()).toEqual({ territoryCount: 6, control: { A: 3, B: 3 }, position: { A: 0, B: 5 } });
  });
  test('determines first player only from a decisive roll', () => {
    expect(determineFirstPlayer({ A: 6, B: 2 })).toBe('A');
    expect(() => determineFirstPlayer({ A: 4, B: 4 })).toThrow(/rerolled/);
  });
});

describe('clean v0.6.3 Run the Gauntlet', () => {
  test('normal Capture still transfers opposing frontier control', () => {
    const state: FrontLineState = { territoryCount: 6, control: { A: 3, B: 3 }, position: { A: 3, B: 4 } };
    const result = applyV063Capture(state, 'A');
    expect(result.capturedTerritory).toBe(3);
    expect(result.state.control).toEqual({ A: 4, B: 2 });
    expect(result.victory).toBeNull();
  });
  test('capture of the opponent-end Territory wins immediately', () => {
    const state: FrontLineState = { territoryCount: 6, control: { A: 5, B: 1 }, position: { A: 5, B: 5 } };
    const result = applyV063Capture(state, 'A');
    expect(result.state.control).toEqual({ A: 6, B: 0 });
    expect(result.victory).toEqual({ winner: 'A', route: 'final_territory_capture', immediate: true });
    expect(victoryAfterFrontLineAdvance(result.state, 'A')).toEqual(victoryFromFinalTerritoryCapture('A'));
  });
  test('Last Stand is a separate normal victory route', () => {
    expect(victoryFromLastStand('A', 'B')).toEqual({ winner: 'A', route: 'last_stand', immediate: true });
    expect(victoryFromLastStand('B', 'B')).toBeNull();
  });
  test('retreat can move beyond either own end', () => {
    expect(retreatFromOwnFinalTerritoryBeyondGauntlet('A', 0, 6)).toBe(-1);
    expect(retreatFromOwnFinalTerritoryBeyondGauntlet('B', 5, 6)).toBe(6);
    expect(isBeyondOwnEnd('A', -1, 6)).toBe(true);
    expect(isBeyondOwnEnd('B', 6, 6)).toBe(true);
  });
  test('Last Stand requires a separate movement sequence, not prior capture/control', () => {
    const access = { attacker: 'A' as const, defender: 'B' as const, territoryCount: 6, attackerPosition: 5, defenderPosition: 6, advancingBeyondOpponentEnd: true };
    expect(canInitiateV063LastStand({ ...access, separateMovementSequence: true })).toBe(true);
    expect(canInitiateV063LastStand({ ...access, separateMovementSequence: false })).toBe(false);
    const battle = createV063LastStandBattle({ ...access, separateMovementSequence: true });
    expect(battle.lastStand).toBe(true);
    expect(battle.contestedPosition).toBe(6);
    expect(battle.positions.A).toBe(6);
  });
});

describe('clean v0.6.3 movement sequences', () => {
  test('effect-granted movement can begin outside Movement and ends on pending battle', () => {
    let state = createCleanV063TurnState();
    state = { ...advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(state)))), movementSequenceSource: null };
    expect(state.phase).toBe('denouement');
    let moved = beginEffectGrantedMovement(state, 2);
    moved = applyV063MovementChoice(moved, 'advance');
    expect(moved.movementRemaining).toBe(1);
    moved = applyV063MovementChoice(moved, 'advance', { createsPendingBattle: true });
    expect(moved.pendingBattleCreated).toBe(true);
    expect(moved.movementSequenceOpen).toBe(false);
    expect(moved.movementSequenceSource).toBeNull();
  });
});
