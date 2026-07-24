import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state/actions';
import { availableBattleHandCards } from '../state/battle-hand-restrictions';
import { isSubversionAssetChoice } from '../state/intelligence-subversion-asset';

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
  if (isSubversionAssetChoice(pending)) {
    return [
      action(`Allow ${pending.effectLabel} to resolve`, 'pass'),
      action(`Use Subversion to negate ${pending.effectLabel}`, 'use'),
    ];
  }
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
  if (pending.kind === 'spies_battle_reselect') {
    return [
      action('Keep the current Battle Hand selection', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Replace the selected card with ${cardId}`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'fog_of_war_return') {
    return [
      action(`Return hand commitment ${pending.handCardId}`, 'return_hand'),
      ...pending.battleHandCardIds.map((cardId) => action(`Return selected Battle Hand card ${cardId}`, 'return_battle_hand', cardId)),
    ];
  }
  if (pending.kind === 'intercepted_orders_battle_select') {
    return [
      ...pending.selectedCardIds.map((cardId) => action(`Prohibit selected ${cardId}`, 'select_selected', cardId)),
      ...pending.unselectedCardIds.map((cardId) => action(`Prohibit unselected ${cardId}`, 'select_unselected', cardId)),
    ];
  }
  if (pending.kind === 'intercepted_orders_battle_replacement') {
    return [
      action('Use no replacement Battle Hand card', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Choose replacement ${cardId}`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'reconnaissance_battle_withdraw') {
    return pending.canWithdraw
      ? [action('Remain in the battle', 'stay'), action('Withdraw and end the battle without a winner', 'withdraw')]
      : [action('Remain in the battle', 'stay')];
  }
  if (pending.kind === 'exfiltration_battle_withdraw') {
    return [
      action('Do not retreat farther with this Exfiltration', 'pass'),
      action('Retreat one additional position with Exfiltration', 'withdraw'),
    ];
  }
  if (pending.kind === 'operational_reassessment_battle') {
    return [
      action('Keep Operational Reassessment in the battle', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Replace Operational Reassessment with ${cardId}`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'treason_battle_target') {
    return [
      ...(pending.sourceKind === 'asset' ? [action('Keep banked Treason', 'pass')] : []),
      ...pending.targetOptions.map((target) => action(
        `Negate and copy ${target.cardId} (${target.targetOrigin})`,
        target.targetKey,
      )),
    ];
  }
  if (pending.kind === 'treason_reconnaissance_withdraw') {
    return pending.canWithdraw
      ? [action('Remain in the battle', 'stay'), action('Withdraw using copied Reconnaissance', 'withdraw')]
      : [action('Remain in the battle', 'stay')];
  }
  if (pending.kind === 'sleeper_network_initial_card') {
    return pending.eligibleCardIds.map((cardId) => action(`Place ${cardId} beneath Sleeper Network`, 'select', cardId));
  }
  if (pending.kind === 'sleeper_network_add_card') {
    return [
      action('Add no card to Sleeper Network', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Place ${cardId} beneath Sleeper Network`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'sleeper_network_capacity') {
    return pending.cardOptions.map((cardId) => action(`Discard hidden ${cardId} to restore capacity`, 'select', cardId));
  }
  if (pending.kind === 'sleeper_network_activate') {
    return [
      action('Keep Sleeper Network banked', 'pass'),
      action('Activate Sleeper Network', 'activate'),
    ];
  }
  if (pending.kind === 'sleeper_network_play_card') {
    return [
      action('Finish Sleeper Network activation', 'finish'),
      ...pending.eligibleCardIds.map((cardId) => action(`Play ${cardId} from Sleeper Network`, 'select', cardId)),
    ];
  }
  if (pending.kind === 'sleeper_network_compromised') {
    return [
      action('Play no card from the compromised Network', 'pass'),
      ...pending.eligibleCardIds.map((cardId) => action(`Play ${cardId} before the Network leaves play`, 'select', cardId)),
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
