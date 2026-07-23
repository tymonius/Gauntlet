import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state/actions';
import { availableBattleHandCards } from '../state/battle-hand-restrictions';

export interface IntelligenceBattleGuidedOption {
  label: string;
  action: AppStateAction;
}

function replacementOptions(game: GameState, playerId: PlayerID, eligibleCardIds: string[]): string[] {
  const battle = game.battle;
  if (!battle) return [];
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  const available = new Set(availableBattleHandCards(battle, participant));
  return eligibleCardIds.filter((cardId) => available.has(cardId));
}

export function buildIntelligenceBattleOptions(game: GameState, playerId: PlayerID): IntelligenceBattleGuidedOption[] | undefined {
  const pending = game.pendingIntelligenceChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  const action = (label: string, choice: string, cardId?: string): IntelligenceBattleGuidedOption => ({
    label,
    action: { type: 'resolve_intelligence_choice', playerId, choice, cardId },
  });
  if (pending.kind === 'surveillance') {
    return [
      action('Pass Surveillance', 'pass'),
      action('Spend 1 Intel to use Surveillance', 'surveil'),
    ];
  }
  if (pending.kind === 'interference') {
    return [
      action(`Keep inspected ${pending.targetCardId} in the battle`, 'pass'),
      action(`Spend 2 Intel to Interfere with ${pending.targetCardId}`, 'interfere'),
    ];
  }
  if (pending.kind === 'interference_replacement') {
    const eligible = pending.source === 'battle_draw'
      ? replacementOptions(game, pending.playerId, pending.eligibleCardIds)
      : pending.eligibleCardIds;
    return [
      action('Choose no replacement card', 'pass'),
      ...eligible.map((cardId) => action(`Choose replacement ${cardId}`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'operational_reassessment_battle') {
  return [
    action('Keep Operational Reassessment in the battle', 'pass'),
    ...pending.eligibleCardIds.map((cardId) => action(`Replace Operational Reassessment with ${cardId}`, 'select', cardId)),
  ];
}
  if (pending.kind === 'mission_control') {
    return [
      action('Pass Mission Control', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Start ${cardId} with Mission Control`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'fieldcraft') {
    return [
      action('Allow the Territory effect', 'pass'),
      action(`Spend 1 Intel to ignore ${pending.effectId}`, 'ignore'),
    ];
  }
  if (pending.kind === 'spies_discard') {
    return pending.handOptions.map((cardId) => action(`Discard ${cardId} for Spies`, 'select', cardId));
  }
  if (pending.kind === 'assassins_discard') {
    return pending.opponentHandOptions.map((cardId) => action(`Discard opposing ${cardId} with Assassins`, 'select', cardId));
  }
  if (pending.kind === 'operational_reassessment') {
    return pending.eligibleCardIds.map((cardId) => action(`Start ${cardId} as the reassessed Mission`, 'select', cardId));
  }
  if (pending.kind === 'exfiltration') {
    return [action('Pass Exfiltration', 'pass'), action('Discard Exfiltration and withdraw', 'use')];
  }
  if (pending.kind === 'reconnaissance') {
    return [action('Pass Reconnaissance', 'pass'), action('Discard Reconnaissance and inspect the opposing hand', 'use')];
  }
  if (pending.kind === 'reconnaissance_withdraw') {
    return [action('Remain in the battle', 'stay'), action('Withdraw before hand commitments', 'withdraw')];
  }
  if (pending.kind === 'intercepted_orders') {
    return [action('Pass Intercepted Orders', 'pass'), action('Discard Intercepted Orders and inspect the Battle Hand', 'use')];
  }
  if (pending.kind === 'intercepted_orders_select') {
    return pending.battleHandOptions.map((cardId) => action(`Prohibit ${cardId} from being chosen`, 'select', cardId));
  }
  return [action('Allow the Mission to fail', 'pass'), action('Put Deep Cover in the Graveyard and save the Mission', 'use')];
}
