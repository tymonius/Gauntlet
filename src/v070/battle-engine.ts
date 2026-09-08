import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070BattleAction as reduceV070BattleActionRevealOrder,
  type V070BattleAction as V070RevealOrderBattleAction,
} from './battle-engine-reveal-order';
import {
  resumeV070SupportedRevealEffects,
  v070BattleRevealEffectsPending,
  v070BattleRoleSupportsPreReveal,
} from './battle-effects';
import { pendingV070BattleRevealEffectOrderChoice } from './battle-reveal-order';
import {
  isV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  captureV070InitialReserveSnapshots,
  settleV070DeferredBattleAftermathDestinations,
} from './battle-aftermath-deferred';
import {
  assertV070DisruptionBattleCardMayBeChosen,
  openV070DisruptionBattleChoice,
  resolveV070DisruptionBattleChoice,
} from './disruption-battle';
import { openV070AssassinsBattleChoice } from './assassins-battle';
import { openV070CapitalPunishmentBattleChoice } from './capital-punishment-battle';
import { openV070DarkOmensBattleChoice } from './dark-omens-battle';
import { openV070DivineMercyBattleChoice } from './divine-mercy-battle';
import { openV070PalisadeWallBattleChoice } from './palisade-wall-battle';
import { openV070PenanceBattleChoice } from './penance-battle';
import { openV070PropertyDuesBattleChoice } from './property-dues-battle';
import { openV070RequisitionBattleChoice } from './requisition-battle';
import { openV070SeditionBattleChoice } from './sedition-battle';
import { openV070SpeculationBattleChoice } from './speculation-battle';
import { openV070TariffsBattleChoice } from './tariffs-battle';
import { v070MysticInvocationPendingPlayers } from './mystics';
import {
  advanceV070CounterworksPreReveal,
  beginV070CounterworksPreReveal,
  finishV070CounterworksPreReveal,
  hasV070CounterworksPreRevealSource,
  pendingV070CounterworksPreRevealChoice,
  resolveV070CounterworksPreRevealAction,
  type V070CounterworksPreRevealAction,
} from './counterworks-battle';

export * from './battle-engine-reveal-order';

