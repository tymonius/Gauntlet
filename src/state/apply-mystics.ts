import type { BattleState, GameState, PlayerID } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applySubversionAssetGameAction } from './apply-subversion-asset';
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
): ApplyGameActionResult {
  if (priorBattle
    && !result.state.battle
    && result.state.recentBattleResult?.battleId === priorBattle.id) {
    resolveDeferredMateriaPrimaAfterBattle(result.state, priorBattle.id);
    reconcileMysticsAfterResolvedBattle(result.state, priorBattle);
  }
  reconcileRiteOfCrossingAtTurnStart(result.state);
  if (arcaneUse && isArcaneCard(arcaneUse.cardId)) {
    queueInvocationForArcaneUse(result.state, arcaneUse.playerId, [arcaneUse.cardId]);
  }
  queueInvocationForRevealedBattleCards(result.state);
  runPostActionAutomationPipeline(result.state);
  openDeferredInvocationIfReady(result.state);
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (game.pendingMysticsChoice) {
    if (action.type !== 'resolve_mystics_choice') {
      throw new GameActionError('Resolve the pending Mystics choice first.');
    }
    const next = structuredClone(game);
    if (next.pendingMysticsChoice?.kind === 'invocation') resolveInvocationChoice(next, action);
    else resolveMysticsChoice(next, action);
    return continueMysticsAutomation({ state: next });
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
    return continueMysticsAutomation({ state: next });
  }

  if (action.type === 'use_mystic_transmutation') {
    const next = structuredClone(game);
    useTransmutation(next, action);
    return continueMysticsAutomation({ state: next });
  }

  const priorBattle = resolvedBattleSnapshot(game);
  const result = applySubversionAssetGameAction(game, action);
  const arcaneUse = action.type === 'play_action_card'
    ? { playerId: action.playerId, cardId: action.cardId }
    : undefined;
  return continueMysticsAutomation(result, priorBattle, arcaneUse);
}
