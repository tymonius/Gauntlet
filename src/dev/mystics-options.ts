import { v06CanonicalContent } from '../content';
import type { CardID, GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state';
import { canBeginRiteOfCrossing, canUseTransmutation, isArcaneCard } from '../state';

export interface MysticGuidedOption {
  label: string;
  action: AppStateAction;
}

function riteWindowOpen(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  return Boolean(
    player?.factionId === 'mystics'
    && player.mystics
    && !player.mystics.begunRite
    && game.phase === 'action_after_movement'
    && game.activePlayer === playerId
    && game.priorityPlayer === playerId
    && player.actionsRemaining > 0
    && !player.hasPlayedActionThisTurn,
  );
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

export function buildMysticRiteOptions(game: GameState, playerId: PlayerID): MysticGuidedOption[] {
  const options: MysticGuidedOption[] = [...transmutationOptions(game, playerId)];
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
  return undefined;
}
