import type { ActionPhase } from './rules';

export const FINANCIER_STARTING_CAPITAL = 2;

export type FactionId =
  | 'military'
  | 'diplomats'
  | 'financiers'
  | 'intelligence'
  | 'mystics'
  | 'inquisition';

export type FactionActionName =
  | 'place_treasury'
  | 'purchase_deed'
  | 'play_the_market'
  | 'hostile_takeover'
  | 'intelligence_operation'
  | 'begin_rite'
  | 'purge';

const FACTION_ACTION_PHASES: Record<FactionActionName, readonly ActionPhase[]> = {
  place_treasury: ['denouement'],
  purchase_deed: ['denouement'],
  play_the_market: ['denouement'],
  hostile_takeover: ['denouement'],
  intelligence_operation: ['denouement'],
  begin_rite: ['denouement'],
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
  timing: 'after_capture_before_draw' | 'other';
  treasuryValue: number;
  territoriesControlled: number;
}): FinancialCapacityEvaluation {
  if (input.timing !== 'after_capture_before_draw') {
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
  return {
    active,
    actionsTaken: {
      opening: 'none',
      denouement: 'none',
    },
  };
}

export function recordFinancialCapacityAction(
  state: FinancialCapacityTurn,
  phase: ActionPhase,
  kind: 'general' | 'financier_faction',
): FinancialCapacityTurn {
  if (state.actionsTaken[phase] !== 'none') {
    throw new Error(`Only one Action may be taken during ${phase}.`);
  }
  const priorActions = Object.values(state.actionsTaken).filter((value) => value !== 'none').length;
  const actionLimit = state.active ? 2 : 1;
  if (priorActions >= actionLimit) throw new Error('No Action remains this turn.');
  if (kind === 'financier_faction' && phase !== 'denouement') {
    throw new Error('Financier Faction Actions are normally legal only during Denouement.');
  }
  return {
    ...state,
    actionsTaken: {
      ...state.actionsTaken,
      [phase]: kind,
    },
  };
}

export function financialCapacityRequirementSatisfied(state: FinancialCapacityTurn): boolean {
  if (!state.active) return true;
  const actions = Object.values(state.actionsTaken).filter((value) => value !== 'none');
  if (actions.length < 2) return true;
  return actions.includes('financier_faction');
}

export type MysticProgress = 'first_rite' | 'second_rite' | 'third_rite' | 'ritual';

export const GUARDIANS_PROTECTION_VALUES: Readonly<Record<MysticProgress, number>> = Object.freeze({
  first_rite: 1,
  second_rite: 2,
  third_rite: 3,
  ritual: 4,
});

export function canGuardCurrentProgress(progress: MysticProgress, sacrificedArcaneValue: number): boolean {
  return sacrificedArcaneValue >= GUARDIANS_PROTECTION_VALUES[progress];
}

export interface PurgeTurnState {
  purgeFactionActionUsed: boolean;
  finalJudgmentUsed: boolean;
}

export function createPurgeTurnState(): PurgeTurnState {
  return {
    purgeFactionActionUsed: false,
    finalJudgmentUsed: false,
  };
}

export function usePurgeFactionAction(
  state: PurgeTurnState,
  phase: ActionPhase,
): PurgeTurnState {
  if (!canUseFactionAction('purge', phase)) {
    throw new Error('Purge is legal only during Opening or Denouement.');
  }
  if (state.purgeFactionActionUsed) {
    throw new Error('The Purge Faction Action may normally be taken only once per turn.');
  }
  return {
    ...state,
    purgeFactionActionUsed: true,
  };
}

export function useFinalJudgmentPurge(
  state: PurgeTurnState,
  input: { duringAftermathOfWonBattle: boolean; battleCardsCleared: boolean },
): { state: PurgeTurnState; consumesAction: false; convictionCostReduction: 1 } {
  if (!input.duringAftermathOfWonBattle || !input.battleCardsCleared) {
    throw new Error('Final Judgment Purge occurs after battle cards are cleared in a won battle’s Aftermath.');
  }
  if (state.finalJudgmentUsed) throw new Error('Final Judgment may be used only once per turn.');
  return {
    state: {
      ...state,
      finalJudgmentUsed: true,
    },
    consumesAction: false,
    convictionCostReduction: 1,
  };
}
