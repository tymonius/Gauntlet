import type { BattleCardTarget } from '../effects/v06';
import {
  activeBattleCancellationCards,
  activePlayedCards,
} from '../effects/embargo';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import type { StateAction } from '../state/v06';

export interface BattleRevealGuidedOption {
  label: string;
  action: StateAction;
}

function uniqueAssignments(assignments: BattleCardTarget[][]): BattleCardTarget[][] {
  return [...new Map(assignments.map((assignment) => [JSON.stringify(assignment), assignment])).values()];
}

function removePhysicalCard(cards: BattlePlayedCard[], selected: BattlePlayedCard): BattlePlayedCard[] {
  const index = cards.indexOf(selected);
  if (index < 0) return cards;
  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}

function targetAssignments(
  source: BattleParticipantState,
  opponent: BattleParticipantState,
): BattleCardTarget[][] {
  const sources = activeBattleCancellationCards(source);
  const targets = activePlayedCards(opponent);
  const targetCount = Math.min(sources.length, targets.length);
  if (targetCount === 0) return [[]];

  function build(
    sourceIndex: number,
    remainingTargets: BattlePlayedCard[],
    selected: BattleCardTarget[],
  ): BattleCardTarget[][] {
    if (sourceIndex >= targetCount) return [selected];
    const decoys = remainingTargets.filter((card) => card.cardId === 'neutral-decoys');
    const eligible = decoys.length > 0 ? decoys : remainingTargets;
    const sourceCard = sources[sourceIndex];
    return eligible.flatMap((target) => build(
      sourceIndex + 1,
      removePhysicalCard(remainingTargets, target),
      [...selected, {
        sourceCardId: sourceCard.cardId,
        sourceOwner: source.playerId,
        targetCardId: target.cardId,
        targetOwner: opponent.playerId,
      }],
    ));
  }

  return uniqueAssignments(build(0, targets, []));
}

function targetCombinations(game: GameState): BattleCardTarget[][] {
  const battle = game.battle;
  if (!battle) return [[]];
  const groups = [
    targetAssignments(battle.attacker, battle.defender),
    targetAssignments(battle.defender, battle.attacker),
  ];
  return uniqueAssignments(groups.reduce<BattleCardTarget[][]>((combinations, group) => (
    combinations.flatMap((combination) => group.map((targets) => [...combination, ...targets]))
  ), [[]]));
}

function sourceName(cardId: string): string {
  if (cardId === 'card-embargo') return 'Embargo';
  if (cardId === 'neutral-disruption') return 'Disruption';
  return cardId;
}

function targetLabel(targets: BattleCardTarget[]): string {
  if (targets.length === 0) return 'Resolve revealed Battle effects';
  return `Resolve revealed effects: ${targets.map((target) => (
    `${target.sourceOwner}'s ${sourceName(target.sourceCardId)} cancels ${target.targetOwner}'s ${target.targetCardId}`
  )).join('; ')}`;
}

export function buildBattleRevealOptions(game: GameState, playerId: PlayerID): BattleRevealGuidedOption[] {
  if (!game.battle || game.battle.stage !== 'dice' || game.battle.effectsResolved.includes('before_battle_resolution')) return [];
  if (playerId !== game.battle.attacker.playerId && playerId !== game.battle.defender.playerId) return [];
  return targetCombinations(game).map((battleCardTargets) => ({
    label: targetLabel(battleCardTargets),
    action: {
      type: 'resolve_battle_reveal',
      playerId,
      battleCardTargets: battleCardTargets.length > 0 ? battleCardTargets : undefined,
    },
  }));
}
