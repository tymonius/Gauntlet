import { v06CanonicalContent } from '../content/v06';
import type { CardID, GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state';
import {
  canBeginRiteOfCrossing,
  canUseTransmutation,
  circleOfBonesActionTargets,
  isArcaneCard,
  spiritHollowActionTargets,
} from '../state';

export interface MysticGuidedOption {
  label: string;
  action: AppStateAction;
}

function selectionsUpTo(cards: CardID[], maximum: number): CardID[][] {
  const selections: CardID[][] = [];
  const seen = new Set<string>();
  function visit(start: number, selected: CardID[]): void {
    const key = JSON.stringify(selected);
    if (!seen.has(key)) {
      seen.add(key);
      selections.push([...selected]);
    }
    if (selected.length >= maximum) return;
    for (let index = start; index < cards.length; index += 1) {
      selected.push(cards[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  return selections;
}

function actionWindowOpen(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  return Boolean(
    player?.factionId === 'mystics'
    && player.mystics
    && (game.phase === 'action_before_movement' || game.phase === 'action_after_movement')
    && game.activePlayer === playerId
    && game.priorityPlayer === playerId
    && player.actionsRemaining > 0
    && !player.hasPlayedActionThisTurn,
  );
}

function riteWindowOpen(game: GameState, playerId: PlayerID): boolean {
  return actionWindowOpen(game, playerId)
    && game.phase === 'action_after_movement'
    && !game.players[playerId].mystics?.begunRite;
}

function playableDeckCards(game: GameState, playerId: PlayerID): CardID[] {
  const player = game.players[playerId];
  return [
    ...player.zones.deck,
    ...player.zones.hand,
    ...player.zones.discard,
    ...player.zones.graveyard,
    ...player.zones.assetBank,
    ...player.zones.removed,
  ];
}

function duplicateTitleInDeck(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return playableDeckCards(game, playerId).filter((candidate) => candidate === cardId).length >= 2;
}

function supplementalCard(cardId: CardID): boolean {
  const card = v06CanonicalContent.cardsById.get(cardId);
  return card?.allegiance?.toLowerCase() === 'supplemental'
    || card?.card_form?.toLowerCase().includes('supplemental') === true;
}

function transmutationOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  if (!canUseTransmutation(game, playerId)) return [];
  return game.players[playerId].zones.hand
    .filter((cardId) => !supplementalCard(cardId))
    .map((cardId) => ({
      label: `Transmute ${cardId}`,
      action: { type: 'use_mystic_transmutation' as const, playerId, cardId },
    }));
}

function soulForSoulActionOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  if (!actionWindowOpen(game, playerId)) return [];
  const player = game.players[playerId];
  if (!player.zones.hand.includes('mystics-soul-for-soul') || player.zones.graveyard.length < 1) return [];
  const eligibleHand = [...player.zones.hand];
  eligibleHand.splice(eligibleHand.indexOf('mystics-soul-for-soul'), 1);
  const options: MysticGuidedOption[] = [];
  for (const handCardId of [...new Set(eligibleHand)]) {
    for (const graveyardCardId of [...new Set(player.zones.graveyard)]) {
      options.push({
        label: `Soul for Soul: exchange ${handCardId} with ${graveyardCardId}`,
        action: {
          type: 'play_action_card',
          playerId,
          cardId: 'mystics-soul-for-soul',
          targets: [
            { kind: 'card', owner: playerId, cardId: handCardId },
            { kind: 'card', owner: playerId, cardId: graveyardCardId },
          ],
        },
      });
    }
  }
  return options;
}

function pathsOfShadowActionOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  if (!actionWindowOpen(game, playerId)) return [];
  const player = game.players[playerId];
  if (!player.zones.hand.includes('mystics-paths-of-shadow')) return [];
  return game.board.spaces
    .filter((space) => (
      space.kind === 'territory'
      && space.controller === playerId
      && !space.occupant
      && space.id !== player.occupiedSpaceId
    ))
    .map((space) => ({
      label: `Paths of Shadow: move to ${space.id}`,
      action: {
        type: 'play_action_card' as const,
        playerId,
        cardId: 'mystics-paths-of-shadow',
        targets: [{ kind: 'space' as const, spaceId: space.id }],
      },
    }));
}

function spiritHollowActionOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  if (!actionWindowOpen(game, playerId)) return [];
  if (!game.players[playerId].zones.hand.includes('mystics-spirit-hollow')) return [];
  return spiritHollowActionTargets(game, playerId).map((spaceId) => ({
    label: `Spirit Hollow: place on ${spaceId}`,
    action: {
      type: 'play_action_card' as const,
      playerId,
      cardId: 'mystics-spirit-hollow',
      targets: [{ kind: 'space' as const, spaceId }],
    },
  }));
}

function circleOfBonesActionOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  if (!actionWindowOpen(game, playerId)) return [];
  if (!game.players[playerId].zones.hand.includes('mystics-circle-of-bones')) return [];
  return circleOfBonesActionTargets(game, playerId).map((spaceId) => ({
    label: `Circle of Bones: place on ${spaceId}`,
    action: {
      type: 'play_action_card' as const,
      playerId,
      cardId: 'mystics-circle-of-bones',
      targets: [{ kind: 'space' as const, spaceId }],
    },
  }));
}

