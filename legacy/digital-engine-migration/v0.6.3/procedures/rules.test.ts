import { describe, expect, test } from 'vitest';
import { v063CanonicalContent } from '../content/v063';
import * as v063Rules from './rules';
import {
  V063_SETUP_SEQUENCE,
  V063_TURN_SEQUENCE,
  advanceV063TurnPhase,
  applyV063BattleOutcome,
  applyV063Capture,
  applyV063MovementChoice,
  arrangeOpeningTerritories,
  beginEffectGrantedMovement,
  beginNormalV063Movement,
  beginV063ActiveBattle,
  beginV063Onset,
  canInitiateLastStand,
  createInitialFrontLineState,
  createV063LastStandBattle,
  createV063PendingBattle,
  createV063TurnState,
  defenderHasV063DefensiveEdge,
  determineFirstPlayer,
  isBeyondOwnEnd,
  placeStartingTokens,
  resolveOpeningSelection,
  resolveV063BattleOutcome,
  resolveV063Withdrawal,
  retreatFromOwnFinalTerritoryBeyondGauntlet,
  retreatV063Position,
  victoryFromFinalTerritoryCapture,
  victoryFromLastStand,
  type FrontLineState,
  type LastStandAccessInput,
  type V063BattleState,
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

describe('v0.6.3 rules surface boundary', () => {
  test('does not re-export stale v0.6.2 runtime procedures', () => {
    for (const name of [
      'createTurnState',
      'advanceTurnPhase',
      'beginMovement',
      'applyMovementChoice',
      'validateFrontLineState',
      'controlsTerritory',
      'nextOpposingTerritory',
      'canAdvanceFrontLine',
      'advanceFrontLine',
      'applyNormalCapture',
      'createPendingBattle',
      'acceptTerms',
      'refuseTerms',
      'beginOnset',
      'beginActiveBattle',
      'resolveBattleOutcome',
      'applyBattleOutcome',
      'resolveWithdrawal',
      'retreatPosition',
    ]) {
      expect(v063Rules).not.toHaveProperty(name);
    }
  });

  test('owns the published turn sequence and does not open Movement before its movement sequence begins', () => {
    expect(V063_TURN_SEQUENCE).toEqual(['capture', 'draw', 'opening', 'movement', 'denouement', 'cleanup']);
    let state = createV063TurnState();
    state = advanceV063TurnPhase(advanceV063TurnPhase(advanceV063TurnPhase(state)));
    expect(state.phase).toBe('movement');
    expect(state.movementSequenceOpen).toBe(false);
    expect(state.movementSequenceSource).toBeNull();

    state = beginNormalV063Movement(state);
    expect(state.movementSequenceOpen).toBe(true);
    expect(state.movementSequenceSource).toBe('normal');
    expect(state.movementRemaining).toBe(1);
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

describe('v0.6.3 Front Line and Capture', () => {
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

  test('does not invent a capture when the next position beyond the Front Line is not opponent-controlled', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 2, B: 2 },
      position: { A: 4, B: 5 },
    };
    expect(applyV063Capture(state, 'A')).toMatchObject({ capturedTerritory: null, victory: null });
  });

  test('Front Line state can represent a player beyond their own end without treating it as invalid', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: 0, B: 6 },
    };
    expect(() => applyV063Capture(state, 'B')).not.toThrow();
    expect(applyV063Capture(state, 'B').capturedTerritory).toBeNull();
  });

  test('final-Territory capture is an immediate Run-the-Gauntlet victory route', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 5, B: 1 },
      position: { A: 5, B: 5 },
    };
    const result = applyV063Capture(state, 'A');
    expect(result.state.control).toEqual({ A: 6, B: 0 });
    expect(result.victory).toEqual(victoryFromFinalTerritoryCapture('A'));
  });
});

