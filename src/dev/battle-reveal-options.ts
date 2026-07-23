import type { BattleCardTarget } from '../effects';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import type { StateAction } from '../state';

export interface BattleRevealGuidedOption {
  label: string;
  action: StateAction;
}

function activePlayedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled);
}

function hasEmbargo(participant: BattleParticipantState): boolean {
  return activePlayedCards(participant).some((card) => card.cardId === 'card-embargo');
}

function targetOptions(source: BattleParticipantState, opponent: BattleParticipantState): BattleCardTarget[] {
  if (!hasEmbargo(source)) return [];
  return activePlayedCards(opponent).map((target) => ({
    sourceCardId: 'card-embargo',
    sourceOwner: source.playerId,
    targetCardId: target.cardId,
    targetOwner: opponent.playerId,
  }));
}

function targetCombinations(game: GameState): BattleCardTarget[][] {
  const battle = game.battle;
  if (!battle) return [[]];
  const groups = [
    targetOptions(battle.attacker, battle.defender),
    targetOptions(battle.defender, battle.attacker),
  ].filter((group) => group.length > 0);
  if (groups.length === 0) return [[]];
  return groups.reduce<BattleCardTarget[][]>((combinations, group) => (
    combinations.flatMap((combination) => group.map((target) => [...combination, target]))
  ), [[]]);
}

function targetLabel(targets: BattleCardTarget[]): string {
  if (targets.length === 0) return 'Resolve revealed Battle effects';
  return `Resolve revealed effects: ${targets.map((target) => `${target.sourceOwner}'s Embargo cancels ${target.targetOwner}'s ${target.targetCardId}`).join('; ')}`;
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
