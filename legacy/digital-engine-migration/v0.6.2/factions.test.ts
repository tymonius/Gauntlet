import { describe, expect, test } from 'vitest';
import {
  canGuardCurrentProgress,
  canUseFactionAction,
  createFinancialCapacityTurn,
  createPurgeTurnState,
  evaluateFinancialCapacity,
  financialCapacityRequirementSatisfied,
  FINANCIER_STARTING_CAPITAL,
  GUARDIANS_PROTECTION_VALUES,
  recordFinancialCapacityAction,
  useFinalJudgmentPurge,
  usePurgeFactionAction,
} from './factions';

describe('Faction Action timing', () => {
  test('uses the adopted Financier and Intelligence Denouement timing', () => {
    expect(FINANCIER_STARTING_CAPITAL).toBe(2);
    for (const action of ['place_treasury', 'purchase_deed', 'play_the_market', 'hostile_takeover'] as const) {
      expect(canUseFactionAction(action, 'opening')).toBe(false);
      expect(canUseFactionAction(action, 'denouement')).toBe(true);
    }
    expect(canUseFactionAction('intelligence_operation', 'opening')).toBe(false);
    expect(canUseFactionAction('intelligence_operation', 'denouement')).toBe(true);
  });

  test('keeps Begin a Rite in Denouement and Purge in either Action phase', () => {
    expect(canUseFactionAction('begin_rite', 'opening')).toBe(false);
    expect(canUseFactionAction('begin_rite', 'denouement')).toBe(true);
    expect(canUseFactionAction('purge', 'opening')).toBe(true);
    expect(canUseFactionAction('purge', 'denouement')).toBe(true);
  });
});

describe('Financial Capacity', () => {
  test('is determined once after Capture effects and before Draw', () => {
    expect(evaluateFinancialCapacity({
      timing: 'after_capture_before_draw',
      treasuryValue: 4,
      territoriesControlled: 3,
    })).toEqual({
      evaluated: true,
      active: true,
      additionalActions: 1,
      requiresFinancierFactionAction: true,
    });
    expect(evaluateFinancialCapacity({
      timing: 'after_capture_before_draw',
      treasuryValue: 3,
      territoriesControlled: 3,
    }).active).toBe(false);
    expect(() => evaluateFinancialCapacity({
      timing: 'other',
      treasuryValue: 4,
      territoriesControlled: 3,
    })).toThrow(/after Capture effects and before Draw/);
  });

  test('allows at most one Action in each phase', () => {
    let state = createFinancialCapacityTurn(true);
    state = recordFinancialCapacityAction(state, 'opening', 'general');
    expect(() => recordFinancialCapacityAction(state, 'opening', 'general')).toThrow(/Only one Action/);
    state = recordFinancialCapacityAction(state, 'denouement', 'financier_faction');
    expect(financialCapacityRequirementSatisfied(state)).toBe(true);
  });

  test('requires at least one Financier Faction Action when both Actions are taken', () => {
    let valid = createFinancialCapacityTurn(true);
    valid = recordFinancialCapacityAction(valid, 'opening', 'general');
    valid = recordFinancialCapacityAction(valid, 'denouement', 'financier_faction');
    expect(financialCapacityRequirementSatisfied(valid)).toBe(true);

    let invalid = createFinancialCapacityTurn(true);
    invalid = recordFinancialCapacityAction(invalid, 'opening', 'general');
    invalid = recordFinancialCapacityAction(invalid, 'denouement', 'general');
    expect(financialCapacityRequirementSatisfied(invalid)).toBe(false);
  });

  test('does not move Financier Faction Actions into Opening', () => {
    expect(() => recordFinancialCapacityAction(
      createFinancialCapacityTurn(true),
      'opening',
      'financier_faction',
    )).toThrow(/only during Denouement/);
  });
});

describe('Guardians of the Circle', () => {
  test('uses the adopted 1/2/3/4 progression', () => {
    expect(GUARDIANS_PROTECTION_VALUES).toEqual({
      first_rite: 1,
      second_rite: 2,
      third_rite: 3,
      ritual: 4,
    });
    expect(canGuardCurrentProgress('first_rite', 1)).toBe(true);
    expect(canGuardCurrentProgress('second_rite', 1)).toBe(false);
    expect(canGuardCurrentProgress('third_rite', 3)).toBe(true);
    expect(canGuardCurrentProgress('ritual', 3)).toBe(false);
    expect(canGuardCurrentProgress('ritual', 4)).toBe(true);
  });
});

describe('Purge and Final Judgment', () => {
  test('permits one Purge Faction Action during Opening or Denouement', () => {
    const opening = usePurgeFactionAction(createPurgeTurnState(), 'opening');
    expect(opening.purgeFactionActionUsed).toBe(true);
    expect(() => usePurgeFactionAction(opening, 'denouement')).toThrow(/only once per turn/);

    const denouement = usePurgeFactionAction(createPurgeTurnState(), 'denouement');
    expect(denouement.purgeFactionActionUsed).toBe(true);
  });

  test('keeps Final Judgment as a separate no-Action Faction Ability', () => {
    const purgeUsed = usePurgeFactionAction(createPurgeTurnState(), 'opening');
    const result = useFinalJudgmentPurge(purgeUsed, {
      duringAftermathOfWonBattle: true,
      battleCardsCleared: true,
    });
    expect(result.consumesAction).toBe(false);
    expect(result.convictionCostReduction).toBe(1);
    expect(result.state.purgeFactionActionUsed).toBe(true);
    expect(result.state.finalJudgmentUsed).toBe(true);
    expect(() => useFinalJudgmentPurge(result.state, {
      duringAftermathOfWonBattle: true,
      battleCardsCleared: true,
    })).toThrow(/only once per turn/);
  });

  test('requires the adopted Final Judgment Aftermath timing', () => {
    expect(() => useFinalJudgmentPurge(createPurgeTurnState(), {
      duringAftermathOfWonBattle: false,
      battleCardsCleared: true,
    })).toThrow(/won battle’s Aftermath/);
  });
});
