import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state/actions';

export interface IntelligenceBattleGuidedOption {
  label: string;
  action: AppStateAction;
}

export function buildIntelligenceBattleOptions(game: GameState, playerId: PlayerID): IntelligenceBattleGuidedOption[] | undefined {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  const action = (label: string, choice: string, cardId?: string): IntelligenceBattleGuidedOption => ({
    label,
    action: { type: 'resolve_intelligence_choice', playerId, choice, cardId },
  });
  if (pending.kind === 'surveillance') {
    return [
      action('Pass Surveillance', 'pass'),
      action('Spend 1 Intel to use Surveillance', 'surveil'),
    ];
  }
  if (pending.kind === 'interference') {
    return [
      action(`Keep inspected ${pending.targetCardId} in the battle`, 'pass'),
      action(`Spend 2 Intel to Interfere with ${pending.targetCardId}`, 'interfere'),
    ];
  }
  if (pending.kind === 'interference_replacement') {
    return [
      action('Choose no replacement card', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Choose replacement ${cardId}`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'mission_control') {
    return [
      action('Pass Mission Control', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Start ${cardId} with Mission Control`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'fieldcraft') {
    return [
      action('Allow the Territory effect', 'pass'),
      action(`Spend 1 Intel to ignore ${pending.effectId}`, 'ignore'),
    ];
  }
  if (pending.kind === 'spies_discard') {
    return pending.handOptions.map((cardId) => action(`Discard ${cardId} for Spies`, 'select', cardId));
  }
  if (pending.kind === 'assassins_discard') {
    return pending.opponentHandOptions.map((cardId) => action(`Discard opposing ${cardId} with Assassins`, 'select', cardId));
  }
  return pending.eligibleCardIds.map((cardId) => action(`Start ${cardId} as the reassessed Mission`, 'select', cardId));
}