export function buildMysticRiteOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  const options: MysticGuidedOption[] = [
    ...transmutationOptions(game, playerId),
    ...soulForSoulActionOptions(game, playerId),
    ...pathsOfShadowActionOptions(game, playerId),
    ...spiritHollowActionOptions(game, playerId),
    ...circleOfBonesActionOptions(game, playerId),
  ];
  if (!riteWindowOpen(game, playerId)) return options;
  const player = game.players[playerId];
  const completed = new Set(player.mystics!.completedRites);

  if (!completed.has('rite_of_echoes')) {
    for (const graveyardCardId of player.zones.graveyard) {
      for (const handCardId of player.zones.hand) {
        if (!duplicateTitleInDeck(game, playerId, handCardId)) continue;
        options.push({
          label: `Begin Rite of Echoes: bind ${graveyardCardId} face up and ${handCardId} face down`,
          action: {
            type: 'begin_mystic_rite',
            playerId,
            riteId: 'rite_of_echoes',
            cardId: graveyardCardId,
            secondaryCardId: handCardId,
          },
        });
      }
    }
  }

  if (!completed.has('rite_of_blood')) {
    for (const cardId of player.zones.hand) {
      options.push({
        label: `Begin Rite of Blood by sacrificing ${cardId}`,
        action: {
          type: 'begin_mystic_rite',
          playerId,
          riteId: 'rite_of_blood',
          cardId,
        },
      });
    }
  }

  if (!completed.has('rite_of_crossing') && canBeginRiteOfCrossing(game, playerId)) {
    const arcaneHandCards = player.zones.hand.filter(isArcaneCard);
    if (arcaneHandCards.length > 0) {
      for (const cardId of arcaneHandCards) {
        options.push({
          label: `Begin Rite of Crossing with ${cardId} from hand`,
          action: {
            type: 'begin_mystic_rite',
            playerId,
            riteId: 'rite_of_crossing',
            cardId,
            source: 'hand',
          },
        });
      }
    } else {
      for (const cardId of player.zones.discard.filter(isArcaneCard)) {
        options.push({
          label: `Reveal hand and begin Rite of Crossing with ${cardId} from discard`,
          action: {
            type: 'begin_mystic_rite',
            playerId,
            riteId: 'rite_of_crossing',
            cardId,
            source: 'discard',
          },
        });
      }
    }
  }

  return options;
}

