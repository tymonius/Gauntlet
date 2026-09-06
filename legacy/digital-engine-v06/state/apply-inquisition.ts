import type { BattleState, GameState } from '../types/v06';
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
  applyActOfFaithAction,
  isActOfFaithChoice,
  openNextActOfFaithChoice,
  queueActOfFaithBattleEffects,
  resolveActOfFaithChoice,
} from './inquisition-act-of-faith';
import {
  applyBurningAtTheStakeAction,
  isBurningAtTheStakeChoice,
  openNextBurningAtTheStakeChoice,
  queueBurningAtTheStakeBattleEffects,
  resolveBurningAtTheStakeChoice,
} from './inquisition-burning-at-the-stake';
import {
  applyConfessionAction,
  clearExpiredConfessionConstraint,
  isConfessionChoice,
  resolveConfessionChoice,
  validateConfessionHandCommit,
} from './inquisition-confession';
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
  applyDivineMercyAction,
  isDivineMercyChoice,
  openNextDivineMercyChoice,
  queueDivineMercyBattleEffects,
  requireDivineMercyActionTarget,
  resolveDivineMercyChoice,
} from './inquisition-divine-mercy';
import {
  applyExcommunicationAction,
  isExcommunicationChoice,
  openNextExcommunicationChoice,
  queueExcommunicationBattleEffects,
  requireExcommunicationActionTarget,
  resolveExcommunicationChoice,
} from './inquisition-excommunication';
import {
  applyGuiltByAssociationAction,
  isGuiltByAssociationChoice,
  openNextGuiltByAssociationChoice,
  queueGuiltByAssociationBattleEffects,
  requireGuiltByAssociationActionTarget,
  resolveGuiltByAssociationChoice,
} from './inquisition-guilt-by-association';
import {
  applyHellfireAction,
  applyHellfireAfterBattle,
  isHellfireChoice,
  resolveHellfireChoice,
} from './inquisition-hellfire';
import {
  isHeresyChoice,
  resolveHeresyChoice,
} from './inquisition-heresy';
import {
  consumeRelentlessPursuitRequest,
  isFinalJudgmentChoice,
  resolveFinalJudgmentChoice,
  resumeRelentlessPursuitTurnStart,
} from './inquisition-leaders';
import {
  applyPenanceAction,
  isPenanceChoice,
  openNextPenanceChoice,
  queuePenanceBattleEffects,
  resolvePenanceChoice,
} from './inquisition-penance';
import {
  isNoMartyrsChoice,
  openNextNoMartyrsAssetChoice,
  resolveNoMartyrsChoice,
} from './inquisition-no-martyrs';
import {
  isTyrannyChoice,
  resolveTyrannyChoice,
} from './inquisition-tyranny';
import { resolveInquisitionChoice as resolveInquisitionPurgeChoice, useInquisitionPurge } from './inquisition-purge';
import { continueIntelligenceBattle } from './intelligence-battle';
import { continueIntelligencePostRevealFlow } from './intelligence-post-reveal-flow';
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
  continueIntelligencePostRevealFlow(result.state);
  clearExpiredConfessionConstraint(result.state);
  queuePenanceBattleEffects(result.state);
  openNextPenanceChoice(result.state);
  queueDivineMercyBattleEffects(result.state);
  openNextDivineMercyChoice(result.state);
  openNextAccusationChoice(result.state);
  openNextExcommunicationChoice(result.state);
  openNextGuiltByAssociationChoice(result.state);
  openNextActOfFaithChoice(result.state);
  openNextBurningAtTheStakeChoice(result.state);
  openNextNoMartyrsAssetChoice(result.state);
  resumeRelentlessPursuitTurnStart(result.state);
  if (result.state.pendingInquisitionChoice) {
    result.state.priorityPlayer = result.state.pendingInquisitionChoice.playerId;
  }
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

