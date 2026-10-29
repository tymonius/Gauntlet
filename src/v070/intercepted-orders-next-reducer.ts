import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import {
  reduceV070BattleAction,
  type V070BattleAction,
} from './battle-engine';
import {
  pendingInterceptedOrdersChoice,
  reduceStagedInterceptedOrdersRevealAction,
  type InterceptedOrdersBattleAction,
} from './intercepted-orders-battle-choices';

/**
 * Next-release migration facade, intentionally NOT imported by the published
 * v0.7.0/v0.7.2 battle reducer. Keeps the frozen digital-behavior authority
 * inventory stable until a governed release promotes the new card text.
 */
export type NextReleaseBattleAction =
  | V070BattleAction
  | InterceptedOrdersBattleAction;

export function reduceNextReleaseBattleAction(
  state: V070GameState,
  action: NextReleaseBattleAction,
): V070GameState {
  if (pendingInterceptedOrdersChoice(state)) {
    if (action.type !== 'resolve_intercepted_orders_target'
      && action.type !== 'resolve_intercepted_orders_replacement') {
      throw new V070GameActionError(
        'Resolve the pending Intercepted Orders battle choice first.',
      );
    }
    return reduceStagedInterceptedOrdersRevealAction(state, action);
  }
  if (action.type === 'resolve_intercepted_orders_target'
    || action.type === 'resolve_intercepted_orders_replacement') {
    throw new V070GameActionError('No Intercepted Orders choice is pending.');
  }

  // All released battle actions retain their original reducer behavior.
  return reduceV070BattleAction(state, action);
}
