import type { CardID, GameState, PlayerID } from '../types';
import type { NeutralAppStateAction } from '../state';

export interface NeutralGuidedOption {
  label: string;
  action: NeutralAppStateAction;
}

function selectionsOfSize(cards: CardID[], size: number): CardID[][] {
  const selections: CardID[][] = [];
  const visit = (start: number, chosen: CardID[]) => {
    if (chosen.length === size) {
      selections.push([...chosen]);
      return;
    }
    for (let index = start; index < cards.length; index += 1) {
      visit(index + 1, [...chosen, cards[index]]);
    }
  };
  visit(0, []);
  const seen = new Set<string>();
  return selections.filter((selection) => {
    const key = JSON.stringify([...selection].sort());
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPendingNeutralOptions(
  game: GameState,
  playerId: PlayerID,
): NeutralGuidedOption[] | undefined {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.playerId !== playerId) return undefined;

  if (pending.kind === 'redemption_asset') {
    return [
      {
        label: 'Pass Redemption',
        action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
      },
      ...pending.cardOptions.map((cardId) => ({
        label: `Discard Redemption and return ${cardId} to hand`,
        action: { type: 'resolve_neutral_choice' as const, playerId, choice: 'use' as const, cardId },
      })),
    ];
  }

  if (pending.kind === 'redemption_battle') {
    return selectionsOfSize(pending.cardOptions, pending.selectCount).map((cardIds) => ({
      label: `Protect ${cardIds.join(', ')} with Redemption`,
      action: {
        type: 'resolve_neutral_choice' as const,
        playerId,
        choice: 'select_cards' as const,
        cardIds,
      },
    }));
  }

  if (pending.kind === 'reserves_action') {
    return pending.cardOptions.map((cardId) => ({
      label: `Put ${cardId} on top of your Draw Pile with Reserves`,
      action: {
        type: 'resolve_neutral_choice' as const,
        playerId,
        choice: 'select_card' as const,
        cardId,
      },
    }));
  }

  return [
    {
      label: 'Preserve no Battle Hand card with Reserves',
      action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
    },
    ...pending.cardOptions.map((cardId) => ({
      label: `Put ${cardId} on top of your Draw Pile with Reserves`,
      action: {
        type: 'resolve_neutral_choice' as const,
        playerId,
        choice: 'use' as const,
        cardId,
      },
    })),
  ];
}