export function buildPendingMysticsOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] | undefined {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  if (pending.kind === 'guardians_of_the_circle') {
    return [
      {
        label: `Allow ${pending.riteId} to be interrupted`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
      },
      ...pending.arcaneCardOptions.map((cardId) => ({
        label: `Sacrifice ${cardId} to preserve ${pending.riteId}`,
        action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'use', cardId },
      })),
    ];
  }
  if (pending.kind === 'invocation') {
    return [
      {
        label: 'Pass Invocation',
        action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
      },
      ...pending.graveyardOptions.map((cardId) => ({
        label: `Invoke ${cardId} to the Discard Pile`,
        action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'use', cardId },
      })),
    ];
  }
  if (pending.kind === 'dark_omens_action') {
    return pending.drawnCardIds.map((cardId) => ({
      label: `Put ${cardId} in your Graveyard with Dark Omens`,
      action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'select', cardId },
    }));
  }
  if (pending.kind === 'dark_omens_battle') {
    return [
      {
        label: `Keep ${pending.drawnCardId}`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'keep' },
      },
      {
        label: `Put ${pending.drawnCardId} in your Graveyard to gain advantage`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'sacrifice', cardId: pending.drawnCardId },
      },
    ];
  }
  if (pending.kind === 'accursed_wager_after_battle') {
    return pending.handOptions.map((cardId) => ({
      label: `Put ${cardId} in your Graveyard for Accursed Wager${pending.remaining > 1 ? ` (${pending.remaining} remaining)` : ''}`,
      action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'select', cardId },
    }));
  }
  if (pending.kind === 'fates_toll_reroll') {
    return [
      {
        label: `Keep the ${pending.oldRoll}`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
      },
      ...pending.handOptions.map((cardId) => ({
        label: `Put ${cardId} in your Graveyard to reroll`,
        action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'use', cardId },
      })),
    ];
  }
  if (pending.kind === 'grave_ward_asset') {
    return [
      {
        label: `Leave ${pending.cardId} in your Graveyard${pending.triggersRemaining > 1 ? ` (${pending.triggersRemaining} Grave Wards available)` : ''}`,
        action: {
          type: 'use_mystic_grave_ward_asset',
          playerId,
          choice: 'pass',
          entryId: pending.entryId,
        },
      },
      {
        label: `Discard Grave Ward to move ${pending.cardId} to your Discard Pile`,
        action: {
          type: 'use_mystic_grave_ward_asset',
          playerId,
          choice: 'use',
          entryId: pending.entryId,
        },
      },
    ];
  }
  if (pending.kind === 'grave_ward_battle') {
    return pending.handOptions.map((cardId) => ({
      label: `Move ${cardId} from your Graveyard to your Discard Pile with Grave Ward`,
      action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'select', cardId },
    }));
  }
  if (pending.kind === 'soul_for_soul_battle') {
    const options: MysticGuidedOption[] = [{
      label: 'Pass Soul for Soul',
      action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
    }];
    for (const handCardId of pending.handOptions) {
      for (const graveyardCardId of pending.graveyardOptions) {
        options.push({
          label: `Exchange ${handCardId} with ${graveyardCardId}`,
          action: {
            type: 'resolve_mystics_choice',
            playerId,
            choice: 'exchange',
            cardId: handCardId,
            secondaryCardId: graveyardCardId,
          },
        });
      }
    }
    return options;
  }
  if (pending.kind === 'paths_of_shadow_battle') {
    return [
      {
        label: `Retreat normally${pending.normalRetreatSpaceId ? ` to ${pending.normalRetreatSpaceId}` : ''}`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
      },
      ...pending.spaceOptions.map((spaceId) => ({
        label: `Use Paths of Shadow to move to ${spaceId}`,
        action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'move', spaceId },
      })),
    ];
  }
  if (pending.kind === 'spirit_hollow_after_cleanup') {
    const options: MysticGuidedOption[] = [{
      label: 'Pass Spirit Hollow',
      action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
    }];
    for (const handCardId of pending.handOptions) {
      options.push({
        label: `Put ${handCardId} in your Graveyard with Spirit Hollow`,
        action: { type: 'resolve_mystics_choice', playerId, choice: 'use', cardId: handCardId },
      });
      for (const graveyardCardId of pending.graveyardOptions) {
        options.push({
          label: `Put ${handCardId} in your Graveyard and recover ${graveyardCardId} with Spirit Hollow`,
          action: {
            type: 'resolve_mystics_choice',
            playerId,
            choice: 'use',
            cardId: handCardId,
            secondaryCardId: graveyardCardId,
          },
        });
      }
    }
    return options;
  }
  if (pending.kind === 'circle_of_bones_reroll') {
    const options: MysticGuidedOption[] = [{
      label: 'Pass Circle of Bones',
      action: { type: 'resolve_mystics_choice', playerId, choice: 'pass' },
    }];
    for (const cardId of pending.handOptions) {
      for (const targetPlayerId of pending.targetPlayerOptions) {
        options.push({
          label: `Put ${cardId} in your Graveyard and make ${game.players[targetPlayerId].name} reroll`,
          action: {
            type: 'resolve_mystics_choice',
            playerId,
            choice: 'use',
            cardId,
            targetPlayerId,
          },
        });
      }
    }
    return options;
  }
  if (pending.kind === 'necromancy_action') {
    return [
      {
        label: 'Place Necromancy beneath your Draw Pile, then draw one card',
        action: { type: 'resolve_mystics_choice', playerId, choice: 'bury' },
      },
      ...selectionsUpTo(pending.graveyardOptions, 3).map((cardIds) => ({
        label: cardIds.length === 0
          ? 'Sacrifice your remaining hand and return no cards with Necromancy'
          : `Sacrifice your remaining hand and return ${cardIds.join(', ')}`,
        action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'recover', cardIds },
      })),
    ];
  }
  if (pending.kind === 'necromancy_battle') {
    return selectionsUpTo(pending.graveyardOptions, 3).map((cardIds) => ({
      label: cardIds.length === 0
        ? 'Resolve Necromancy and return no cards'
        : `Resolve Necromancy and return ${cardIds.join(', ')}`,
      action: { type: 'resolve_mystics_choice' as const, playerId, choice: 'resolve', cardIds },
    }));
  }
  return undefined;
}
