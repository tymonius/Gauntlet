import type { V070GameState } from './engine';
import {
  reduceV070BattleAction as reduceV070BattleActionPreWarBonds,
  type V070BattleAction,
} from './battle-engine-prewar-bonds';
import { openV070WarBondsAfterFirstBattle } from './war-bonds';

export * from './battle-engine-prewar-bonds';

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const battleOrder = state.battle
    ? [state.battle.attacker, state.battle.defender] as const
    : null;
  const next = reduceV070BattleActionPreWarBonds(state, action);
  if (!next.battle) {
    openV070WarBondsAfterFirstBattle(
      next,
      battleOrder ?? undefined,
    );
  }
  return next;
}
