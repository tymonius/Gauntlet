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

  switch (pending.kind) {
    case 'redemption_asset':
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

    case 'redemption_battle':
      return selectionsOfSize(pending.cardOptions, pending.selectCount).map((cardIds) => ({
        label: `Protect ${cardIds.join(', ')} with Redemption`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'select_cards' as const,
          cardIds,
        },
      }));

    case 'reserves_action':
      return pending.cardOptions.map((cardId) => ({
        label: `Put ${cardId} on top of your Draw Pile with Reserves`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'select_card' as const,
          cardId,
        },
      }));

    case 'reserves_battle':
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

    case 'scouting_report_action':
      return [
        {
          label: 'Inspect the top card of your Draw Pile',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'inspect_own_draw' },
        },
        {
          label: "Inspect the top card of your opponent's Draw Pile",
          action: { type: 'resolve_neutral_choice', playerId, choice: 'inspect_opponent_draw' },
        },
        {
          label: "Inspect one random card from your opponent's hand",
          action: { type: 'resolve_neutral_choice', playerId, choice: 'inspect_opponent_hand' },
        },
      ];

    case 'scouting_report_battle_inspect':
      return pending.targetOptions.map((target, index) => ({
        label: `Inspect opposing ${target.targetSource === 'hand' ? 'hand commitment' : `Battle Hand card ${index + 1}`}`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'inspect' as const,
          targetKey: target.targetKey,
        },
      }));

    case 'scouting_report_battle_replace':
      return [
        {
          label: 'Keep Scouting Report in the battle',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        ...pending.replacementOptions.map((cardId) => ({
          label: `Replace Scouting Report with ${cardId}`,
          action: {
            type: 'resolve_neutral_choice' as const,
            playerId,
            choice: 'replace' as const,
            cardId,
          },
        })),
      ];
  }
}
