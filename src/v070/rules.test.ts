import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  V070_BATTLE_SEQUENCE,
  V070_TURN_SEQUENCE,
  applyV070BattleOutcome,
  applyV070MovementChoice,
  beginEffectGrantedV070Movement,
  beginNormalV070Movement,
  canInitiateV070LastStand,
  createV070BattleOnset,
  createV070LastStandOnset,
  createV070TurnState,
  defenderHasV070DefensiveEdge,
  endV070OnsetWithoutBattle,
  proceedV070ToGambits,
  resolveV070BattleOutcome,
  resolveV070Withdrawal,
  v070BattleWasFought,
  type V070BattleOnsetInput,
  type V070LastStandAccessInput,
} from './rules';

function normalOnset(overrides: Partial<V070BattleOnsetInput> = {}) {
  return createV070BattleOnset({
    territoryCount: 6,
    attacker: 'A',
    defender: 'B',
    attackerOrigin: 2,
    contestedPosition: 3,
    positions: { A: 3, B: 3 },
    defenderControlsContested: true,
    ...overrides,
  });
}

describe('v0.7.0 released sequence contract', () => {
  test('matches the released turn and battle sequences', () => {
    expect(V070_TURN_SEQUENCE).toEqual([
      'capture',
      'draw',
      'opening',
      'movement',
      'denouement',
      'cleanup',
    ]);
    expect(V070_BATTLE_SEQUENCE).toEqual(v070CanonicalContent.content.battle.sequence);
    expect(V070_BATTLE_SEQUENCE[0]).toBe('onset');
  });

  test('initiated battles enter Onset directly with no pending stage', () => {
    const battle = normalOnset();
    expect(battle.stage).toBe('onset');
    expect(v070BattleWasFought(battle)).toBe(false);
  });

  test('normal Onset may originate from a legal off-board Position', () => {
    const battle = createV070BattleOnset({
      territoryCount: 6,
      attacker: 'B',
      defender: 'A',
      attackerOrigin: 6,
      contestedPosition: 5,
      positions: { A: 5, B: 5 },
      defenderControlsContested: true,
    });
    expect(battle.attackerOrigin).toBe(6);
    expect(battle.contestedPosition).toBe(5);
    expect(battle.stage).toBe('onset');
  });

  test('a battle counts as fought only after Onset proceeds to Gambits', () => {
    const active = proceedV070ToGambits(normalOnset());
    expect(active.stage).toBe('active');
    expect(v070BattleWasFought(active)).toBe(true);
  });
});

describe('v0.7.0 Onset endings', () => {
  test('accepted Terms normally withdraw the attacker with no battle or Aftermath', () => {
    const ended = endV070OnsetWithoutBattle(normalOnset(), 'terms_accepted');
    expect(ended).toMatchObject({
      stage: 'ended',
      endReason: 'terms_accepted',
      termsAccepted: true,
      winner: null,
      loser: null,
      occupier: null,
      positions: { A: 2, B: 3 },
      completeNonResultAftermath: false,
      clearCommittedCards: false,
    });
    expect(v070BattleWasFought(ended)).toBe(false);
  });

  test('a Proposal may override the normal accepted-Terms positions explicitly', () => {
    const ended = endV070OnsetWithoutBattle(
      normalOnset(),
      'terms_accepted',
      { A: 3, B: 4 },
    );
    expect(ended.positions).toEqual({ A: 3, B: 4 });
  });

  test('a prevented battle may end Onset without implicit displacement', () => {
    const ended = endV070OnsetWithoutBattle(normalOnset(), 'prevented');
    expect(ended.positions).toEqual({ A: 3, B: 3 });
    expect(ended.completeNonResultAftermath).toBe(false);
    expect(v070BattleWasFought(ended)).toBe(false);
  });

  test('withdrawal during Onset has no Aftermath', () => {
    const ended = resolveV070Withdrawal(normalOnset(), ['A']);
    expect(ended.positions).toEqual({ A: 2, B: 3 });
    expect(ended.completeNonResultAftermath).toBe(false);
    expect(ended.clearCommittedCards).toBe(false);
    expect(v070BattleWasFought(ended)).toBe(false);
  });

  test('withdrawal after Gambits uses the non-result Aftermath path', () => {
    const active = proceedV070ToGambits(normalOnset());
    const ended = resolveV070Withdrawal(active, ['B']);
    expect(ended.positions).toEqual({ A: 3, B: 4 });
    expect(ended.occupier).toBe('A');
    expect(ended.completeNonResultAftermath).toBe(true);
    expect(ended.clearCommittedCards).toBe(true);
    expect(v070BattleWasFought(ended)).toBe(true);
  });

  test('when both players withdraw, the attacker moves first and no occupier is created', () => {
    const ended = resolveV070Withdrawal(proceedV070ToGambits(normalOnset()), ['A', 'B']);
    expect(ended.positions).toEqual({ A: 2, B: 4 });
    expect(ended.occupier).toBeNull();
  });
});

