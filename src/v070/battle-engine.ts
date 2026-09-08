import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070BattleAction as reduceV070BattleActionPreAccusation,
  type V070BattleAction as V070PreAccusationBattleAction,
} from './battle-engine-pre-accusation';
import {
  openNextV070AccusationAftermathChoice,
  pendingV070AccusationAftermath,
  resolveV070AccusationDestination,
  resolveV070AccusationTarget,
} from './accusation-battle';

export * from './battle-engine-pre-accusation';

export type V070BattleAction =
  | V070PreAccusationBattleAction
  | {
      type: 'resolve_accusation_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_accusation_destination';
      playerId: PlayerId;
      destination: 'draw_top' | 'graveyard';
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070AccusationAftermath(state);
  if (pending) {
    if (pending.stage === 'target') {
      if (action.type !== 'resolve_accusation_target') {
        throw new V070GameActionError(
          'Resolve the pending Accusation Discard Pile target before continuing the Aftermath.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      resolveV070AccusationTarget(
        next,
        action.playerId,
        action.targetInstanceId,
      );
      return next;
    }

    if (action.type !== 'resolve_accusation_destination') {
      throw new V070GameActionError(
        'Resolve the pending Accusation destination before continuing the Aftermath.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070AccusationDestination(
      next,
      action.playerId,
      action.destination,
    );
    if (openNextV070AccusationAftermathChoice(next)) return next;

    const battle = next.battle;
    if (!battle) return next;
    return reduceV070BattleActionPreAccusation(next, {
      type: 'complete_aftermath',
      playerId: battle.attacker,
    });
  }

  if (action.type === 'resolve_accusation_target') {
    throw new V070GameActionError(
      'There is no pending Accusation target choice.',
    );
  }
  if (action.type === 'resolve_accusation_destination') {
    throw new V070GameActionError(
      'There is no pending Accusation destination choice.',
    );
  }

  // Accusation resolves while the opponent's Discard Pile and committed
  // battle cards still exist. Resume the established Aftermath pipeline only
  // after every registered Accusation has resolved as far as able.
  if (action.type === 'complete_aftermath') {
    const staged = structuredClone(state) as V070GameState;
    if (openNextV070AccusationAftermathChoice(staged)) return staged;
    return reduceV070BattleActionPreAccusation(
      staged,
      action as V070PreAccusationBattleAction,
    );
  }

  return reduceV070BattleActionPreAccusation(
    state,
    action as V070PreAccusationBattleAction,
  );
}
