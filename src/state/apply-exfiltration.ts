import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyPostRevealGameAction } from './apply-post-reveal';
import {
  exfiltrationBattlePlayers,
  openExfiltrationBattleWindow,
  resolveExfiltrationBattleChoice,
} from './intelligence-exfiltration-battle';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && game.pendingIntelligenceChoice?.kind === 'exfiltration_battle_withdraw') {
    const next = structuredClone(game);
    resolveExfiltrationBattleChoice(next, action);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'resolve_battle') {
    const eligiblePlayers = exfiltrationBattlePlayers(game);
    const result = applyPostRevealGameAction(game, action);
    openExfiltrationBattleWindow(result.state, eligiblePlayers);
    return result;
  }

  return applyPostRevealGameAction(game, action);
}
