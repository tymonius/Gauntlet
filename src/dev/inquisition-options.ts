import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state';
import { legalInquisitionPurgeOptions } from '../state';

export interface InquisitionGuidedOption {
  label: string;
  action: AppStateAction;
}

export function buildInquisitionPurgeOptions(
  game: GameState,
  playerId: PlayerID,
): InquisitionGuidedOption[] {
  return legalInquisitionPurgeOptions(game, playerId).map((option) => {
    if (option.mode === 'remove_discard_top') {
      return {
        label: `Pay ${option.cost} Conviction: remove the top opposing discard from the game`,
        action: { type: 'use_inquisition_purge', playerId, mode: option.mode },
      };
    }
    if (option.mode === 'random_hand_to_graveyard') {
      return {
        label: `Pay ${option.cost} Conviction: put a random opposing hand card in the Graveyard`,
        action: { type: 'use_inquisition_purge', playerId, mode: option.mode },
      };
    }
    return {
      label: `Pay ${option.cost} Conviction: put ${option.cardId} beneath the opposing Draw Pile, then they draw one`,
      action: {
        type: 'use_inquisition_purge',
        playerId,
        mode: option.mode,
        cardId: option.cardId,
      },
    };
  });
}
