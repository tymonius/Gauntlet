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
  resolveV070ActOfFaithGraveyardChoice,
  resolveV070ActOfFaithRevealCount,
} from './act-of-faith-battle';
import {
  V070_BROTHERS_IN_ARMS_ID,
  openV070BrothersInArmsAdditionalTacticChoice,
  pendingV070BrothersInArmsAdditionalTactic,
  resolveV070BrothersInArmsAdditionalTacticChoice,
} from './brothers-in-arms-battle';
import { V070DeferredBattleAftermathPause } from './battle-aftermath';

export * from './battle-engine-pre-accusation';

export type V070BattleAction =
  | V070BaseBattleAction
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
      type: 'resolve_act_of_faith_reveal_count';
      playerId: PlayerId;
      revealCount: number;
    }
  | {
      type: 'resolve_act_of_faith_graveyard';
      playerId: PlayerId;
      graveyardInstanceId: string;
    }
  | {
      type: 'resolve_brothers_in_arms_additional_tactic';
      playerId: PlayerId;
      cardInstanceId?: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const brothersInArms = pendingV070BrothersInArmsAdditionalTactic(state);
  if (brothersInArms) {
    if (action.type !== 'resolve_brothers_in_arms_additional_tactic') {
      throw new V070GameActionError(
        'Resolve or decline the pending Brothers in Arms additional Tactic before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070BrothersInArmsAdditionalTacticChoice(
      next,
      action.playerId,
      action.cardInstanceId,
    );
    return next;
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
    const resolvedOwner = resolveV070AccusationDestination(
      next,
      action.playerId,
      action.destination,
    );
    return resumeAfterDeferredEffect(next, resolvedOwner);
  }

  const actOfFaith = pendingV070ActOfFaithAftermath(state);
  if (actOfFaith) {
    if (actOfFaith.stage === 'reveal_count') {
      if (action.type !== 'resolve_act_of_faith_reveal_count') {
        throw new V070GameActionError(
          'Choose how many cards Act of Faith reveals before continuing the Aftermath.',
        );
      }
      const next = structuredClone(state) as V070GameState;
      const resolvedOwner = resolveV070ActOfFaithRevealCount(
        next,
        action.playerId,
        action.revealCount,
      );
      return resolvedOwner
        ? resumeAfterDeferredEffect(next, resolvedOwner)
        : next;
    }

    if (action.type !== 'resolve_act_of_faith_graveyard') {
      throw new V070GameActionError(
        'Choose which card revealed by Act of Faith enters the Graveyard before continuing the Aftermath.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const resolvedOwner = resolveV070ActOfFaithGraveyardChoice(
      next,
      action.playerId,
      action.graveyardInstanceId,
    );
    return resumeAfterDeferredEffect(next, resolvedOwner);
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
  if (action.type === 'resolve_act_of_faith_reveal_count') {
    throw new V070GameActionError(
      'There is no pending Act of Faith reveal-count choice.',
    );
  }
  if (action.type === 'resolve_act_of_faith_graveyard') {
    throw new V070GameActionError(
      'There is no pending Act of Faith Graveyard choice.',
    );
  }
  if (action.type === 'resolve_brothers_in_arms_additional_tactic') {
    throw new V070GameActionError(
      'There is no pending Brothers in Arms additional Tactic choice.',
    );
  }

  const next = reduceBaseWithDeferredPause(
    state,
    action as V070BaseBattleAction,
  );

  if (action.type === 'choose_tactic'
    && action.cardInstanceId
    && next.cardInstances[action.cardInstanceId]?.cardId ===
      V070_BROTHERS_IN_ARMS_ID) {
    openV070BrothersInArmsAdditionalTacticChoice(
      next,
      action.playerId,
      action.cardInstanceId,
    );
  }

  return next;
}

function reduceBaseWithDeferredPause(
  state: V070GameState,
  action: V070BaseBattleAction,
): V070GameState {
  try {
    return reduceV070BattleActionBase(state, action);
  } catch (error) {
    if (!(error instanceof V070DeferredBattleAftermathPause)) throw error;
    if (error.choicePending) return error.state;
    return resumeAfterDeferredEffect(error.state, error.owner);
  }
}

function resumeAfterDeferredEffect(
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

  return reduceBaseWithDeferredPause(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}
