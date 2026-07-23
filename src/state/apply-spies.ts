import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyIntelligenceGameAction } from './apply-intelligence';
import {
  continueIntelligenceBattle,
  prepareDeferredBattleDrawPassReveal,
  restoreDeferredBattleDrawReveal,
} from './intelligence-battle';
import { resolveSpiesBattleChoice } from './intelligence-spies-battle';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { openNextFinancierChoice } from './financier-battle-cards';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openMilitaryAfterRevealWindows } from './military-timing';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function openPostRevealWindows(game: GameState, previousStage?: string): void {
  if (previousStage === 'dice' || game.battle?.stage !== 'dice') return;
  openMilitaryAfterRevealWindows(game);
  buildFinancierPreDiceChoices(game);
  openNextFinancierChoice(game);
  if (!game.pendingFinancierChoice && !game.financierChoiceQueue?.length) maybeOpenSubsidizeWindow(game);
}

function continueDeferredReveal(game: GameState, previousStage?: string): void {
  if (game.pendingIntelligenceChoice || game.battle?.stage !== 'normal_reveal') return;
  continueIntelligenceBattle(game);
  openPostRevealWindows(game, previousStage);
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice' && game.pendingIntelligenceChoice?.kind === 'spies_battle_reselect') {
    const next = structuredClone(game);
    const previousStage = next.battle?.stage;
    resolveSpiesBattleChoice(next, action);
    continueIntelligenceBattle(next);
    openPostRevealWindows(next, previousStage);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'pass_battle_draw_play') {
    const working = structuredClone(game);
    const previousStage = working.battle?.stage;
    const deferred = prepareDeferredBattleDrawPassReveal(working, action);
    const result = applyIntelligenceGameAction(working, action);
    restoreDeferredBattleDrawReveal(result.state, deferred);
    continueDeferredReveal(result.state, previousStage);
    return result;
  }

  const previousStage = game.battle?.stage;
  const result = applyIntelligenceGameAction(game, action);
  if (action.type === 'play_battle_draw_card') continueDeferredReveal(result.state, previousStage);
  return result;
}
