import { describe, expect, test } from 'vitest';
import {
  FINANCIER_STARTING_CAPITAL,
  canPreventMysticInterruption,
  canUseFactionAction,
  createFinancialCapacityTurn,
  createPurgeTurnState,
  evaluateFinancialCapacity,
  financialCapacityRequirementSatisfied,
  guardiansRequiredValue,
  recordFinancialCapacityAction,
  useFinalJudgmentPurge,
  usePurgeFactionAction,
} from './factions';

describe('clean v0.6.2 faction Action timings', () => {
  test('Financiers and Intelligence faction Actions are Denouement-only', () => {
    for (const action of [
      'place_treasury',
      'purchase_deed',
      'play_the_market',
      'hostile_takeover',
      'start_mission',
      'complete_mission',
      'abort_mission',
      'start_special_operation',
      'complete_special_operation',
    ] as const) {
      expect(canUseFactionAction(action, 'denouement'), action).toBe(true);
      expect(canUseFactionAction(action, 'opening'), action).toBe(false);
    }
  });

  test('Begin a Rite and begin Ritual are normally Denouement Actions', () => {
    expect(canUseFactionAction('begin_rite', 'denouement')).toBe(true);
    expect(canUseFactionAction('begin_rite', 'opening')).toBe(false);
    expect(canUseFactionAction('begin_ritual', 'denouement')).toBe(true);
  });

  test('Purge may occupy Opening or Denouement', () => {
    expect(canUseFactionAction('purge', 'opening')).toBe(true);
    expect(canUseFactionAction('purge', 'denouement')).toBe(true);
  });
});

describe('clean v0.6.2 Financial Capacity', () => {
  test('Financiers begin with 2 Capital', () => {
    expect(FINANCIER_STARTING_CAPITAL).toBe(2);
  });

  test('eligibility is evaluated after Capture effects and before Draw', () => {
    expect(evaluateFinancialCapacity({
      timing: 'after_capture_effects_before_draw',
      treasuryValue: 4,
      territoriesControlled: 3,
    })).toEqual({
      evaluated: true,
      active: true,
      additionalActions: 1,
      requiresFinancierFactionAction: true,
    });
    expect(() => evaluateFinancialCapacity({
      timing: 'other',
      treasuryValue: 4,
      territoriesControlled: 3,
    })).toThrow(/after Capture effects and before Draw/);
  });

  test('two Actions require one Financier Faction Action and never stack in one phase', () => {
    let state = createFinancialCapacityTurn(true);
    state = recordFinancialCapacityAction(state, 'opening', 'general');
    expect(() => recordFinancialCapacityAction(state, 'opening', 'general')).toThrow(/Only one Action/);
    expect(financialCapacityRequirementSatisfied(state)).toBe(true);
    state = recordFinancialCapacityAction(state, 'denouement', 'financier_faction');
    expect(financialCapacityRequirementSatisfied(state)).toBe(true);

    let invalid = createFinancialCapacityTurn(true);
    invalid = recordFinancialCapacityAction(invalid, 'opening', 'general');
    invalid = recordFinancialCapacityAction(invalid, 'denouement', 'general');
    expect(financialCapacityRequirementSatisfied(invalid)).toBe(false);
  });
});

describe('clean v0.6.2 Guardians of the Circle', () => {
  test('required Arcane value is 1 plus completed Rites', () => {
    expect([0, 1, 2, 3].map(guardiansRequiredValue)).toEqual([1, 2, 3, 4]);
    expect(canPreventMysticInterruption(2, 3)).toBe(true);
    expect(canPreventMysticInterruption(2, 2)).toBe(false);
  });
});

describe('clean v0.6.2 Purge and Final Judgment', () => {
  test('the Purge Faction Action is once per turn and activates the two-phase permission', () => {
    const used = usePurgeFactionAction(createPurgeTurnState(), 'opening');
    expect(used.purgeFactionActionUsed).toBe(true);
    expect(used.twoPhasePermissionActive).toBe(true);
    expect(() => usePurgeFactionAction(used, 'denouement')).toThrow(/only once per turn/);
  });

  test('Final Judgment is separate: no Action, no two-phase activation, cost reduced by 1', () => {
    const result = useFinalJudgmentPurge(createPurgeTurnState(), {
      duringAftermathOfWonBattle: true,
      battleCardsClearedAndMoveTriggersApplied: true,
    });
    expect(result.consumesAction).toBe(false);
    expect(result.activatesTwoPhasePermission).toBe(false);
    expect(result.convictionCostReduction).toBe(1);
    expect(result.state.purgeFactionActionUsed).toBe(false);
    expect(result.state.twoPhasePermissionActive).toBe(false);
    expect(result.state.finalJudgmentUsed).toBe(true);
  });
});
