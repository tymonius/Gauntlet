import { describe, expect, test } from 'vitest';
import {
  applyV064MovementChoice,
  beginNormalV064Movement,
  createV064BattleOnset,
  createV064TurnState,
  endV064OnsetWithoutBattle,
  proceedV064ToGambits,
  resolveV064Withdrawal,
} from './rules';

function normalOnset() {
  return createV064BattleOnset({
    territoryCount: 6,
    attacker: 'A',
    defender: 'B',
    attackerOrigin: 2,
    contestedPosition: 3,
    positions: { A: 3, B: 3 },
    defenderControlsContested: true,
  });
}

describe('v0.6.4 Onset battle sequence', () => {
  test('initiated battles enter Onset directly with no pending stage', () => {
    const battle = normalOnset();
    expect(battle.stage).toBe('onset');
    expect(battle.attacker).toBe('A');
    expect(battle.defender).toBe('B');
    expect(battle.contestedPosition).toBe(3);
    expect(battle.attackerOrigin).toBe(2);
  });

  test('a battle proceeds from Onset directly to Gambits', () => {
    const battle = proceedV064ToGambits(normalOnset());
    expect(battle.stage).toBe('active');
  });

  test('accepted Terms end the sequence during Onset without a battle or Aftermath', () => {
    const ended = endV064OnsetWithoutBattle(
      normalOnset(),
      'terms_accepted',
      { A: 2, B: 3 },
    );
    expect(ended.stage).toBe('ended');
    expect(ended.endReason).toBe('terms_accepted');
    expect(ended.termsAccepted).toBe(true);
    expect(ended.winner).toBeNull();
    expect(ended.loser).toBeNull();
    expect(ended.completeNonResultAftermath).toBe(false);
    expect(ended.clearCommittedCards).toBe(false);
    expect(ended.positions).toEqual({ A: 2, B: 3 });
  });

  test('withdrawal during Onset ends before a battle is fought', () => {
    const ended = resolveV064Withdrawal(normalOnset(), ['A']);
    expect(ended.stage).toBe('ended');
    expect(ended.endReason).toBe('withdrawal');
    expect(ended.completeNonResultAftermath).toBe(false);
    expect(ended.clearCommittedCards).toBe(false);
    expect(ended.positions.A).toBe(2);
  });

  test('withdrawal after proceeding to Gambits uses non-result Aftermath cleanup', () => {
    const active = proceedV064ToGambits(normalOnset());
    const ended = resolveV064Withdrawal(active, ['A']);
    expect(ended.stage).toBe('ended');
    expect(ended.completeNonResultAftermath).toBe(true);
    expect(ended.clearCommittedCards).toBe(true);
  });
});

describe('v0.6.4 movement terminology', () => {
  test('movement records a battle initiation and ends that movement sequence', () => {
    const movement = beginNormalV064Movement(
      { ...createV064TurnState(), phase: 'movement' },
      1,
    );
    const next = applyV064MovementChoice(movement, 'advance', { initiatesBattle: true });
    expect(next.battleInitiated).toBe(true);
    expect(next.movementRemaining).toBe(0);
    expect(next.movementSequenceOpen).toBe(false);
    expect(next.movementSequenceSource).toBeNull();
  });
});
