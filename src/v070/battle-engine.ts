import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './battle-engine-pre-capital-gains';
import {
  pendingV070CapitalGainsAftermath,
  resolveV070CapitalGainsAftermathChoice,
} from './capital-gains-battle';

export * from './battle-engine-pre-capital-gains';

export type V070BattleAction =
  | previous.V070BattleAction
  | {
      type: 'resolve_capital_gains_aftermath';
      playerId: PlayerId;
      targetInstanceId: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070CapitalGainsAftermath(state);
  if (pending) {
    if (action.type !== 'resolve_capital_gains_aftermath') {
      throw new V070GameActionError(
        'Choose the card Capital Gains places in Treasury before continuing the Aftermath.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const resolvedOwner = resolveV070CapitalGainsAftermathChoice(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    return resumeAfterCapitalGains(next, resolvedOwner);
  }

  if (action.type === 'resolve_capital_gains_aftermath') {
    throw new V070GameActionError(
      'There is no pending Capital Gains Aftermath choice.',
    );
  }

  return previous.reduceV070BattleAction(state, action);
}

function resumeAfterCapitalGains(
  state: V070GameState,
  resolvedOwner: PlayerId,
): V070GameState {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return state;

  runtime.battleAftermathControlledEffectNextPlayer =
    resolvedOwner === battle.attacker
      ? battle.defender
      : battle.attacker;

  return previous.reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}
