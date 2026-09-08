import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070BattleAction as reduceV070BattleActionBase,
  type V070BattleAction as V070BaseBattleAction,
} from './battle-engine-pre-accusation';
import {
  pendingV070AccusationAftermath,
  resolveV070AccusationDestination,
  resolveV070AccusationTarget,
} from './accusation-battle';
import {
  pendingV070ActOfFaithAftermath,
  resolveV070ActOfFaithAftermath,
} from './act-of-faith-battle';
import {
  continueV070DeferredAftermathAfterResolution,
  openNextV070DeferredAftermathEffect,
  pendingV070DeferredAftermathOrder,
  resolveV070DeferredAftermathOrder,
  type V070DeferredAftermathEffectKind,
} from './battle-aftermath';

export * from './battle-engine-pre-accusation';

export type V070BattleAction =
  | V070BaseBattleAction
  | {
      type: 'resolve_battle_aftermath_effect_order';
      playerId: PlayerId;
      effectKind: V070DeferredAftermathEffectKind;
    }
  | {
      type: 'resolve_accusation_target';
      playerId: PlayerId;
      targetInstanceId: string;
    }
  | {
      type: 'resolve_accusation_destination';
      playerId: PlayerId;
      destination: 'draw_top' | 'graveyard';
    }
  | {
      type: 'resolve_act_of_faith_aftermath';
      playerId: PlayerId;
      graveyardInstanceId: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const order = pendingV070DeferredAftermathOrder(state);
  if (order) {
    if (action.type !== 'resolve_battle_aftermath_effect_order') {
      throw new V070GameActionError(
        'Resolve the pending battle Aftermath effect order before continuing.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    if (resolveV070DeferredAftermathOrder(
      next,
      action.playerId,
      action.effectKind,
    )) {
      return next;
    }
    return resumeEstablishedAftermath(next);
  }

  const accusation = pendingV070AccusationAftermath(state);
  if (accusation) {
    if (accusation.stage === 'target') {
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
    const resolvedOwner = accusation.owner;
    resolveV070AccusationDestination(
      next,
      action.playerId,
      action.destination,
    );
    if (continueV070DeferredAftermathAfterResolution(
      next,
      resolvedOwner,
    )) {
      return next;
    }
    return resumeEstablishedAftermath(next);
  }

  const actOfFaith = pendingV070ActOfFaithAftermath(state);
  if (actOfFaith) {
    if (action.type !== 'resolve_act_of_faith_aftermath') {
      throw new V070GameActionError(
        'Resolve the pending Act of Faith choice before continuing the Aftermath.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const resolvedOwner = resolveV070ActOfFaithAftermath(
      next,
      action.playerId,
      action.graveyardInstanceId,
    );
    if (continueV070DeferredAftermathAfterResolution(
      next,
      resolvedOwner,
    )) {
      return next;
    }
    return resumeEstablishedAftermath(next);
  }

  if (action.type === 'resolve_battle_aftermath_effect_order') {
    throw new V070GameActionError(
      'There is no pending battle Aftermath effect-order choice.',
    );
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
  if (action.type === 'resolve_act_of_faith_aftermath') {
    throw new V070GameActionError(
      'There is no pending Act of Faith Aftermath choice.',
    );
  }

  // Deferred battle-card effects resolve while the relevant public zones and
  // committed battle cards still exist. Resume the established Aftermath
  // pipeline only after shared-timing ordering has exhausted this layer.
  if (action.type === 'complete_aftermath') {
    const staged = structuredClone(state) as V070GameState;
    if (openNextV070DeferredAftermathEffect(staged)) return staged;
    return reduceV070BattleActionBase(
      staged,
      action as V070BaseBattleAction,
    );
  }

  return reduceV070BattleActionBase(
    state,
    action as V070BaseBattleAction,
  );
}

function resumeEstablishedAftermath(state: V070GameState): V070GameState {
  const battle = state.battle;
  if (!battle) return state;
  return reduceV070BattleActionBase(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}
