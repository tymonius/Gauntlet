import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './battle-engine-reveal-order-pre-witchcraft';
import {
  resumeV070SupportedRevealEffects,
  v070BattleRevealEffectsPending,
} from './battle-effects';
import {
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { pendingV070BattleRevealEffectOrderChoice } from './battle-reveal-order';
import { v070MysticInvocationPendingPlayers } from './mystics';
import { openV070DivineMercyBattleChoice } from './divine-mercy-battle';
import { openV070DarkOmensBattleChoice } from './dark-omens-battle';
import { openV070SeditionBattleChoice } from './sedition-battle';
import { openV070RequisitionBattleChoice } from './requisition-battle';
import { openV070TariffsBattleChoice } from './tariffs-battle';
import { openV070PenanceBattleChoice } from './penance-battle';
import { openV070PropertyDuesBattleChoice } from './property-dues-battle';
import { openV070SpeculationBattleChoice } from './speculation-battle';
import { openV070PalisadeWallBattleChoice } from './palisade-wall-battle';
import { openV070AssassinsBattleChoice } from './assassins-battle';
import { openV070CapitalPunishmentBattleChoice } from './capital-punishment-battle';
import { openV070CounterworksBattleChoice } from './counterworks-battle';
import { openV070DisruptionBattleChoice } from './disruption-battle';
import { openV070BattleNegationChoice } from './battle-negation';
import { resolveV070WitchcraftBattleChoice } from './witchcraft-battle';

export * from './battle-engine-reveal-order-pre-witchcraft';

export type V070BattleAction =
  | previous.V070BattleAction
  | {
      type: 'resolve_witchcraft_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind === 'witchcraft' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_witchcraft_battle') {
      throw new V070GameActionError(
        'Choose the battle effect Witchcraft repeats before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070WitchcraftBattleChoice(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    continueV070BattleRevealProcedure(next);
    return next;
  }

  if (action.type === 'resolve_witchcraft_battle') {
    throw new V070GameActionError('There is no open Witchcraft battle-effect choice.');
  }

  return previous.reduceV070BattleAction(
    state,
    action as previous.V070BattleAction,
  );
}

function continueV070BattleRevealProcedure(state: V070GameState): boolean {
  while (true) {
    if (v070MysticInvocationPendingPlayers(state).length > 0
      || pendingV070BattleRevealEffectOrderChoice(state)) {
      return true;
    }

    const pending = pendingV070BattleRevealChoice(state);
    if (pending) {
      if (isV070BattleRevealChoiceOpen(state)) return true;

      let opened = false;
      switch (pending.kind) {
        case 'divine_mercy': opened = openV070DivineMercyBattleChoice(state); break;
        case 'dark_omens': opened = openV070DarkOmensBattleChoice(state); break;
        case 'sedition': opened = openV070SeditionBattleChoice(state); break;
        case 'requisition': opened = openV070RequisitionBattleChoice(state); break;
        case 'tariffs': opened = openV070TariffsBattleChoice(state); break;
        case 'penance': opened = openV070PenanceBattleChoice(state); break;
        case 'property_dues': opened = openV070PropertyDuesBattleChoice(state); break;
        case 'speculation': opened = openV070SpeculationBattleChoice(state); break;
        case 'palisade_wall': opened = openV070PalisadeWallBattleChoice(state); break;
        case 'assassins': opened = openV070AssassinsBattleChoice(state); break;
        case 'capital_punishment': opened = openV070CapitalPunishmentBattleChoice(state); break;
        case 'counterworks': opened = openV070CounterworksBattleChoice(state); break;
        case 'disruption': opened = openV070DisruptionBattleChoice(state); break;
        case 'battle_negation': opened = openV070BattleNegationChoice(state); break;
        case 'witchcraft': return true;
      }
      if (opened) return true;
      continue;
    }

    if (v070BattleRevealEffectsPending(state)) {
      resumeV070SupportedRevealEffects(state);
      continue;
    }

    return false;
  }
}