export type V070BattleAction =
  | V070RevealOrderBattleAction
  | V070CounterworksPreRevealAction
  | {
      type: 'resolve_disruption_battle';
      playerId: PlayerId;
      targetInstanceId: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const counterworksPending = pendingV070CounterworksPreRevealChoice(state);
  if (counterworksPending) {
    if (!isCounterworksPreRevealAction(action)) {
      throw new V070GameActionError(
        'Resolve the pending Counterworks pre-reveal choice before continuing the battle.',
      );
    }
    const staged = structuredClone(state) as V070GameState;
    resolveV070CounterworksPreRevealAction(staged, action);
    advanceV070CounterworksPreReveal(staged);
    if (pendingV070CounterworksPreRevealChoice(staged)) {
      finalizeOuterBattleTransition(state, staged);
      return staged;
    }

    const role = finishV070CounterworksPreReveal(staged);
    const battle = staged.battle;
    if (!battle) {
      throw new V070GameActionError(
        'Counterworks pre-reveal resolution lost the active battle.',
      );
    }
    const next = reduceV070BattleActionRevealOrder(staged, {
      type: role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics',
      playerId: battle.attacker,
    });
    finalizeOuterBattleTransition(state, next);
    return next;
  }

  if (isCounterworksPreRevealAction(action)) {
    throw new V070GameActionError(
      'There is no open Counterworks pre-reveal choice.',
    );
  }

  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind === 'disruption' && isV070BattleRevealChoiceOpen(state)) {
    if (action.type !== 'resolve_disruption_battle') {
      throw new V070GameActionError(
        'Resolve the pending Disruption battle-card choice before continuing the battle.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070DisruptionBattleChoice(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    continueV070BattleRevealProcedure(next);
    finalizeOuterBattleTransition(state, next);
    return next;
  }

  if (action.type === 'resolve_disruption_battle') {
    throw new V070GameActionError('There is no open Disruption battle choice.');
  }

  if (action.type === 'set_gambit' || action.type === 'choose_tactic') {
    assertV070DisruptionBattleCardMayBeChosen(state, action.cardInstanceId);
  }

  const revealRole = action.type === 'reveal_gambits'
    ? 'gambit'
    : action.type === 'reveal_tactics'
      ? 'tactic'
      : null;
  if (revealRole
    && hasV070CounterworksPreRevealSource(state, revealRole)
    && v070BattleRoleSupportsPreReveal(state, revealRole)) {
    const staged = structuredClone(state) as V070GameState;
    beginV070CounterworksPreReveal(
      staged,
      action.playerId,
      revealRole,
    );
    advanceV070CounterworksPreReveal(staged);
    if (pendingV070CounterworksPreRevealChoice(staged)) {
      finalizeOuterBattleTransition(state, staged);
      return staged;
    }
    finishV070CounterworksPreReveal(staged);
    const next = reduceV070BattleActionRevealOrder(
      staged,
      action as V070RevealOrderBattleAction,
    );
    finalizeOuterBattleTransition(state, next);
    return next;
  }

  const next = reduceV070BattleActionRevealOrder(
    state,
    action as V070RevealOrderBattleAction,
  );
  finalizeOuterBattleTransition(state, next);
  return next;
}

function isCounterworksPreRevealAction(
  action: V070BattleAction,
): action is V070CounterworksPreRevealAction {
  return action.type === 'choose_counterworks_source'
    || action.type === 'choose_counterworks_target'
    || action.type === 'choose_counterintelligence_pre_reveal'
    || action.type === 'resolve_counterworks_replacement';
}

function finalizeOuterBattleTransition(
  previousState: V070GameState,
  state: V070GameState,
): void {
  // The core reveal procedure advances its ordinary stage after returning
  // from reveal-effect resolution. Armistice instead ended the battle by late
  // withdrawal, so preserve its Aftermath stage at the outer facade.
  if (state.battleRuntime?.armisticeWithdrawalResolved) {
    state.battleRuntime.stage = 'aftermath';
  }

  // Reserve formation happens inside the inner battle engine after the second
  // Gambit is set. Snapshot it at the first outer boundary after formation so
  // later reveal additions, redraws, and Tactic choices cannot rewrite what a
  // card means by the player's "initial Reserve."
  captureV070InitialReserveSnapshots(state);

  // Conditional Aftermath destinations settle here while an ordinary battle
  // still has its runtime, or reconcile from persistent zones if core already
  // completed the Aftermath (for example after an immediate Last Stand win).
  settleV070DeferredBattleAftermathDestinations(previousState, state);
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
        case 'divine_mercy':
          opened = openV070DivineMercyBattleChoice(state);
          break;
        case 'dark_omens':
          opened = openV070DarkOmensBattleChoice(state);
          break;
        case 'sedition':
          opened = openV070SeditionBattleChoice(state);
          break;
        case 'requisition':
          opened = openV070RequisitionBattleChoice(state);
          break;
        case 'tariffs':
          opened = openV070TariffsBattleChoice(state);
          break;
        case 'penance':
          opened = openV070PenanceBattleChoice(state);
          break;
        case 'property_dues':
          opened = openV070PropertyDuesBattleChoice(state);
          break;
        case 'speculation':
          opened = openV070SpeculationBattleChoice(state);
          break;
        case 'palisade_wall':
          opened = openV070PalisadeWallBattleChoice(state);
          break;
        case 'assassins':
          opened = openV070AssassinsBattleChoice(state);
          break;
        case 'capital_punishment':
          opened = openV070CapitalPunishmentBattleChoice(state);
          break;
        case 'disruption':
          opened = openV070DisruptionBattleChoice(state);
          break;
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