describe('v0.6.3 retreat, Last Stand, and battle outcome', () => {
  const lastStandAccess: LastStandAccessInput = {
    attacker: 'A',
    defender: 'B',
    territoryCount: 6,
    attackerPosition: 5,
    defenderPosition: 6,
    separateMovementSequence: true,
    advancingBeyondOpponentEnd: true,
  };

  test('retreat from the defender own final Territory moves beyond the Gauntlet', () => {
    expect(retreatV063Position('B', 5, 6)).toBe(6);
    expect(retreatV063Position('A', 0, 6)).toBe(-1);
    expect(retreatFromOwnFinalTerritoryBeyondGauntlet('B', 5, 6)).toBe(6);
    expect(isBeyondOwnEnd('B', 6, 6)).toBe(true);
  });

  test('Last Stand requires a separate movement sequence but not final-Territory capture or control', () => {
    expect(canInitiateLastStand(lastStandAccess)).toBe(true);
    expect(canInitiateLastStand({ ...lastStandAccess, separateMovementSequence: false })).toBe(false);
  });

  test('constructs a Last Stand beyond the defender end and grants the defender Defensive Edge', () => {
    const battle = createV063LastStandBattle(lastStandAccess);
    expect(battle).toMatchObject({
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 5,
      contestedPosition: 6,
      positions: { A: 6, B: 6 },
      lastStand: true,
      stage: 'pending',
    });
    expect(defenderHasV063DefensiveEdge(battle)).toBe(true);
  });

  test('battle outcomes return actual player identities even when Player B is the attacker', () => {
    expect(resolveV063BattleOutcome({
      attacker: 'B',
      defender: 'A',
      attackerTotal: 7,
      defenderTotal: 4,
      defenderHasDefensiveEdge: true,
    })).toEqual({ winner: 'B', loser: 'A', method: 'total', tiebreakRounds: 0 });
  });

  test('unresolved tied totals use decisive unmodified Tiebreak Rolls', () => {
    expect(resolveV063BattleOutcome({
      attacker: 'A',
      defender: 'B',
      attackerTotal: 5,
      defenderTotal: 5,
      defenderHasDefensiveEdge: false,
      tiebreakRolls: [[3, 3], [6, 2]],
    })).toEqual({ winner: 'A', loser: 'B', method: 'tiebreak_roll', tiebreakRounds: 2 });
  });

  test('a losing attacker returns to its origin while a losing defender retreats toward its own end', () => {
    let attackerLoss = activeBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 3,
      contestedPosition: 4,
      positions: { A: 4, B: 4 },
      defenderControlsContested: true,
    });
    const attackerOutcome = resolveV063BattleOutcome({
      attacker: 'A', defender: 'B', attackerTotal: 2, defenderTotal: 5, defenderHasDefensiveEdge: true,
    });
    attackerLoss = applyV063BattleOutcome(attackerLoss, attackerOutcome).state;
    expect(attackerLoss.positions).toEqual({ A: 3, B: 4 });

    let defenderLoss = activeBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 4,
      contestedPosition: 5,
      positions: { A: 5, B: 5 },
      defenderControlsContested: true,
    });
    const defenderOutcome = resolveV063BattleOutcome({
      attacker: 'A', defender: 'B', attackerTotal: 6, defenderTotal: 1, defenderHasDefensiveEdge: true,
    });
    defenderLoss = applyV063BattleOutcome(defenderLoss, defenderOutcome).state;
    expect(defenderLoss.positions).toEqual({ A: 5, B: 6 });
    expect(defenderLoss.occupier).toBe('A');
  });

  test('winning a Last Stand immediately runs the Gauntlet', () => {
    let battle = createV063LastStandBattle(lastStandAccess);
    battle = beginV063ActiveBattle(beginV063Onset(battle));
    const outcome = resolveV063BattleOutcome({
      attacker: 'A', defender: 'B', attackerTotal: 8, defenderTotal: 4, defenderHasDefensiveEdge: true,
    });
    const result = applyV063BattleOutcome(battle, outcome);
    expect(result.victory).toEqual(victoryFromLastStand('A', 'B'));
    expect(result.state.positions).toEqual({ A: 6, B: 6 });
  });
});

describe('v0.6.3 withdrawal', () => {
  test('pending-battle withdrawal prevents the battle and does not create an Aftermath', () => {
    const pending = createV063PendingBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 4,
      contestedPosition: 5,
      positions: { A: 5, B: 5 },
      defenderControlsContested: true,
    });
    const result = resolveV063Withdrawal(pending, ['A']);
    expect(result.positions).toEqual({ A: 4, B: 5 });
    expect(result.completeNonResultAftermath).toBe(false);
    expect(result.clearCommittedCards).toBe(false);
  });

  test('active defender withdrawal can move beyond the Gauntlet and completes non-result Aftermath steps', () => {
    const battle = activeBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 4,
      contestedPosition: 5,
      positions: { A: 5, B: 5 },
      defenderControlsContested: true,
    });
    const result = resolveV063Withdrawal(battle, ['B']);
    expect(result.positions).toEqual({ A: 5, B: 6 });
    expect(result.occupier).toBe('A');
    expect(result.winner).toBeNull();
    expect(result.loser).toBeNull();
    expect(result.completeNonResultAftermath).toBe(true);
    expect(result.clearCommittedCards).toBe(true);
  });

  test('when both players withdraw, the attacker returns first and no occupier is created', () => {
    const battle = activeBattle({
      territoryCount: 6,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 3,
      contestedPosition: 4,
      positions: { A: 4, B: 4 },
      defenderControlsContested: true,
    });
    const result = resolveV063Withdrawal(battle, ['A', 'B']);
    expect(result.positions).toEqual({ A: 3, B: 5 });
    expect(result.occupier).toBeNull();
  });
});

describe('v0.6.3 granted movement', () => {
  test('effect-granted movement starts a new sequence outside the normal Movement phase', () => {
    let state = createV063TurnState();
    state = advanceV063TurnPhase(advanceV063TurnPhase(advanceV063TurnPhase(advanceV063TurnPhase(state))));
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

function activeBattle(input: Parameters<typeof createV063PendingBattle>[0]): V063BattleState {
  return beginV063ActiveBattle(beginV063Onset(createV063PendingBattle(input)));
}
