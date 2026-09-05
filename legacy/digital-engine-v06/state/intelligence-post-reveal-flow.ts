import type { GameState } from '../types/v06';
import { openNextFinancierChoice } from './financier-battle-cards';
import { buildFinancierPreDiceChoices } from './financier-pre-dice';
import { maybeOpenSubsidizeWindow } from './financier-integration';
import { openNextHellfireChoice } from './inquisition-hellfire';
import { openNextHeresyChoice } from './inquisition-heresy';
import { openNextIntelligencePostRevealWindow } from './intelligence-post-reveal';
import { openNextTyrannyChoice } from './inquisition-tyranny';
import { openMilitaryAfterRevealWindows } from './military-timing';

export function openFactionPostRevealWindows(game: GameState): void {
  if (game.battle?.stage !== 'dice' || game.pendingIntelligenceChoice) return;
  openMilitaryAfterRevealWindows(game);
  buildFinancierPreDiceChoices(game);
  openNextFinancierChoice(game);
  if (!game.pendingFinancierChoice && !game.financierChoiceQueue?.length) maybeOpenSubsidizeWindow(game);
}

export function continueIntelligencePostRevealFlow(game: GameState): boolean {
  if (game.battle?.stage !== 'dice' || game.pendingIntelligenceChoice || game.pendingInquisitionChoice) return false;
  if (openNextIntelligencePostRevealWindow(game)) return true;
  if (openNextTyrannyChoice(game)) return true;
  if (openNextHeresyChoice(game)) return true;
  if (openNextHellfireChoice(game)) return true;
  openFactionPostRevealWindows(game);
  return false;
}
