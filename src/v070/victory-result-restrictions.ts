import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export type V070VictoryResultBenefit =
  | 'movement'
  | 'capture'
  | 'order';

export interface V070VictoryResultRestriction {
  noMovement: boolean;
  noCapture: boolean;
  noOrders: boolean;
  sourceInstanceIds: string[];
}

export interface V070VictoryResultBenefitsUsed {
  movement: boolean;
  capture: boolean;
  order: boolean;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    victoryResultRestrictions?: Partial<
      Record<PlayerId, V070VictoryResultRestriction>
    >;
    victoryResultBenefitsUsed?: Partial<
      Record<PlayerId, V070VictoryResultBenefitsUsed>
    >;
  }
}

function usedRecord(
  state: V070GameState,
  playerId: PlayerId,
): V070VictoryResultBenefitsUsed {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Victory-result benefit tracking requires an active battle.',
    );
  }
  runtime.victoryResultBenefitsUsed ??= {};
  return runtime.victoryResultBenefitsUsed[playerId] ??= {
    movement: false,
    capture: false,
    order: false,
  };
}

export function recordV070VictoryResultBenefit(
  state: V070GameState,
  playerId: PlayerId,
  benefit: V070VictoryResultBenefit,
): void {
  usedRecord(state, playerId)[benefit] = true;
}

export function v070VictoryResultBenefitWasUsed(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const used =
    state.battleRuntime?.victoryResultBenefitsUsed?.[playerId];
  return Boolean(
    used?.movement
    || used?.capture
    || used?.order,
  );
}

export function imposeV070VictoryResultRestrictions(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
  restrictions: {
    noMovement?: boolean;
    noCapture?: boolean;
    noOrders?: boolean;
  },
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Victory-result restrictions require an active battle.',
    );
  }
  runtime.victoryResultRestrictions ??= {};
  const current = runtime.victoryResultRestrictions[playerId] ?? {
    noMovement: false,
    noCapture: false,
    noOrders: false,
    sourceInstanceIds: [],
  };
  current.noMovement ||= Boolean(restrictions.noMovement);
  current.noCapture ||= Boolean(restrictions.noCapture);
  current.noOrders ||= Boolean(restrictions.noOrders);
  if (!current.sourceInstanceIds.includes(sourceInstanceId)) {
    current.sourceInstanceIds.push(sourceInstanceId);
  }
  runtime.victoryResultRestrictions[playerId] = current;
}

export function v070VictoryResultBenefitProhibited(
  state: V070GameState,
  playerId: PlayerId,
  benefit: V070VictoryResultBenefit,
): boolean {
  const restriction =
    state.battleRuntime?.victoryResultRestrictions?.[playerId];
  if (!restriction) return false;
  if (benefit === 'movement') return restriction.noMovement;
  if (benefit === 'capture') return restriction.noCapture;
  return restriction.noOrders;
}

export function assertV070VictoryResultBenefitAllowed(
  state: V070GameState,
  playerId: PlayerId,
  benefit: V070VictoryResultBenefit,
  label: string,
): void {
  if (!v070VictoryResultBenefitProhibited(
    state,
    playerId,
    benefit,
  )) {
    return;
  }
  throw new V070GameActionError(
    `${label} is prohibited as a result of this victory.`,
  );
}
