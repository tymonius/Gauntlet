import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import {
  V063_SETUP_SEQUENCE,
  advanceTurnPhase,
  applyV063Capture,
  applyV063MovementChoice,
  arrangeOpeningTerritories,
  beginEffectGrantedMovement,
  canInitiateLastStand,
  createInitialFrontLineState,
  createV063TurnState,
  determineFirstPlayer,
  isBeyondOwnEnd,
  placeStartingTokens,
  resolveOpeningSelection,
  retreatFromOwnFinalTerritoryBeyondGauntlet,
  victoryFromFinalTerritoryCapture,
  victoryFromLastStand,
  type FrontLineState,
} from './rules';

describe('v0.6.3 canonical digital content', () => {
  test('loads the published v0.6.3 release rather than a pre-publication candidate', () => {
    expect(v063CanonicalContent.rulesVersion).toBe('v0.6.3');
    expect(v063CanonicalContent.content.cards).toHaveLength(128);
    expect(v063CanonicalContent.content.territories).toHaveLength(25);
    expect(v063CanonicalContent.cardsById.get('neutral-reserves')?.name).toBe('Second Line');
    expect(v063CanonicalContent.territoriesById.get('territory-smuggler-s-pass')?.name).toBe("Smuggler's Run");
  });

  test('carries the adopted setup and Last Stand metadata into executable code', () => {
    const deck = v063CanonicalContent.content.deck_construction;
    expect(deck.opening_draw).toBe(4);
    expect(deck.opening_discard).toBe(1);
    expect(deck.opening_hand).toBe(3);
    expect(deck.territory_arrangement_after_opening_selection).toBe(true);
    expect(deck.first_player_after_territory_arrangement).toBe(true);

    const lastStand = v063CanonicalContent.content.battlefield.last_stand;
    expect(lastStand.final_territory_control_required).toBe(false);
    expect(lastStand.final_territory_capture_required).toBe(false);
    expect(lastStand.separate_movement_sequence_required).toBe(true);
  });
});

describe('v0.6.3 setup', () => {
  test('uses the adopted setup sequence', () => {
    expect(V063_SETUP_SEQUENCE).toEqual([
      'prepare_faction_components',
      'shuffle_deck_to_draw_pile',
      'draw_four',
      'discard_one_face_up',
      'arrange_territories',
      'form_and_reveal_gauntlet',
      'place_player_tokens',
      'determine_first_player',
    ]);
  });

  test('draws four, discards one face up, and keeps the other three', () => {
    const result = resolveOpeningSelection(['one', 'two', 'three', 'four', 'five', 'six'], 1);
    expect(result.hand).toEqual(['one', 'three', 'four']);
    expect(result.openingDiscard).toBe('two');
    expect(result.discardPile).toEqual(['two']);
    expect(result.drawPile).toEqual(['five', 'six']);
  });

  test('allows strategic Territory reordering after opening selection without changing the selected set', () => {
    expect(arrangeOpeningTerritories(['A', 'B', 'C'], ['C', 'A', 'B'])).toEqual(['C', 'A', 'B']);
    expect(() => arrangeOpeningTerritories(['A', 'B', 'C'], ['A', 'B', 'D'])).toThrow(/selected Territories/);
  });

  test('places tokens on their own-end Territories without movement or entering', () => {
    expect(placeStartingTokens()).toEqual({
      positions: { A: 0, B: 5 },
      movementOccurred: false,
      enteredTerritory: false,
    });
    expect(createInitialFrontLineState()).toEqual({
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: 0, B: 5 },
    });
  });

  test('determines first player only from a decisive post-setup roll', () => {
    expect(determineFirstPlayer({ A: 6, B: 2 })).toBe('A');
    expect(() => determineFirstPlayer({ A: 4, B: 4 })).toThrow(/rerolled/);
  });
});

describe('v0.6.3 capture and Run the Gauntlet', () => {
  test('capturing an opposing frontier Territory transfers it between Front Lines', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: 3, B: 4 },
    };
    const result = applyV063Capture(state, 'A');
    expect(result.capturedTerritory).toBe(3);
    expect(result.state.control).toEqual({ A: 4, B: 2 });
    expect(result.victory).toBeNull();
  });

  test('final-Territory capture is itself an immediate Run-the-Gauntlet victory route', () => {
    expect(victoryFromFinalTerritoryCapture('A')).toEqual({
      winner: 'A',
      route: 'final_territory_capture',
      immediate: true,
    });
  });

  test('any legal capture of the opponent final Territory wins immediately', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 5, B: 1 },
      position: { A: 5, B: 5 },
    };
    const result = applyV063Capture(state, 'A');
    expect(result.state.control).toEqual({ A: 6, B: 0 });
    expect(result.victory).toEqual({
      winner: 'A',
      route: 'final_territory_capture',
      immediate: true,
    });
  });

  test('a Last Stand win is the second normal Run-the-Gauntlet route', () => {
    expect(victoryFromLastStand('A', 'B')).toEqual({
      winner: 'A',
      route: 'last_stand',
      immediate: true,
    });
    expect(victoryFromLastStand('B', 'B')).toBeNull();
  });
});

describe('v0.6.3 edge retreat and Last Stand access', () => {
  test('retreat from the defender own final Territory can move beyond the Gauntlet', () => {
    expect(retreatFromOwnFinalTerritoryBeyondGauntlet('B', 5, 6)).toBe(6);
    expect(isBeyondOwnEnd('B', 6, 6)).toBe(true);
    expect(retreatFromOwnFinalTerritoryBeyondGauntlet('A', 0, 6)).toBe(-1);
    expect(isBeyondOwnEnd('A', -1, 6)).toBe(true);
  });

  test('Last Stand requires a separate movement sequence but not final-Territory capture or control', () => {
    const base = {
      attacker: 'A' as const,
      defender: 'B' as const,
      territoryCount: 6,
      attackerPosition: 5,
      defenderPosition: 6,
      advancingBeyondOpponentEnd: true,
    };
    expect(canInitiateLastStand({ ...base, separateMovementSequence: true })).toBe(true);
    expect(canInitiateLastStand({ ...base, separateMovementSequence: false })).toBe(false);
  });

  test('effect-granted movement starts a new sequence outside the normal Movement phase', () => {
    let state = createV063TurnState();
    state = { ...advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(state)))), movementSequenceSource: null };
    expect(state.phase).toBe('denouement');

    let granted = beginEffectGrantedMovement(state, 2);
    expect(granted.movementSequenceOpen).toBe(true);
    expect(granted.movementSequenceSource).toBe('effect');
    granted = applyV063MovementChoice(granted, 'advance');
    expect(granted.movementRemaining).toBe(1);
    granted = applyV063MovementChoice(granted, 'advance', { createsPendingBattle: true });
    expect(granted.pendingBattleCreated).toBe(true);
    expect(granted.movementSequenceOpen).toBe(false);
    expect(granted.movementRemaining).toBe(0);
  });
});
