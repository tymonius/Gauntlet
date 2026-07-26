import type { GameState } from '../types';
import type {
  AppStateAction,
  FinishMovementAction,
  ResolveNeutralChoiceAction,
} from './actions';
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
import {
  applyNewRecruitsAction,
  applyNewRecruitsBattleEffects,
  NEW_RECRUITS,
  prepareNewRecruitsAction,
} from './neutral-new-recruits';
import {
  applyPathfindersAction,
  applyPathfindersBattleEffects,
  PATHFINDERS,
  preparePathfindersAction,
} from './neutral-pathfinders';
import {
  applyRallyingCryAction,
  applyRallyingCryBattleEffects,
  prepareRallyingCryAction,
  RALLYING_CRY,
} from './neutral-rallying-cry';
import {
  applyRedemptionBattleReturns,
  captureDiscardSnapshot,
  openNextRedemptionChoice,
  prepareRedemptionBattleResolution,
  redemptionEffectSourcePlayer,
  registerRedemptionDiscardEntries,
  resolveRedemptionChoice,
} from './neutral-redemption';
import {
  applyReservesAction,
  applyReservesBattleTopdecks,
  prepareReservesAction,
  prepareReservesBattleResolution,
  RESERVES,
  resolveReservesChoice,
} from './neutral-reserves';
import { type ApplyGameActionResult, GameActionError } from './reducer';
import {
  clearExpiredPathfindersSuppressions,
  territoryPrintedEffectIsActive,
} from './territory-printed-effects';

export type NeutralAppStateAction = AppStateAction | FinishMovementAction | ResolveNeutralChoiceAction;

/**
 * Outermost card-integration layer for canonical Neutral cards. Neutral effects
 * apply to every faction and therefore sit above the faction-specific stack.
 */
export function applyGameAction(game: GameState, action: NeutralAppStateAction): ApplyGameActionResult {
  if (game.pendingNeutralChoice) {
    if (action.type !== 'resolve_neutral_choice') {
      throw new GameActionError('Resolve the pending Neutral choice first.');
    }
    const next = structuredClone(game);
    const resolved = game.pendingNeutralChoice.kind.startsWith('reserves_')
      ? resolveReservesChoice(next, action)
      : resolveRedemptionChoice(next, action);
    if (resolved.deferredBattleAction) {
      return applyGameAction(next, resolved.deferredBattleAction);
    }
    return { state: next };
  }
  if (action.type === 'resolve_neutral_choice') {
    throw new GameActionError(`${action.playerId} has no pending Neutral choice.`);
  }

  if (action.type === 'finish_movement') {
    const next = structuredClone(game);
    finishRemainingMovement(next, action.playerId);
    return { state: next };
  }

  const effectSourcePlayerId = redemptionEffectSourcePlayer(game, action);
  const discardBefore = effectSourcePlayerId ? captureDiscardSnapshot(game) : undefined;
  const priorBattleId = game.battle?.id;

  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    requireForcedMarchActionTiming(game, action.playerId);
  }
  const preparedNewRecruits = action.type === 'play_action_card' && action.cardId === NEW_RECRUITS
    ? prepareNewRecruitsAction(game, action)
    : undefined;
  const preparedPathfinders = action.type === 'play_action_card' && action.cardId === PATHFINDERS
    ? preparePathfindersAction(game, action)
    : undefined;
  const preparedRallyingCry = action.type === 'play_action_card' && action.cardId === RALLYING_CRY
    ? prepareRallyingCryAction(game, action)
    : undefined;
  const preparedReserves = action.type === 'play_action_card' && action.cardId === RESERVES
    ? prepareReservesAction(game, action)
    : undefined;

  const restrictedBefore = action.type === 'move_player'
    ? game.players[action.playerId]?.nonBattleMovementRemaining ?? 0
    : 0;
  const initiatedBattle = action.type === 'move_player'
    ? forcedMarchMoveWouldInitiateBattle(game, action.playerId, action.toSpaceId)
    : false;
  if (action.type === 'move_player') {
    requireBattleCapableMovement(game, action.playerId, action.toSpaceId);
  }

  let gameForApplication = game;
  if (action.type === 'resolve_battle') {
    const prepared = structuredClone(game);
    if (prepareRedemptionBattleResolution(prepared, action)) {
      return { state: prepared };
    }
    if (prepareReservesBattleResolution(prepared, action)) {
      return { state: prepared };
    }
    gameForApplication = prepared;
  }

  const result = applyFactionGameAction(gameForApplication, action);

  if (action.type === 'play_action_card' && action.cardId === FORCED_MARCH) {
    applyForcedMarchAction(result.state, action.playerId);
  }
  if (action.type === 'play_action_card' && preparedNewRecruits) {
    const drawnCards = applyNewRecruitsAction(result.state, action.playerId, preparedNewRecruits);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedPathfinders) {
    applyPathfindersAction(result.state, action.playerId, preparedPathfinders);
  }
  if (action.type === 'play_action_card' && preparedRallyingCry) {
    const drawnCards = applyRallyingCryAction(result.state, action.playerId, preparedRallyingCry);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'play_action_card' && preparedReserves) {
    const drawnCards = applyReservesAction(result.state, action.playerId, preparedReserves);
    result.result = { ...(result.result ?? {}), drawnCards };
  }
  if (action.type === 'move_player') {
    const battle = result.state.battle;
    if (battle?.attackerHandCommitVisibleTo) {
      const destination = result.state.board.spaces.find((space) => space.id === action.toSpaceId);
      if (!territoryPrintedEffectIsActive(result.state, destination, action.playerId)) {
        battle.attackerHandCommitVisibleTo = undefined;
      }
    }
    reconcileForcedMarchMove(result.state, action.playerId, initiatedBattle, restrictedBefore);
  }
  if (action.type === 'end_turn') {
    clearRestrictedMovementForTurnTransition(result.state, action.playerId);
    clearExpiredPathfindersSuppressions(result.state);
  }
  if (action.type === 'resolve_asset_bank_discard') {
    applyContingencyPlanAssetLimitDraw(result.state, action.playerId, action.cardIds);
  }
  if (action.type === 'resolve_battle_reveal') {
    applyFealtyBattleEffects(result.state);
    applyForcedMarchBattleEffects(result.state);
    applyNewRecruitsBattleEffects(result.state);
    applyPathfindersBattleEffects(result.state);
    applyRallyingCryBattleEffects(result.state);
  }
  if (action.type === 'resolve_battle' && priorBattleId && !result.state.battle) {
    applyRedemptionBattleReturns(result.state, priorBattleId);
    applyReservesBattleTopdecks(result.state, priorBattleId);
  }

  if (discardBefore) {
    registerRedemptionDiscardEntries(result.state, discardBefore, effectSourcePlayerId);
  }
  openNextRedemptionChoice(result.state);
  return result;
}
