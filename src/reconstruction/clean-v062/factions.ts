import type { ActionPhase } from './rules';

export const FINANCIER_STARTING_CAPITAL = 2;

export type FactionActionName =
  | 'place_treasury'
  | 'purchase_deed'
  | 'play_the_market'
  | 'hostile_takeover'
  | 'start_mission'
  | 'complete_mission'
  | 'abort_mission'
  | 'start_special_operation'
  | 'complete_special_operation'
  | 'begin_rite'
  | 'begin_ritual'
  | 'purge';

const FACTION_ACTION_PHASES: Record<FactionActionName, readonly ActionPhase[]> = {
  place_treasury: ['denouement'],
  purchase_deed: ['denouement'],
  play_the_market: ['denouement'],
  hostile_takeover: ['denouement'],
  start_mission: ['denouement'],
  complete_mission: ['denouement'],
  abort_mission: ['denouement'],
  start_special_operation: ['denouement'],
  complete_special_operation: ['denouement'],
  begin_rite: ['denouement'],
  begin_ritual: ['denouement'],
  purge: ['opening', 'denouement'],
};

export function canUseFactionAction(action: FactionActionName, phase: ActionPhase): boolean {
  return FACTION_ACTION_PHASES[action].includes(phase);
}

export interface FinancialCapacityEvaluation {
  evaluated: true;
  active: boolean;
  additionalActions: 0 | 1;
  requiresFinancierFactionAction: boolean;
}

export function evaluateFinancialCapacity(input: {
  timing: 'after_capture_effects_before_draw' | 'other';
  treasuryValue: number;
  territoriesControlled: number;
}): FinancialCapacityEvaluation {
  if (input.timing !== 'after_capture_effects_before_draw') {
    throw new Error('Financial Capacity is determined after Capture effects and before Draw.');
  }
  const active = input.treasuryValue > input.territoriesControlled;
  return {
    evaluated: true,
    active,
    additionalActions: active ? 1 : 0,
    requiresFinancierFactionAction: active,
  };
}

export interface FinancialCapacityTurn {
  active: boolean;
  actionsTaken: Record<ActionPhase, 'none' | 'general' | 'financier_faction'>;
}

export function createFinancialCapacityTurn(active: boolean): FinancialCapacityTurn {
  return { active, actionsTaken: { opening: 'none', denouement: 'none' } };
}

export function recordFinancialCapacityAction(
  state: FinancialCapacityTurn,
  phase: ActionPhase,
  kind: 'general' | 'financier_faction',
): FinancialCapacityTurn {
  if (state.actionsTaken[phase] !== 'none') throw new Error(`Only one Action may be taken during ${phase}.`);
  const priorActions = Object.values(state.actionsTaken).filter((value) => value !== 'none').length;
  const actionLimit = state.active ? 2 : 1;
  if (priorActions >= actionLimit) throw new Error('No Action remains this turn.');
  if (kind === 'financier_faction' && phase !== 'denouement') {
    throw new Error('Financier Faction Actions are normally legal only during Denouement.');
  }
  return { ...state, actionsTaken: { ...state.actionsTaken, [phase]: kind } };
}

export function financialCapacityRequirementSatisfied(state: FinancialCapacityTurn): boolean {
  if (!state.active) return true;
  const actions = Object.values(state.actionsTaken).filter((value) => value !== 'none');
  if (actions.length < 2) return true;
  return actions.includes('financier_faction');
}

/** Guardians requires value at least 1 + the number of completed Rites. */
export function guardiansRequiredValue(completedRites: number): number {
  if (!Number.isInteger(completedRites) || completedRites < 0 || completedRites > 3) {
    throw new Error('Completed Rite count must be an integer from 0 through 3.');
  }
  return completedRites + 1;
}

export function canPreventMysticInterruption(completedRites: number, sacrificedArcaneValue: number): boolean {
  return sacrificedArcaneValue >= guardiansRequiredValue(completedRites);
}

export interface PurgeTurnState {
  purgeFactionActionUsed: boolean;
  twoPhasePermissionActive: boolean;
  finalJudgmentUsed: boolean;
}

export function createPurgeTurnState(): PurgeTurnState {
  return { purgeFactionActionUsed: false, twoPhasePermissionActive: false, finalJudgmentUsed: false };
}

export function usePurgeFactionAction(state: PurgeTurnState, phase: ActionPhase): PurgeTurnState {
  if (!canUseFactionAction('purge', phase)) throw new Error('Purge is legal only during Opening or Denouement.');
  if (state.purgeFactionActionUsed) throw new Error('The Purge Faction Action may be taken only once per turn.');
  return { ...state, purgeFactionActionUsed: true, twoPhasePermissionActive: true };
}

export function useFinalJudgmentPurge(
  state: PurgeTurnState,
  input: { duringAftermathOfWonBattle: boolean; battleCardsClearedAndMoveTriggersApplied: boolean },
): { state: PurgeTurnState; consumesAction: false; activatesTwoPhasePermission: false; convictionCostReduction: 1 } {
  if (!input.duringAftermathOfWonBattle || !input.battleCardsClearedAndMoveTriggersApplied) {
    throw new Error('Final Judgment occurs after battle cards are cleared in a won battle’s Aftermath.');
  }
  if (state.finalJudgmentUsed) throw new Error('Final Judgment may be used only once per turn.');
  return {
    state: { ...state, finalJudgmentUsed: true },
    consumesAction: false,
    activatesTwoPhasePermission: false,
    convictionCostReduction: 1,
  };
}
