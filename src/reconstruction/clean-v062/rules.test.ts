import { describe, expect, test } from 'vitest';
import {
  acceptTerms,
  advanceTurnPhase,
  applyBattleOutcome,
  applyMovementChoice,
  applyNormalCapture,
  beginActiveBattle,
  beginMovement,
  canInitiateLastStand,
  canTakeAction,
  createInitialFrontLineState,
  createLastStandBattle,
  createPendingBattle,
  createTurnState,
  defenderHasDefensiveEdge,
  grantAdditionalAction,
  refuseTerms,
  resolveBattleOutcome,
  resolveWithdrawal,
  retreatPosition,
  takeAction,
  victoryFromResolvedLastStand,
  type FrontLineState,
} from './rules';

describe('clean v0.6.2 turn and Action rules', () => {
  test('uses Capture → Draw → Opening → Movement → Denouement → Cleanup', () => {
    let state = createTurnState();
    const phases = [state.phase];
    for (let index = 0; index < 5; index += 1) {
      state = advanceTurnPhase(state);
      phases.push(state.phase);
    }
    expect(phases).toEqual(['capture', 'draw', 'opening', 'movement', 'denouement', 'cleanup']);
  });

  test('an additional Action does not permit two Actions in one phase', () => {
    let state = advanceTurnPhase(advanceTurnPhase(grantAdditionalAction(createTurnState())));
    expect(state.phase).toBe('opening');
    state = takeAction(state);
    expect(canTakeAction(state)).toBe(false);
    state = advanceTurnPhase(advanceTurnPhase(state));
    expect(state.phase).toBe('denouement');
    expect(canTakeAction(state)).toBe(true);
  });

  test('a pending battle ends the active Movement sequence and loses unused movement', () => {
    let state = advanceTurnPhase(advanceTurnPhase(advanceTurnPhase(createTurnState())));
    state = beginMovement(state, 2);
    state = applyMovementChoice(state, 'advance', { createsPendingBattle: true });
    expect(state.movementRemaining).toBe(0);
    expect(state.movementSequenceOpen).toBe(false);
    expect(state.pendingBattleCreated).toBe(true);
  });
});

describe('clean v0.6.2 Front Line and edge geometry', () => {
  test('standard six-Territory setup begins 3–3 with tokens outside their own ends', () => {
    expect(createInitialFrontLineState()).toEqual({
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: -1, B: 6 },
    });
  });

  test('normal Capture transfers the next opposing Territory from a real 3–3 state', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 3, B: 3 },
      position: { A: 3, B: 4 },
    };
    const result = applyNormalCapture(state, 'A');
    expect(result.capturedTerritory).toBe(3);
    expect(result.state.control).toEqual({ A: 4, B: 2 });
  });

  test('deep Occupation still advances the Front Line by only one Territory during normal Capture', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 2, B: 4 },
      position: { A: 4, B: 5 },
    };
    const result = applyNormalCapture(state, 'A');
    expect(result.capturedTerritory).toBe(2);
    expect(result.state.control).toEqual({ A: 3, B: 3 });
  });

  test('losing on the final Territory at your own end retreats beyond the Gauntlet', () => {
    expect(retreatPosition('A', 0, 6)).toBe(-1);
    expect(retreatPosition('B', 5, 6)).toBe(6);
  });
});

describe('clean v0.6.2 cumulative Run the Gauntlet victory', () => {
  test('capturing the opponent final Territory does not itself win in v0.6.2', () => {
    const state: FrontLineState = {
      territoryCount: 6,
      control: { A: 5, B: 1 },
      position: { A: 5, B: 6 },
    };
    const capture = applyNormalCapture(state, 'A');
    expect(capture.capturedTerritory).toBe(5);
    expect(capture.state.control).toEqual({ A: 6, B: 0 });
    expect(canInitiateLastStand(capture.state, 'A')).toBe(true);
  });

  test('Last Stand is unavailable until the opponent final Territory joins the attacker Front Line', () => {
    const occupiedButUncaptured: FrontLineState = {
      territoryCount: 6,
      control: { A: 5, B: 1 },
      position: { A: 5, B: 6 },
    };
    expect(canInitiateLastStand(occupiedButUncaptured, 'A')).toBe(false);
    expect(() => createLastStandBattle(occupiedButUncaptured, 'A')).toThrow(/requires control/i);
  });

  test('Last Stand is fought beyond the defender own end and grants Defensive Edge', () => {
    const ready: FrontLineState = {
      territoryCount: 6,
      control: { A: 6, B: 0 },
      position: { A: 5, B: 6 },
    };
    const battle = createLastStandBattle(ready, 'A');
    expect(battle.contestedPosition).toBe(6);
    expect(battle.positions).toEqual({ A: 6, B: 6 });
    expect(battle.lastStand).toBe(true);
    expect(defenderHasDefensiveEdge(battle)).toBe(true);
  });

  test('winning the opponent Last Stand completes the cumulative normal victory', () => {
    const ready: FrontLineState = {
      territoryCount: 6,
      control: { A: 6, B: 0 },
      position: { A: 5, B: 6 },
    };
    const active = beginActiveBattle(refuseTerms(createLastStandBattle(ready, 'A')));
    const outcome = resolveBattleOutcome({
      attackerTotal: 9,
      defenderTotal: 8,
      defenderHasDefensiveEdge: true,
    });
    const resolved = applyBattleOutcome(active, outcome);
    expect(victoryFromResolvedLastStand(resolved)).toEqual({
      winner: 'A',
      route: 'last_stand',
      immediate: true,
    });
  });
});

describe('clean v0.6.2 pending battle, Terms, withdrawal, and Tiebreak', () => {
  const pending = () => createPendingBattle({
    territoryCount: 6,
    attacker: 'A',
    defender: 'B',
    attackerOrigin: 2,
    contestedPosition: 3,
    positions: { A: 3, B: 3 },
    defenderControlsContested: true,
  });

  test('ordinary accepted Terms prevent Onset and Aftermath', () => {
    const result = acceptTerms(pending());
    expect(result.stage).toBe('withdrawn');
    expect(result.positions.A).toBe(2);
    expect(result.positions.B).toBe(3);
    expect(result.completeNonResultAftermath).toBe(false);
    expect(result.winner).toBeNull();
  });

  test('post-Onset withdrawal completes only non-result Aftermath and clears committed cards', () => {
    const active = beginActiveBattle(refuseTerms(pending()));
    const result = resolveWithdrawal(active, ['A']);
    expect(result.completeNonResultAftermath).toBe(true);
    expect(result.clearCommittedCards).toBe(true);
    expect(result.winner).toBeNull();
  });

  test('Defensive Edge resolves a tied total before the separate Tiebreak Roll', () => {
    expect(resolveBattleOutcome({
      attackerTotal: 8,
      defenderTotal: 8,
      defenderHasDefensiveEdge: true,
      tiebreakRolls: [[6, 1]],
    })).toEqual({ winner: 'defender', loser: 'attacker', method: 'defensive_edge', tiebreakRounds: 0 });
  });

  test('without Defensive Edge, further tied rolls are rerolled until decisive', () => {
    expect(resolveBattleOutcome({
      attackerTotal: 8,
      defenderTotal: 8,
      defenderHasDefensiveEdge: false,
      tiebreakRolls: [[3, 3], [6, 2]],
    })).toEqual({ winner: 'attacker', loser: 'defender', method: 'tiebreak_roll', tiebreakRounds: 2 });
  });
});
