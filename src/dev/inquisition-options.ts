import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state/v06';
import {
  CONFESSION,
  EXCOMMUNICATION,
  FINAL_JUDGMENT_SENTINEL,
  HELLFIRE,
  HERESY,
  inquisitionCardTitle,
  legalExcommunicationSelections,
  legalInquisitionPurgeOptions,
  NO_MARTYRS,
  PENANCE,
  TYRANNY,
} from '../state/v06';

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
    case 'final_judgment_purge':
      return pending.purgeOptions.map((option) => ({
        label: `Final Judgment: pay ${option.effectiveCost} Conviction for ${option.mode} (normally ${option.originalCost})`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: option.mode,
          cardId: option.cardId ?? FINAL_JUDGMENT_SENTINEL,
          cardIds: option.cardIds,
        },
      }));
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
    case 'act_of_faith':
      return pending.revealedCards.map((cardId) => ({
        label: `Put ${cardId} in the Graveyard; discard the other revealed cards`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: 'select_graveyard',
          cardId,
        },
      }));
    case 'burning_at_the_stake':
      return pending.highestValueOptions.map((cardId) => ({
        label: `Put highest-value card ${cardId} in the opponent’s Graveyard`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: 'select_highest',
          cardId,
        },
      }));
    case 'confession_action':
      return pending.handOptions.map((cardId) => ({
        label: `Choose ${cardId} for Confession until end of turn`,
        action: {
          type: 'resolve_inquisition_choice',
          playerId,
          choice: 'select_card',
          cardId,
        },
      }));
    case 'confession_battle':
      return [
        {
          label: 'Keep the original hand commitment',
          action: {
            type: 'resolve_inquisition_choice',
            playerId,
            choice: 'pass',
            cardId: CONFESSION,
          },
        },
        ...pending.replacementOptions.map((cardId) => ({
          label: `Return ${pending.originalCommitCardId} to hand and replace it face up with ${cardId}`,
          action: {
            type: 'resolve_inquisition_choice' as const,
            playerId,
            choice: 'replace',
            cardId,
          },
        })),
      ];
    case 'tyranny_negate':
      return [
        ...(pending.sourceKind === 'asset' ? [{
          label: 'Keep Tyranny banked',
          action: { type: 'resolve_inquisition_choice' as const, playerId, choice: 'pass', cardId: TYRANNY },
        }] : []),
        ...pending.targetOptions.map((target) => ({
          label: `Negate ${target.cardId} with Tyranny`,
          action: {
            type: 'resolve_inquisition_choice' as const,
            playerId,
            choice: 'negate',
            cardId: TYRANNY,
            targetKey: target.targetKey,
          },
        })),
      ];
    case 'no_martyrs_asset':
      return [
        {
          label: 'Keep No Martyrs banked',
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'pass', cardId: NO_MARTYRS },
        },
        {
          label: 'Discard No Martyrs for this battle',
          action: { type: 'resolve_inquisition_choice', playerId, choice: 'use', cardId: NO_MARTYRS },
        },
      ];
    case 'hellfire_action':
      return Array.from({ length: pending.maxSpend + 1 }, (_, amount) => ({
        label: `Spend ${amount} Conviction; put up to ${amount} opposing Draw Pile card${amount === 1 ? '' : 's'} in the Graveyard`,
        action: {
          type: 'resolve_inquisition_choice' as const,
          playerId,
          choice: 'spend',
          cardId: HELLFIRE,
          amount,
        },
      }));
    case 'hellfire_battle':
      return Array.from({ length: pending.maxSpend + 1 }, (_, amount) => (
        Array.from({ length: amount + 1 }, (_, delayedCount) => ({
          label: `Spend ${amount} Conviction: +${amount - delayedCount} battle total; ${delayedCount} delayed Graveyard card${delayedCount === 1 ? '' : 's'} if you win`,
          action: {
            type: 'resolve_inquisition_choice' as const,
            playerId,
            choice: 'allocate',
            cardId: HELLFIRE,
            amount,
            secondaryAmount: delayedCount,
          },
        }))
      )).flat();
    case 'heresy_replay':
      return [
        {
          label: 'Do not spend Conviction on Heresy',
          action: {
            type: 'resolve_inquisition_choice',
            playerId,
            choice: 'pass',
            cardId: HERESY,
          },
        },
        ...pending.graveyardOptions.map((cardId) => ({
          label: `Spend 4 Conviction to resolve ${cardId} from the opposing Graveyard`,
          action: {
            type: 'resolve_inquisition_choice' as const,
            playerId,
            choice: 'replay',
            cardId,
          },
        })),
      ];
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
