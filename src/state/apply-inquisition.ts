import type { BattleState, GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyMysticsGameAction } from './apply-mystics';
import {
  applyAccusationAction,
  isAccusationChoice,
  openNextAccusationChoice,
  queueAccusationBattleEffects,
  requireAccusationActionTarget,
  resolveAccusationChoice,
} from './inquisition-accusation';
import {
  actionArcaneUse,
  applyCondemnationAfterBattle,
  awardBlasphemyForActionUse,
  awardBlasphemyForRevealedBattleCards,
  awardNormalConvictionAfterBattle,
  captureInquisitionGraveyards,
  evaluatePurificationAfterNormalDraw,
} from './inquisition-core';
import {
  applyPenanceAction,
  isPenanceChoice,
  openNextPenanceChoice,
  queuePenanceBattleEffects,
  resolvePenanceChoice,
} from './inquisition-penance';
import { resolveInquisitionChoice as resolveInquisitionPurgeChoice, useInquisitionPurge } from './inquisition-purge';
import {
  captureGraveyardSnapshot,
  openNextGraveWardChoice,
  registerGraveyardEntries,
} from './mystics-grave-ward';
import { reconcileBlackCovenantBindings } from './mystics-black-covenant';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

function battleSnapshot(game: GameState): BattleState | undefined {
  return game.battle ? structuredClone(game.battle) : undefined;
}

function continueInquisitionAutomation(result: ApplyGameActionResult): ApplyGameActionResult {
  queuePenanceBattleEffects(result.state);
  openNextPenanceChoice(result.state);
  openNextAccusationChoice(result.state);
  return result;
}

function finishDirectInquisitionAction(
  game: GameState,
  mysticGraveyardsBefore: ReturnType<typeof captureGraveyardSnapshot>,
): ApplyGameActionResult {
  reconcileBlackCovenantBindings(game);
  registerGraveyardEntries(game, mysticGraveyardsBefore);
  openNextGraveWardChoice(game);
  runPostActionAutomationPipeline(game);
  return continueInquisitionAutomation({ state: game });
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  const priorBattle = battleSnapshot(game);
  const graveyardsBefore = captureInquisitionGraveyards(game);
  const mysticGraveyardsBefore = captureGraveyardSnapshot(game);
  const arcaneActionUse = actionArcaneUse(game, action);
  const normalDraw = action.type === 'draw_card' && game.phase === 'turn_start';

  if (game.pendingInquisitionChoice) {
    if (action.type !== 'resolve_inquisition_choice') {
      throw new GameActionError('Resolve the pending Inquisition choice first.');
    }
    const next = structuredClone(game);
    const pendingKind = next.pendingInquisitionChoice?.kind;
    if (isAccusationChoice(pendingKind)) resolveAccusationChoice(next, action);
    else if (isPenanceChoice(pendingKind)) resolvePenanceChoice(next, action);
    else resolveInquisitionPurgeChoice(next, action);
    return finishDirectInquisitionAction(next, mysticGraveyardsBefore);
  }
  if (action.type === 'resolve_inquisition_choice') {
    throw new GameActionError(`${action.playerId} has no pending Inquisition choice.`);
  }

  const accusationTarget = action.type === 'play_action_card'
    ? requireAccusationActionTarget(game, action.playerId, action.cardId, action.targets)
    : undefined;

  let result: ApplyGameActionResult;
  if (action.type === 'use_inquisition_purge') {
    const next = structuredClone(game);
    useInquisitionPurge(next, action);
    result = finishDirectInquisitionAction(next, mysticGraveyardsBefore);
  } else {
    result = applyMysticsGameAction(game, action);
  }

  if (action.type === 'play_action_card') {
    applyAccusationAction(result.state, action.playerId, accusationTarget);
    applyPenanceAction(result.state, action.playerId, action.cardId);
  }

  const endedBattle = Boolean(priorBattle && !result.state.battle);
  if (endedBattle && priorBattle) {
    applyCondemnationAfterBattle(result.state, priorBattle);
    awardNormalConvictionAfterBattle(result.state, priorBattle, graveyardsBefore);
    queueAccusationBattleEffects(result.state, priorBattle);
  }

  awardBlasphemyForActionUse(result.state, arcaneActionUse);
  awardBlasphemyForRevealedBattleCards(result.state);

  if (normalDraw) {
    evaluatePurificationAfterNormalDraw(result.state, action.playerId, result.result?.drawnCards);
  }

  return continueInquisitionAutomation(result);
}
