import type { GameState } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyFogOverlayGameAction } from './apply-fog-overlay';
import {
  bankedAssetEffectCandidateForAction,
  isSubversionAssetChoice,
  maybeOpenSubversionAssetWindow,
  resolveSubversionAssetChoice,
} from './intelligence-subversion-asset';
import { recordBankedAssetUse } from './intelligence-mission-triggers';
import { runPostActionAutomationPipeline } from './pipeline';
import { GameActionError, type ApplyGameActionResult } from './reducer';

function applyAndRecordBankedAssetEffect(
  game: GameState,
  action: AppStateAction,
): ApplyGameActionResult {
  const candidate = bankedAssetEffectCandidateForAction(game, action);
  const battleId = game.battle?.id;
  const result = applyFogOverlayGameAction(game, action);

  if (candidate && battleId) {
    recordBankedAssetUse(result.state, candidate.targetOwner, battleId, candidate.targetCardId);
  }
  return result;
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (isSubversionAssetChoice(game.pendingIntelligenceChoice)) {
    if (action.type !== 'resolve_intelligence_choice') {
      throw new GameActionError('Resolve the pending Subversion Asset choice first.');
    }
    const next = structuredClone(game);
    const resolution = resolveSubversionAssetChoice(next, action);
    if (resolution.actionToApply) return applyAndRecordBankedAssetEffect(next, resolution.actionToApply);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  const interrupted = structuredClone(game);
  if (maybeOpenSubversionAssetWindow(interrupted, action)) {
    runPostActionAutomationPipeline(interrupted);
    return { state: interrupted };
  }

  return applyAndRecordBankedAssetEffect(game, action);
}
