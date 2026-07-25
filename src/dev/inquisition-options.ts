import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state';
import {
  EXCOMMUNICATION,
  inquisitionCardTitle,
  legalExcommunicationSelections,
  legalInquisitionPurgeOptions,
  PENANCE,
} from '../state';

export interface InquisitionGuidedOption {
  label: string;
  action: AppStateAction;
}

export function buildPendingInquisitionOptions(
  game: GameState,
  playerId: PlayerID,
): InquisitionGuidedOption[] | undefined {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  switch (pending.kind) {
    case 'purge_hand_choice':
      return pending.handOptions.map((cardId) => ({
        label: `Choose ${cardId} from your hand for Purge`,
        action: { type: 'resolve_inquisition_choice', playerId, cardId },
      }));
    case 'accusation_select_card':
      return pending.discardOptions.map((cardId) => ({
        label: `Accuse ${cardId} in the opposing Discard Pile`,
        action: { type: 'resolve_inquisition_choice', playerId, choice: 'select_card', cardId },
      }));
    case 'accusation_destination':
      return [
        {
          label: `Put ${pending.cardId} on top of your Draw Pile`,
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'top_deck', cardId: pending.cardId },
        },
        {
          label: `Put ${pending.cardId} in your Graveyard`,
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'graveyard', cardId: pending.cardId },
        },
      ];
    case 'penance_action':
      return [
        ...pending.handOptions.map((cardId) => ({
          label: `Put ${cardId} from your hand in the Graveyard for Penance`,
          action: { type: 'resolve_inquisition_choice' as const, playerId, choice: 'sacrifice', cardId },
        })),
        {
          label: 'Refuse Penance; the Inquisition gains 1 Conviction',
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'conviction', cardId: PENANCE },
        },
      ];
    case 'penance_battle':
      return [
        ...pending.handOptions.map((cardId) => ({
          label: `Put ${cardId} from your hand in the Graveyard for Penance`,
          action: { type: 'resolve_inquisition_choice' as const, playerId, choice: 'sacrifice', cardId },
        })),
        {
          label: 'Refuse Penance; add +1 to the Inquisition battle total',
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'bonus', cardId: PENANCE },
        },
      ];
    case 'divine_mercy_battle':
      return pending.graveyardOptions.map((cardId) => ({
        label: `Move ${cardId} from the opposing Graveyard to Discard and add +2`,
        action: { type: 'resolve_inquisition_choice', playerId, choice: 'select_card', cardId },
      }));
    case 'excommunication_battle':
      return legalExcommunicationSelections(pending.discardOptions, pending.valueLimit).map((cardIds) => ({
        label: `Excommunicate ${cardIds.join(', ')} after the battle`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: 'select_cards',
          cardId: EXCOMMUNICATION,
          cardIds,
        },
      }));
    case 'guilt_by_association_battle':
      return pending.usedCardOptions.map((cardId) => ({
        label: `Move every ${inquisitionCardTitle(cardId)} in the opposing Discard Pile to the Graveyard`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: 'select_title',
          cardId,
        },
      }));
  }
}

export function buildInquisitionPurgeOptions(
  game: GameState,
  playerId: PlayerID,
): InquisitionGuidedOption[] {
  return legalInquisitionPurgeOptions(game, playerId).map((option) => {
    switch (option.mode) {
      case 'discard_top_to_graveyard':
        return {
          label: 'Pay 1 Conviction: move the top opposing discard to the Graveyard',
          action: { type: 'use_inquisition_purge', playerId, mode: option.mode },
        };
      case 'discard_value_to_graveyard':
        return {
          label: `Pay 1 Conviction: move ${option.cardIds!.join(', ')} from the opposing Discard Pile to the Graveyard`,
          action: { type: 'use_inquisition_purge', playerId, mode: option.mode, cardIds: option.cardIds },
        };
      case 'asset_to_graveyard':
        return {
          label: `Pay 2 Conviction: move opposing Asset ${option.cardId} to the Graveyard`,
          action: { type: 'use_inquisition_purge', playerId, mode: option.mode, cardId: option.cardId },
        };
      case 'opponent_choose_hand_to_graveyard':
        return {
          label: 'Pay 3 Conviction: opponent chooses one hand card for the Graveyard',
          action: { type: 'use_inquisition_purge', playerId, mode: option.mode },
        };
      case 'choose_hand_to_graveyard':
        return {
          label: `Pay 4 Conviction: choose ${option.cardId} from the opposing hand for the Graveyard`,
          action: { type: 'use_inquisition_purge', playerId, mode: option.mode, cardId: option.cardId },
        };
    }
  });
}
