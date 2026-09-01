import { getCardPlayRule } from '../cards';
import type { CardID, GameState, PlayerID } from '../types/v06';
import type { NeutralAppStateAction } from '../state/v06';

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
    case 'decoys_asset':
      return [
        {
          label: 'Do not use this Decoys copy',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        ...pending.assetOptions.map((asset) => ({
          label: `Discard Decoys instead of ${asset.cardId}`,
          action: {
            type: 'resolve_neutral_choice' as const,
            playerId,
            choice: 'use' as const,
            targetKey: asset.exitId,
          },
        })),
      ];

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

    case 'reinforcements_battle':
      return [
        {
          label: `Keep ${pending.drawnCardId} in the Battle Hand`,
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        ...(pending.canPlay ? [{
          label: `Reveal ${pending.drawnCardId} with Reinforcements`,
          action: { type: 'resolve_neutral_choice' as const, playerId, choice: 'use' as const },
        }] : []),
      ];

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

    case 'tactical_planning_action':
      return pending.cardOptions.map((cardId) => ({
        label: `Put ${cardId} on the bottom of your Draw Pile with Tactical Planning`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'select_card' as const,
          cardId,
        },
      }));

    case 'contraband_battle':
      return pending.cardOptions.map((cardId) => ({
        label: `Replace Contraband with ${cardId} from your Discard Pile`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'select_card' as const,
          cardId,
        },
      }));


    case 'court_martial_asset':
      return [
        {
          label: 'Do not use any Court Martial Asset',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        {
          label: 'Discard Court Martial and force one additional retreat',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'use' },
        },
      ];

    case 'court_martial_retreat':
      return [
        {
          label: 'Allow the additional retreat',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        {
          label: 'Discard Stand Ground and prevent this additional retreat',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'use' },
        },
      ];

    case 'counterworks_asset':
      return [
        {
          label: `Allow ${pending.overlayCardId} to become an Overlay`,
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        {
          label: `Discard Counterworks and prevent ${pending.overlayCardId}`,
          action: { type: 'resolve_neutral_choice', playerId, choice: 'use' },
        },
      ];

    case 'counterworks_battle':
      return [
        {
          label: 'Prevent the next opposing Overlay during this battle or cleanup',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'prevent_overlay' },
        },
        ...pending.overlayOptions.map((overlay) => ({
          label: `Make ${overlay.cardId} inactive during this battle`,
          action: {
            type: 'resolve_neutral_choice' as const,
            playerId,
            choice: 'deactivate_overlay' as const,
            targetKey: overlay.targetKey,
          },
        })),
      ];

    case 'conscription_action':
      return [
        {
          label: 'Play no Asset with Conscription',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        ...pending.cardOptions
          .filter((cardId) => !(getCardPlayRule(cardId)?.requiresTarget ?? false))
          .map((cardId) => ({
            label: `Immediately play ${cardId} as an Asset with Conscription`,
            action: {
              type: 'play_action_card' as const,
              playerId,
              cardId,
            },
          })),
      ];


    case 'fortifications_battle':
      return [
        {
          label: 'Do not withdraw farther with Fortifications',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        {
          label: 'Withdraw one additional position with Fortifications',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'use' },
        },
      ];

    case 'valor_battle':
      return [
        {
          label: 'Keep the current battle die with Valor',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        ...[1, 2, 3, 4, 5, 6].map((value) => ({
          label: `Reroll with Valor and use ${value}`,
          action: {
            type: 'resolve_neutral_choice' as const,
            playerId,
            choice: 'use' as const,
            value,
          },
        })),
      ];

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

    case 'supplies_asset':
      return [
        {
          label: 'Use no more banked Supplies this turn',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'pass' },
        },
        {
          label: 'Discard one banked Supplies and draw two cards',
          action: { type: 'resolve_neutral_choice', playerId, choice: 'use' },
        },
      ];

    case 'supplies_battle_discard':
      return pending.cardOptions.map((cardId) => ({
        label: `Discard ${cardId} after drawing with Supplies`,
        action: {
          type: 'resolve_neutral_choice' as const,
          playerId,
          choice: 'select_card' as const,
          cardId,
        },
      }));
  }
}
