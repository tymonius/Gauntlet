import type { GameState } from '../types';
import { evaluateIntelligenceMissionRequirements } from './intelligence-mission-triggers';
import { reconcileIntelligenceState } from './intelligence-missions';
import { evaluateWinConditions } from './win';

export type AutomationPipelineStep = 'turn_start' | 'intelligence_reconciliation' | 'intelligence_mission_requirements' | 'win_conditions';

export interface AutomationPipelineResult {
  steps: AutomationPipelineStep[];
}

function hasPendingAssetBankDiscards(game: GameState): boolean {
  return Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0;
}

export function runPostActionAutomationPipeline(game: GameState): AutomationPipelineResult {
  const steps: AutomationPipelineStep[] = [];

  if (game.phase === 'turn_start') {
    steps.push('turn_start');
  }

  reconcileIntelligenceState(game);
  steps.push('intelligence_reconciliation');

  evaluateIntelligenceMissionRequirements(game);
  steps.push('intelligence_mission_requirements');

  if (!hasPendingAssetBankDiscards(game)) {
    evaluateWinConditions(game);
    steps.push('win_conditions');
  }

  return { steps };
}
