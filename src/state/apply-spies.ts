import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyIntelligenceGameAction } from './apply-intelligence';
import {
  continueIntelligenceBattle,
  prepareDeferredBattleDrawPassReveal,
  restoreDeferredBattleDrawReveal,
} from './intelligence-battle';
import { continueIntelligencePostRevealFlow } from './intelligence-post-reveal-flow';
import { resolveSpiesBattleChoice } from './intelligence-spies-battle';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function continueDeferredReveal(game: GameState): void {
  if (game.pendingIntelligenceChoice || game.battle?.stage !== 'normal_reveal') return;
  continueIntelligenceBattle(game);
  continueIntelligencePostRevealFlow(game);
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice' && game.pendingIntelligenceChoice?.kind === 'spies_battle_reselect') {
    const next = structuredClone(game);
    resolveSpiesBattleChoice(next, action);
    continueIntelligenceBattle(next);
    continueIntelligencePostRevealFlow(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'pass_battle_draw_play') {
    const working = structuredClone(game);
    const deferred = prepareDeferredBattleDrawPassReveal(working, action);
    const result = applyIntelligenceGameAction(working, action);
    restoreDeferredBattleDrawReveal(result.state, deferred);
    continueDeferredReveal(result.state);
    return result;
  }

  const result = applyIntelligenceGameAction(game, action);
  if (action.type === 'play_battle_draw_card') continueDeferredReveal(result.state);
  return result;
}
