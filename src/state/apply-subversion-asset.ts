import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFogOverlayGameAction } from './apply-fog-overlay';
import {
  isSubversionAssetChoice,
  maybeOpenSubversionAssetWindow,
  resolveSubversionAssetChoice,
} from './intelligence-subversion-asset';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (isSubversionAssetChoice(game.pendingIntelligenceChoice)) {
    if (action.type !== 'resolve_intelligence_choice') {
      throw new GameActionError('Resolve the pending Subversion Asset choice first.');
    }
    const next = structuredClone(game);
    const resolution = resolveSubversionAssetChoice(next, action);
    if (resolution.actionToApply) return applyFogOverlayGameAction(next, resolution.actionToApply);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  const interrupted = structuredClone(game);
  if (maybeOpenSubversionAssetWindow(interrupted, action)) {
    runPostActionAutomationPipeline(interrupted);
    return { state: interrupted };
  }

  return applyFogOverlayGameAction(game, action);
}
