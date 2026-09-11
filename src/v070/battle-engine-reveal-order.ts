import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './battle-engine-reveal-order-pre-witchcraft';
import {
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { resolveV070WitchcraftBattleChoice } from './witchcraft-battle';

export * from './battle-engine-reveal-order-pre-witchcraft';

export type V070BattleAction =
  | previous.V070BattleAction
  | {
      type: 'resolve_witchcraft_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind === 'witchcraft' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_witchcraft_battle') {
      throw new V070GameActionError(
        'Choose the battle effect Witchcraft repeats before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070WitchcraftBattleChoice(
      next,
      action.playerId,
      action.targetInstanceId,
    );

    // This facade owns only Witchcraft's custom chooser. The enclosing battle
    // facade resumes the shared reveal scheduler and opens any downstream
    // choice produced by the repeated effect, preserving the mature base
    // continuation path for Reembodiment, Subversion, and other pauses.
    return next;
  }

  if (action.type === 'resolve_witchcraft_battle') {
    throw new V070GameActionError('There is no open Witchcraft battle-effect choice.');
  }

  return previous.reduceV070BattleAction(
    state,
    action as previous.V070BattleAction,
  );
}