function executeRelentlessPursuit(result: ApplyGameActionResult): ApplyGameActionResult {
  const request = consumeRelentlessPursuitRequest(result.state);
  if (!request) return result;

  const ended = applyMysticsGameAction(result.state, {
    type: 'end_turn',
    playerId: request.loserId,
  });
  const next = ended.state;
  if (next.activePlayer !== request.playerId) {
    throw new GameActionError('Relentless Pursuit did not pass the turn to the Witch Hunter.');
  }

  const current = next.board.spaces.find((space) => space.occupant === request.playerId);
  const destination = current
    ? next.board.spaces.find((space) => space.index === current.index + request.direction)
    : undefined;
  if (!current || !destination) {
    throw new GameActionError('Relentless Pursuit has no legal adjacent position.');
  }

  next.players[request.playerId].movementRemaining += 1;
  next.phase = 'movement';
  next.priorityPlayer = request.playerId;
  const moved = applyMysticsGameAction(next, {
    type: 'move_player',
    playerId: request.playerId,
    toSpaceId: destination.id,
  });

  if (moved.state.battle) {
    moved.state.inquisitionRelentlessPursuitResume = {
      playerId: request.playerId,
      turn: moved.state.turn,
    };
  } else {
    moved.state.recentBattleResult = undefined;
    moved.state.phase = 'turn_start';
    moved.state.priorityPlayer = request.playerId;
  }
  return moved;
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
    const resumePreReveal = pendingKind === 'confession_battle';
    const resumePostReveal = pendingKind === 'tyranny_negate'
      || pendingKind === 'heresy_replay'
      || pendingKind === 'hellfire_battle';
    if (isFinalJudgmentChoice(pendingKind)) resolveFinalJudgmentChoice(next, action);
    else if (isAccusationChoice(pendingKind)) resolveAccusationChoice(next, action);
    else if (isPenanceChoice(pendingKind)) resolvePenanceChoice(next, action);
    else if (isDivineMercyChoice(pendingKind)) resolveDivineMercyChoice(next, action);
    else if (isExcommunicationChoice(pendingKind)) resolveExcommunicationChoice(next, action);
    else if (isGuiltByAssociationChoice(pendingKind)) resolveGuiltByAssociationChoice(next, action);
    else if (isActOfFaithChoice(pendingKind)) resolveActOfFaithChoice(next, action);
    else if (isBurningAtTheStakeChoice(pendingKind)) resolveBurningAtTheStakeChoice(next, action);
    else if (isConfessionChoice(pendingKind)) resolveConfessionChoice(next, action);
    else if (isNoMartyrsChoice(pendingKind)) resolveNoMartyrsChoice(next, action);
    else if (isTyrannyChoice(pendingKind)) resolveTyrannyChoice(next, action);
    else if (isHeresyChoice(pendingKind)) resolveHeresyChoice(next, action);
    else if (isHellfireChoice(pendingKind)) resolveHellfireChoice(next, action);
    else resolveInquisitionPurgeChoice(next, action);
    if (resumePreReveal) continueIntelligenceBattle(next);
    if (resumePostReveal) continueIntelligencePostRevealFlow(next);
    return finishDirectInquisitionAction(next, mysticGraveyardsBefore);
  }
  if (action.type === 'resolve_inquisition_choice') {
    throw new GameActionError(`${action.playerId} has no pending Inquisition choice.`);
  }
  if (action.type === 'commit_battle_hand_card') {
    validateConfessionHandCommit(game, action.playerId, action.cardId);
  }

  const accusationTarget = action.type === 'play_action_card'
    ? requireAccusationActionTarget(game, action.playerId, action.cardId, action.targets)
    : undefined;
  const divineMercyTarget = action.type === 'play_action_card'
    ? requireDivineMercyActionTarget(game, action.playerId, action.cardId, action.targets)
    : undefined;
  const excommunicationTarget = action.type === 'play_action_card'
    ? requireExcommunicationActionTarget(game, action.playerId, action.cardId, action.targets)
    : undefined;
  const guiltByAssociationTarget = action.type === 'play_action_card'
    ? requireGuiltByAssociationActionTarget(game, action.playerId, action.cardId, action.targets)
    : undefined;

  let result: ApplyGameActionResult;
  if (action.type === 'use_inquisition_purge') {
    const next = structuredClone(game);
    useInquisitionPurge(next, action);
    result = finishDirectInquisitionAction(next, mysticGraveyardsBefore);
  } else {
    result = applyMysticsGameAction(game, action);
  }
  if (action.type === 'use_leader_ability') {
    result = executeRelentlessPursuit(result);
  }

  if (action.type === 'play_action_card') {
    applyAccusationAction(result.state, action.playerId, accusationTarget);
    applyPenanceAction(result.state, action.playerId, action.cardId);
    applyDivineMercyAction(result.state, action.playerId, divineMercyTarget);
    applyExcommunicationAction(result.state, action.playerId, excommunicationTarget);
    applyGuiltByAssociationAction(result.state, action.playerId, guiltByAssociationTarget);
    applyActOfFaithAction(result.state, action.playerId, action.cardId);
    applyBurningAtTheStakeAction(result.state, action.playerId, action.cardId);
    applyConfessionAction(result.state, action.playerId, action.cardId);
    applyHellfireAction(result.state, action.playerId, action.cardId);
  }

  const endedBattle = Boolean(priorBattle && !result.state.battle);
  if (endedBattle && priorBattle) {
    applyCondemnationAfterBattle(result.state, priorBattle);
    applyHellfireAfterBattle(result.state, priorBattle);
    awardNormalConvictionAfterBattle(result.state, priorBattle, graveyardsBefore);
    queueAccusationBattleEffects(result.state, priorBattle);
    queueExcommunicationBattleEffects(result.state, priorBattle);
    queueGuiltByAssociationBattleEffects(result.state, priorBattle);
    queueActOfFaithBattleEffects(result.state, priorBattle);
    queueBurningAtTheStakeBattleEffects(result.state, priorBattle);
  }

  awardBlasphemyForActionUse(result.state, arcaneActionUse);
  awardBlasphemyForRevealedBattleCards(result.state);

  if (normalDraw) {
    evaluatePurificationAfterNormalDraw(result.state, action.playerId, result.result?.drawnCards);
  }

  return continueInquisitionAutomation(result);
}
