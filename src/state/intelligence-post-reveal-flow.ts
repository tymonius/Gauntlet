import type { GameState } from '../types';
import { openNextFinancierChoice } from './financier-battle-cards';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openNextIntelligencePostRevealWindow } from './intelligence-post-reveal';
import { openMilitaryAfterRevealWindows } from './military-timing';

export function openFactionPostRevealWindows(game: GameState): void {
  if (game.battle?.stage !== 'dice' || game.pendingIntelligenceChoice) return;
  openMilitaryAfterRevealWindows(game);
  buildFinancierPreDiceChoices(game);
  openNextFinancierChoice(game);
  if (!game.pendingFinancierChoice && !game.financierChoiceQueue?.length) maybeOpenSubsidizeWindow(game);
}

export function continueIntelligencePostRevealFlow(game: GameState): boolean {
  if (game.battle?.stage !== 'dice' || game.pendingIntelligenceChoice) return false;
  if (openNextIntelligencePostRevealWindow(game)) return true;
  openFactionPostRevealWindows(game);
  return false;
}