describe('v0.7.0 battle outcome', () => {
  test('Defensive Edge resolves tied battle totals for the defender', () => {
    expect(resolveV070BattleOutcome({
      attacker: 'A',
      defender: 'B',
      attackerTotal: 5,
      defenderTotal: 5,
      defenderHasDefensiveEdge: true,
    })).toEqual({
      winner: 'B',
      loser: 'A',
      method: 'defensive_edge',
      tiebreakRounds: 0,
    });
  });

  test('without Defensive Edge, tied totals require a decisive unmodified Tiebreak Roll', () => {
    expect(resolveV070BattleOutcome({
      attacker: 'A',
      defender: 'B',
      attackerTotal: 5,
      defenderTotal: 5,
      defenderHasDefensiveEdge: false,
      tiebreakRolls: [[3, 3], [6, 2]],
    })).toEqual({
      winner: 'A',
      loser: 'B',
      method: 'tiebreak_roll',
      tiebreakRounds: 2,
    });
  });

  test('a losing defender retreats and a winning attacker becomes occupier when applicable', () => {
    const active = proceedV070ToGambits(normalOnset());
    const outcome = resolveV070BattleOutcome({
      attacker: 'A',
      defender: 'B',
      attackerTotal: 6,
      defenderTotal: 2,
      defenderHasDefensiveEdge: defenderHasV070DefensiveEdge(active),
    });
    const result = applyV070BattleOutcome(active, outcome);
    expect(result.state.positions).toEqual({ A: 3, B: 4 });
    expect(result.state.occupier).toBe('A');
    expect(result.state.clearCommittedCards).toBe(true);
  });
});

describe('v0.7.0 movement', () => {
  test('movement that initiates a battle ends the movement sequence and loses unused movement', () => {
    const movement = beginNormalV070Movement(
      { ...createV070TurnState(), phase: 'movement' },
      2,
    );
    expect(movement.movementRemaining).toBe(3);

    const next = applyV070MovementChoice(movement, 'advance', { initiatesBattle: true });
    expect(next.battleInitiated).toBe(true);
    expect(next.movementRemaining).toBe(0);
    expect(next.movementSequenceOpen).toBe(false);
    expect(next.movementSequenceSource).toBeNull();
  });

  test('effect-granted movement is its own sequence outside the normal Movement phase', () => {
    const state = { ...createV070TurnState(), phase: 'denouement' as const };
    const movement = beginEffectGrantedV070Movement(state, 2);
    const next = applyV070MovementChoice(movement, 'advance');
    expect(next.movementRemaining).toBe(1);
    expect(next.movementSequenceSource).toBe('effect');
  });
});

describe('v0.7.0 Last Stand', () => {
  const access: V070LastStandAccessInput = {
    attacker: 'A',
    defender: 'B',
    territoryCount: 6,
    attackerPosition: 5,
    defenderPosition: 6,
    separateMovementSequence: true,
    advancingBeyondOpponentEnd: true,
  };

  test('requires a new legal movement sequence after forcing the defender beyond their end', () => {
    expect(canInitiateV070LastStand(access)).toBe(true);
    expect(canInitiateV070LastStand({ ...access, separateMovementSequence: false })).toBe(false);
  });

  test('creates the Last Stand beyond the defender end with Defensive Edge', () => {
    const battle = createV070LastStandOnset(access);
    expect(battle).toMatchObject({
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 5,
      contestedPosition: 6,
      positions: { A: 6, B: 6 },
      lastStand: true,
      stage: 'onset',
    });
    expect(defenderHasV070DefensiveEdge(battle)).toBe(true);
  });

  test('an attacker winning the Last Stand runs the Gauntlet immediately', () => {
    const active = proceedV070ToGambits(createV070LastStandOnset(access));
    const outcome = resolveV070BattleOutcome({
      attacker: 'A',
      defender: 'B',
      attackerTotal: 8,
      defenderTotal: 4,
      defenderHasDefensiveEdge: true,
    });
    const result = applyV070BattleOutcome(active, outcome);
    expect(result.victory).toEqual({
      winner: 'A',
      route: 'last_stand',
      immediate: true,
    });
  });
});
