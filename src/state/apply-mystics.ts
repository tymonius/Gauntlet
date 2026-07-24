import type { BattleState, GameState, PlayerID } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applySubversionAssetGameAction } from './apply-subversion-asset';
import { isSubversionAssetChoice } from './intelligence-subversion-asset';
import {
  applyAccursedWagerAction,
  bindAccursedWagerToNewBattle,
  expireAccursedWagerAtEndTurn,
  isAccursedWagerChoice,
  openAccursedWagerAftermathIfReady,
  queueAccursedWagerAfterBattle,
  resolveAccursedWagerChoice,
} from './mystics-accursed-wager';
import {
  applyDarkOmensAction,
  isDarkOmensChoice,
  openNextDarkOmensBattleChoice,
  resolveDarkOmensChoice,
} from './mystics-dark-omens';
import {
  applyFatesTollAction,
  continueFatesTollMovement,
  expireFatesTollMovement,
  fatesTollMoveUsesBonus,
  isFatesTollChoice,
  openNextFatesTollReroll,
  requireFatesTollActionTarget,
  resolveFatesTollChoice,
} from './mystics-fates-toll';
import {
  captureGraveyardSnapshot,
  isGraveWardAssetChoice,
  isGraveWardBattleChoice,
  openNextGraveWardChoice,
  queueGraveWardBattleEffects,
  registerGraveyardEntries,
  resolveGraveWardBattleChoice,
  type GraveyardSnapshot,
} from './mystics-grave-ward';
import {
  applyPathsOfShadowAction,
  isPathsOfShadowChoice,
  openPathsOfShadowChoiceIfReady,
  queuePathsOfShadowAfterBattle,
  requirePathsOfShadowActionTarget,
  resolvePathsOfShadowChoice,
} from './mystics-paths-of-shadow';
import {
  applySoulForSoulAction,
  isSoulForSoulChoice,
  openNextSoulForSoulBattleChoice,
  queueSoulForSoulBattleEffects,
  requireSoulForSoulActionTargets,
  resolveSoulForSoulBattleChoice,
} from './mystics-soul-for-soul';
import {
  openDeferredInvocationIfReady,
  queueInvocationForArcaneUse,
  queueInvocationForRevealedBattleCards,
  resolveDeferredMateriaPrimaAfterBattle,
  resolveInvocationChoice,
  triggerMateriaPrimaAfterHandSacrifice,
  useTransmutation,
} from './mystics-conversion';
import {
  beginMysticRiteFromAction,
  reconcileMysticsAfterResolvedBattle,
  reconcileRiteOfCrossingAtTurnStart,
  resolveMysticsChoice,
} from './mystics-rite-integration';
import { isArcaneCard } from './mystics-ritual';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

interface ArcaneUse {
  playerId: PlayerID;
  cardId: string;
}

function resolvedBattleSnapshot(game: GameState): BattleState | undefined {
  return game.battle ? structuredClone(game.battle) : undefined;
}

