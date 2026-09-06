import type { GameState } from '../types/v06';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFogOverlayGameAction } from './apply-fog-overlay';
import { resolveGraveWardAssetAction } from './mystics-grave-ward';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'use_mystic_grave_ward_asset') {
    const next = structuredClone(game);
    resolveGraveWardAssetAction(next, action);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }
  return applyFogOverlayGameAction(game, action);
}
