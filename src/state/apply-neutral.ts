import type { GameState } from '../types';
import type { AppStateAction, FinishMovementAction } from './actions';
import { applyGameAction as applyFactionGameAction } from './apply-inquisition';
import { applyContingencyPlanAssetLimitDraw } from './neutral-contingency-plan';
import { applyFealtyBattleEffects } from './neutral-fealty';
import {
  applyForcedMarchAction,
  applyForcedMarchBattleEffects,
  clearRestrictedMovementForTurnTransition,
  finishRemainingMovement,
  FORCED_MARCH,
  forcedMarchMoveWouldInitiateBattle,
  reconcileForcedMarchMove,
  requireBattleCapableMovement,
  requireForcedMarchActionTiming,
} from './neutral-forced-march';
import { type ApplyGameActionResult } from './reducer';

export type NeutralAppStateAction = AppStateAction | FinishMovementAction;

/**
 * Outermost card-integration layer for canonical Neutral cards. Neutral effects
 * apply to every faction and therefore sit above the faction-specific stack.
 */
export function applyGameAction(game: GameState, action: NeutralAppStateAction): ApplyGameActionResult {
  if (action.type === 'finish_movement') {
    const next = structuredClone(game);
    finishRemainingMovement(next, action.playerId);
    return { state: next };
  }

  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    requireForcedMarchActionTiming(game, action.playerId);
  }

  const restrictedBefore = action.type === 'move_player'
    ? game.players[action.playerId]?.nonBattleMovementRemaining ?? 0
    : 0;
  const initiatedBattle = action.type === 'move_player'
    ? forcedMarchMoveWouldInitiateBattle(game, action.playerId, action.toSpaceId)
    : false;
  if (action.type === 'move_player') {
    requireBattleCapableMovement(game, action.playerId, action.toSpaceId);
  }

  const result = applyFactionGameAction(game, action);

  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    applyForcedMarchAction(result.state, action.playerId);
  }
  if (action.type === 'move_player') {
    reconcileForcedMarchMove(result.state, action.playerId, initiatedBattle, restrictedBefore);
  }
  if (action.type === 'end_turn') {
    clearRestrictedMovementForTurnTransition(result.state, action.playerId);
  }
  if (action.type === 'resolve_asset_bank_discard') {
    applyContingencyPlanAssetLimitDraw(result.state, action.playerId, action.cardIds);
  }
  if (action.type === 'resolve_battle_reveal') {
    applyFealtyBattleEffects(result.state);
    applyForcedMarchBattleEffects(result.state);
  }

  return result;
}