function continueMysticsAutomation(
  result: ApplyGameActionResult,
  priorBattle?: BattleState,
  arcaneUse?: ArcaneUse,
  graveyardBefore?: GraveyardSnapshot,
): ApplyGameActionResult {
  const endedBattle = Boolean(
    priorBattle
    && !result.state.battle
    && result.state.recentBattleResult?.battleId === priorBattle.id,
  );
  if (endedBattle && priorBattle) {
    resolveDeferredMateriaPrimaAfterBattle(result.state, priorBattle.id);
    reconcileMysticsAfterResolvedBattle(result.state, priorBattle);
    queuePathsOfShadowAfterBattle(result.state, priorBattle);
    queueAccursedWagerAfterBattle(result.state, priorBattle);
    queueGraveWardBattleEffects(result.state, priorBattle);
    queueSoulForSoulBattleEffects(result.state, priorBattle);
  }
  if (graveyardBefore) {
    registerGraveyardEntries(result.state, graveyardBefore, endedBattle ? priorBattle?.id : undefined);
  }
  reconcileRiteOfCrossingAtTurnStart(result.state);
  openPathsOfShadowChoiceIfReady(result.state);
  openNextGraveWardChoice(result.state);
  openNextSoulForSoulBattleChoice(result.state);
  if (arcaneUse && isArcaneCard(arcaneUse.cardId)) {
    queueInvocationForArcaneUse(result.state, arcaneUse.playerId, [arcaneUse.cardId]);
  }
  runPostActionAutomationPipeline(result.state);
  openPathsOfShadowChoiceIfReady(result.state);
  openNextGraveWardChoice(result.state);
  openNextSoulForSoulBattleChoice(result.state);
  openNextDarkOmensBattleChoice(result.state);
  queueInvocationForRevealedBattleCards(result.state);
  openNextFatesTollReroll(result.state);
  openAccursedWagerAftermathIfReady(result.state);
  openDeferredInvocationIfReady(result.state);
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  const graveyardBefore = captureGraveyardSnapshot(game);
  const pendingMystics = game.pendingMysticsChoice;
  if (pendingMystics) {
    if (isGraveWardAssetChoice(pendingMystics)) {
      const resolvingSubversion = isSubversionAssetChoice(game.pendingIntelligenceChoice)
        && action.type === 'resolve_intelligence_choice';
      if (action.type !== 'use_mystic_grave_ward_asset' && !resolvingSubversion) {
        throw new GameActionError('Resolve the pending Grave Ward choice first.');
      }
      const result = applySubversionAssetGameAction(game, action);
      return continueMysticsAutomation(result, undefined, undefined, graveyardBefore);
    }
    if (action.type !== 'resolve_mystics_choice') {
      throw new GameActionError('Resolve the pending Mystics choice first.');
    }
    const next = structuredClone(game);
    const pendingKind = next.pendingMysticsChoice?.kind;
    if (pendingKind === 'invocation') resolveInvocationChoice(next, action);
    else if (isDarkOmensChoice(pendingKind)) resolveDarkOmensChoice(next, action);
    else if (isAccursedWagerChoice(pendingKind)) resolveAccursedWagerChoice(next, action);
    else if (isFatesTollChoice(pendingKind)) resolveFatesTollChoice(next, action);
    else if (isGraveWardBattleChoice(pendingKind)) resolveGraveWardBattleChoice(next, action);
    else if (isSoulForSoulChoice(pendingKind)) resolveSoulForSoulBattleChoice(next, action);
    else if (isPathsOfShadowChoice(pendingKind)) resolvePathsOfShadowChoice(next, action);
    else resolveMysticsChoice(next, action);
    return continueMysticsAutomation({ state: next }, undefined, undefined, graveyardBefore);
  }

  if (action.type === 'use_mystic_grave_ward_asset') {
    throw new GameActionError(`${action.playerId} has no pending Grave Ward Asset choice.`);
  }
  if (action.type === 'resolve_mystics_choice') {
    throw new GameActionError(`${action.playerId} has no pending Mystics choice.`);
  }

  if (action.type === 'begin_mystic_rite') {
    const next = structuredClone(game);
    beginMysticRiteFromAction(next, action);
    if (action.riteId === 'rite_of_blood'
      || (action.riteId === 'rite_of_crossing' && (action.source ?? 'hand') === 'hand')) {
      triggerMateriaPrimaAfterHandSacrifice(next, action.playerId, action.riteId);
    }
    return continueMysticsAutomation({ state: next }, undefined, undefined, graveyardBefore);
  }

  if (action.type === 'use_mystic_transmutation') {
    const next = structuredClone(game);
    useTransmutation(next, action);
    return continueMysticsAutomation({ state: next }, undefined, undefined, graveyardBefore);
  }

  if (action.type === 'play_action_card') {
    requireFatesTollActionTarget(game, action.playerId, action.cardId, action.targets);
    requireSoulForSoulActionTargets(game, action.playerId, action.cardId, action.targets);
    requirePathsOfShadowActionTarget(game, action.playerId, action.cardId, action.targets);
  }
  const priorBattle = resolvedBattleSnapshot(game);
  const usedFatesTollBonus = action.type === 'move_player'
    ? fatesTollMoveUsesBonus(game, action.playerId)
    : false;
  const result = applySubversionAssetGameAction(game, action);
  const battleStarted = !priorBattle && Boolean(result.state.battle);
  if (battleStarted) bindAccursedWagerToNewBattle(result.state);
  if (action.type === 'move_player') {
    continueFatesTollMovement(result.state, action.playerId, usedFatesTollBonus, battleStarted);
  }
  if (action.type === 'play_action_card') {
    applyDarkOmensAction(result.state, action.playerId, action.cardId);
    applyAccursedWagerAction(result.state, action.playerId, action.cardId);
    applyFatesTollAction(result.state, action.playerId, action.cardId, action.targets);
    applySoulForSoulAction(result.state, action.playerId, action.cardId, action.targets);
    applyPathsOfShadowAction(result.state, action.playerId, action.cardId, action.targets);
  }
  if (action.type === 'end_turn') {
    expireAccursedWagerAtEndTurn(result.state, action.playerId);
    expireFatesTollMovement(result.state, action.playerId);
  }
  const arcaneUse = action.type === 'play_action_card'
    ? { playerId: action.playerId, cardId: action.cardId }
    : undefined;
  return continueMysticsAutomation(result, priorBattle, arcaneUse, graveyardBefore);
}
