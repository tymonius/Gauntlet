import type { BattleState, GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyMysticsGameAction } from './apply-mystics';
import {
  actionArcaneUse,
  applyCondemnationAfterBattle,
  awardBlasphemyForActionUse,
  awardBlasphemyForRevealedBattleCards,
  awardNormalConvictionAfterBattle,
  captureInquisitionGraveyards,
  evaluatePurificationAfterNormalDraw,
} from './inquisition-core';
import { useInquisitionPurge } from './inquisition-purge';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function battleSnapshot(game: GameState): BattleState | undefined {
  return game.battle ? structuredClone(game.battle) : undefined;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  const priorBattle = battleSnapshot(game);
  const graveyardsBefore = captureInquisitionGraveyards(game);
  const arcaneActionUse = actionArcaneUse(game, action);
  const normalDraw = action.type === 'draw_card' && game.phase === 'turn_start';

  let result: ApplyGameActionResult;
  if (action.type === 'use_inquisition_purge') {
    const next = structuredClone(game);
    useInquisitionPurge(next, action);
    runPostActionAutomationPipeline(next);
    result = { state: next };
  } else {
    result = applyMysticsGameAction(game, action);
  }
  const endedBattle = Boolean(priorBattle && !result.state.battle);

  if (endedBattle && priorBattle) {
    applyCondemnationAfterBattle(result.state, priorBattle);
    awardNormalConvictionAfterBattle(result.state, priorBattle, graveyardsBefore);
  }

  awardBlasphemyForActionUse(result.state, arcaneActionUse);
  awardBlasphemyForRevealedBattleCards(result.state);

  if (normalDraw) {
    evaluatePurificationAfterNormalDraw(result.state, action.playerId, result.result?.drawnCards);
  }

  return result;
}
