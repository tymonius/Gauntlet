import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  V070_NORMAL_BATTLE_DICE,
  cardEligibleForV070BattleRole,
  reduceV070BattleAction as reduceV070BattleActionCore,
  requiredV070BattleDice,
  selectV070BattleDie,
  type V070BattleAction as V070CoreBattleAction,
} from './battle-engine-core';
import {
  openV070FootholdAssetAftermathWindow,
  passV070FootholdAssetAfterCounterattackWin,
  useV070FootholdAssetAfterCounterattackWin,
  v070FootholdAssetEligibleInstanceIds,
} from './foothold';
import {
  initializeV070TermsWindow,
  v070PoliticalCapitalPending,
  v070ProposalChoicePending,
  v070TermsReadyForGambits,
} from './diplomats';
import {
  applyV070MysticConvergence,
  recordV070MysticQualifyingHandSacrifice,
  v070MysticInvocationPendingPlayers,
} from './mystics';
import {
  applyV070AdvancedBattleTerritoryEffects,
  applyV070CoreBattleTerritoryEffects,
  assertV070GraveyardExitAllowed,
  v070DisruptedSupplyLinesSelectionRequired,
} from './territories';
import {
  recordV070IntelligenceBattleAssetUseForMission,
} from './intelligence';
import {
  V070SpiritHollowAftermathPause,
  openV070SpiritHollowAftermathChoice,
  resolveV070SpiritHollowAftermathChoice,
} from './spirit-hollow';
import {
  createV070BattleRuntime,
  type V070ResistanceOnsetResumeAction,
  type V070SubversionAssetBattleContinuation,
} from './battle-types';
import {
  assertV070BattleAssetEffectUsable,
  openV070SubversionAssetBattleWindow,
  resolveV070SubversionAssetBattleChoice,
} from './subversion-asset';
import {
  V070ResistanceAssetOnsetPause,
  applyV070ResistanceAssetOnsetEffects,
  applyV070ResistanceAssetOnsetInstance,
} from './resistance';
import { activeV070OverlayAtBattleOnset } from './overlays';
import {
  V070_FORTIFICATIONS_ASSET_TEXT,
  V070_FORTIFICATIONS_ID,
  continueV070FortificationsAssetOnsetWindow,
  openNextV070FortificationsPostTacticsEffect,
  openV070FortificationsAssetOnsetWindow,
  passV070FortificationsAssetOnset,
  resolveV070FortificationsPostTacticsChoice,
  useV070FortificationsAssetOnset,
} from './fortifications';

export {
  V070_NORMAL_BATTLE_DICE,
  cardEligibleForV070BattleRole,
  requiredV070BattleDice,
  selectV070BattleDie,
};

export type V070BattleAction =
  | V070CoreBattleAction
  | {
      type: 'use_foothold_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | { type: 'pass_foothold_asset'; playerId: PlayerId }
  | {
      type: 'use_fortifications_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | { type: 'pass_fortifications_asset'; playerId: PlayerId }
  | {
      type: 'resolve_fortifications_tactic';
      playerId: PlayerId;
      tacticInstanceId?: string;
    }
  | {
      type: 'resolve_spirit_hollow_aftermath';
      playerId: PlayerId;
      handInstanceId?: string;
      graveyardInstanceId?: string;
    }
  | {
      type: 'resolve_subversion_asset';
      playerId: PlayerId;
      choice: 'pass' | 'use';
      subversionInstanceId?: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  return reduceV070BattleActionInternal(state, action, false);
}

function reduceV070BattleActionInternal(
  initialState: V070GameState,
  action: V070BattleAction,
  bypassSubversionInterrupt: boolean,
): V070GameState {
  let state = initialState;

  const subversionPending =
    state.battleRuntime?.pendingSubversionAssetBattle ?? null;
  if (subversionPending && action.type !== 'resolve_subversion_asset') {
    throw new V070GameActionError(
      'Resolve or decline the pending Subversion Asset opportunity before continuing the battle.',
    );
  }

  if (action.type === 'resolve_subversion_asset') {
    const next = structuredClone(state) as V070GameState;
    const resolved = resolveV070SubversionAssetBattleChoice(
      next,
      action.playerId,
      action.choice,
      action.subversionInstanceId,
    );

    if (resolved.pending.deferredAction.type === 'apply_resistance_onset_asset') {
      if (!resolved.used) {
        applyV070ResistanceAssetOnsetInstance(
          next,
          resolved.pending.deferredAction.playerId,
          resolved.pending.deferredAction.assetInstanceId,
        );
      }
      return resumeV070ResistanceOnsetInitialization(
        next,
        requireResistanceOnsetResumeAction(resolved.pending),
      );
    }

    if (!resolved.used) {
      return reduceV070BattleActionInternal(
        next,
        resolved.pending.deferredAction,
        true,
      );
    }
    return resumeAfterNegatedBattleAsset(next, resolved.pending.deferredAction);
  }

  const spiritHollowPending =
    state.battleRuntime?.pendingSpiritHollowAftermath ?? null;
  if (spiritHollowPending
    && action.type !== 'resolve_spirit_hollow_aftermath') {
    throw new V070GameActionError(
      'Resolve or decline the pending Spirit Hollow opportunity before continuing the Aftermath.',
    );
  }

  const fortificationsOnsetPending =
    state.battleRuntime?.pendingFortificationsAssetOnset ?? null;
  if (fortificationsOnsetPending
    && action.type !== 'use_fortifications_asset'
    && action.type !== 'pass_fortifications_asset') {
    throw new V070GameActionError(
      'Resolve or decline the pending Fortifications Asset opportunity before continuing Onset.',
    );
  }

  const fortificationsTacticPending =
    state.battleRuntime?.pendingFortificationsPostTactics ?? null;
  if (fortificationsTacticPending
    && action.type !== 'resolve_fortifications_tactic') {
    throw new V070GameActionError(
      'Resolve the pending Fortifications additional Tactic opportunity before continuing the battle.',
    );
  }

  const pendingPlayer =
    state.battleRuntime?.footholdAssetWindowPlayer ?? null;
  if (pendingPlayer
    && action.type !== 'use_foothold_asset'
    && action.type !== 'pass_foothold_asset') {
    throw new V070GameActionError(
      'Resolve or decline the pending Foothold Asset opportunity before continuing the battle.',
    );
  }

  if (action.type === 'proceed_from_onset' && !state.battleRuntime) {
    const prepared = structuredClone(state) as V070GameState;
    try {
      initializeV070BattleRuntimeForFortifications(prepared);
    } catch (error) {
      if (error instanceof V070ResistanceAssetOnsetPause) {
        attachResistanceOnsetResumeAction(error.state, {
          type: 'proceed_from_onset',
          playerId: action.playerId,
        });
        return error.state;
      }
      throw error;
    }
    state = prepared;
  }

  if (action.type === 'proceed_from_onset'
    && fortificationsWindowMayOpenBeforeProceed(state)) {
    const next = structuredClone(state) as V070GameState;
    if (openV070FortificationsAssetOnsetWindow(next)) return next;
    state = next;
  }

  const assetEffect = battleAssetEffectForAction(action);
  if (assetEffect && !bypassSubversionInterrupt) {
    const next = structuredClone(state) as V070GameState;
    if (openV070SubversionAssetBattleWindow(
      next,
      assetEffect.playerId,
      assetEffect.assetInstanceId,
      assetEffect.effectLabel,
      assetEffect.deferredAction,
    )) {
      return next;
    }
  }
  if (assetEffect) {
    assertV070BattleAssetEffectUsable(
      state,
      assetEffect.playerId,
      assetEffect.assetInstanceId,
    );
  }

  if (action.type === 'use_fortifications_asset') {
    const next = structuredClone(state) as V070GameState;
    useV070FortificationsAssetOnset(
      next,
      action.playerId,
      action.assetInstanceId,
    );
    return next;
  }

  if (action.type === 'pass_fortifications_asset') {
    const next = structuredClone(state) as V070GameState;
    passV070FortificationsAssetOnset(next, action.playerId);
    return next;
  }

  if (action.type === 'resolve_fortifications_tactic') {
    const next = structuredClone(state) as V070GameState;
    resolveV070FortificationsPostTacticsChoice(
      next,
      action.playerId,
      action.tacticInstanceId,
    );
    if (next.battleRuntime?.stage !== 'halted') {
      openNextV070FortificationsPostTacticsEffect(next);
    }
    return next;
  }

  if (action.type === 'resolve_spirit_hollow_aftermath') {
    const next = structuredClone(state) as V070GameState;
    resolveV070SpiritHollowAftermathChoice(
      next,
      action.playerId,
      action.handInstanceId,
      action.graveyardInstanceId,
      {
        assertGraveyardExitAllowed: () =>
          assertV070GraveyardExitAllowed(next, 'Spirit Hollow'),
        recordQualifyingHandSacrifice: () =>
          recordV070MysticQualifyingHandSacrifice(
            next,
            action.playerId,
            'Spirit Hollow',
          ),
      },
    );
    if (openV070SpiritHollowAftermathChoice(next)) return next;
    return resumeV070AfterSpiritHollow(next);
  }

  if (action.type === 'use_foothold_asset') {
    const next = structuredClone(state) as V070GameState;
    const remainsOpen = useV070FootholdAssetAfterCounterattackWin(
      next,
      action.playerId,
      action.assetInstanceId,
    );
    recordV070IntelligenceBattleAssetUseForMission(
      next,
      action.playerId,
    );
    return remainsOpen ? next : resumeV070AfterFoothold(next);
  }

  if (action.type === 'pass_foothold_asset') {
    const next = structuredClone(state) as V070GameState;
    passV070FootholdAssetAfterCounterattackWin(
      next,
      action.playerId,
    );
    return resumeV070AfterFoothold(next);
  }

  if (action.type === 'complete_aftermath'
    && action.playerId === state.battle?.attacker
    && footholdWindowMayOpen(state)) {
    const next = structuredClone(state) as V070GameState;
    if (openV070FootholdAssetAftermathWindow(next)) return next;
  }

  const next = action.type === 'proceed_from_onset'
    && state.battleRuntime?.fortificationsAssetOnsetResolved
    ? proceedCorePastResolvedFortifications(state, action.playerId)
    : reduceCoreWithAftermathPauses(
        state,
        action as V070CoreBattleAction,
      );

  if (assetEffect) {
    recordV070IntelligenceBattleAssetUseForMission(
      next,
      assetEffect.playerId,
    );
  }
  if (action.type === 'reveal_tactics'
    && next.battleRuntime?.stage === 'outcome') {
    openNextV070FortificationsPostTacticsEffect(next);
  }
  if (footholdWindowMayOpen(next)) {
    openV070FootholdAssetAftermathWindow(next);
  }
  return next;
}

function battleAssetEffectForAction(
  action: V070BattleAction,
): {
  playerId: PlayerId;
  assetInstanceId: string;
  effectLabel: string;
  deferredAction: V070SubversionAssetBattleContinuation;
} | null {
  switch (action.type) {
    case 'use_plenipotentiary':
      return {
        playerId: action.playerId,
        assetInstanceId: action.cardInstanceId,
        effectLabel: 'Plenipotentiary',
        deferredAction: action,
      };
    case 'use_good_faith':
      return {
        playerId: action.playerId,
        assetInstanceId: action.cardInstanceId,
        effectLabel: 'Good Faith',
        deferredAction: action,
      };
    case 'use_neutral_observers':
      return {
        playerId: action.playerId,
        assetInstanceId: action.cardInstanceId,
        effectLabel: 'Neutral Observers',
        deferredAction: action,
      };
    case 'use_safe_conduct':
      return {
        playerId: action.playerId,
        assetInstanceId: action.cardInstanceId,
        effectLabel: 'Safe Conduct',
        deferredAction: action,
      };
    case 'use_foothold_asset':
      return {
        playerId: action.playerId,
        assetInstanceId: action.assetInstanceId,
        effectLabel: 'Foothold',
        deferredAction: action,
      };
    case 'use_fortifications_asset':
      return {
        playerId: action.playerId,
        assetInstanceId: action.assetInstanceId,
        effectLabel: V070_FORTIFICATIONS_ASSET_TEXT,
        deferredAction: action,
      };
    default:
      return null;
  }
}

function resumeAfterNegatedBattleAsset(
  state: V070GameState,
  deferredAction: V070SubversionAssetBattleContinuation,
): V070GameState {
  if (deferredAction.type === 'use_safe_conduct') {
    return reduceV070BattleActionInternal(
      state,
      {
        type: 'pass_loss_replacement',
        playerId: deferredAction.playerId,
      },
      true,
    );
  }

  if (deferredAction.type === 'use_fortifications_asset') {
    continueV070FortificationsAssetOnsetWindow(state, true);
    return state;
  }

  if (deferredAction.type === 'use_foothold_asset') {
    const playerId = deferredAction.playerId;
    const remaining = v070FootholdAssetEligibleInstanceIds(state, playerId);
    if (remaining.length > 0) {
      appendV070Event(state, {
        type: 'foothold_asset_window_continues',
        actor: playerId,
        visibility: 'public',
        payload: {
          playerId,
          eligibleCount: remaining.length,
          optional: true,
          afterNegatedAsset: true,
        },
      });
      appendV070Event(state, {
        type: 'foothold_asset_options',
        actor: playerId,
        visibility: playerId,
        payload: {
          playerId,
          assetInstanceIds: [...remaining],
        },
      });
      return state;
    }

    const runtime = state.battleRuntime;
    if (!runtime) {
      throw new V070GameActionError(
        'Foothold continuation requires an active battle runtime.',
      );
    }
    runtime.footholdAssetWindowPlayer = null;
    runtime.footholdAssetWindowResolved = true;
    return resumeV070AfterFoothold(state);
  }

  return state;
}

function initializeV070BattleRuntimeForFortifications(
  state: V070GameState,
): void {
  if (state.battleRuntime) return;
  if (!state.battle) {
    throw new V070GameActionError('There is no active battle.');
  }

  state.battleRuntime = createV070BattleRuntime();
  state.battleRuntime.activeOverlayAtOnset = activeV070OverlayAtBattleOnset(
    state,
    state.battle.contestedPosition,
  );
  applyV070MysticConvergence(state);
  applyV070CoreBattleTerritoryEffects(state);
  applyV070AdvancedBattleTerritoryEffects(state);
  applyV070ResistanceAssetOnsetEffects(state);
  initializeV070TermsWindow(state);
}

function fortificationsWindowMayOpenBeforeProceed(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'onset'
    || runtime.pendingFortificationsAssetOnset
    || runtime.fortificationsAssetOnsetResolved
    || !v070TermsReadyForGambits(state)) {
    return false;
  }
  if ([battle.attacker, battle.defender].some(playerId =>
    v070DisruptedSupplyLinesSelectionRequired(state, playerId)
  )) {
    return false;
  }
  if (state.pendingAssetLimitChoice
    || state.pendingSanctionChoices.length > 0
    || state.pendingPurgeChoice
    || v070PoliticalCapitalPending(state)
    || v070ProposalChoicePending(state)
    || v070MysticInvocationPendingPlayers(state).length > 0) {
    return false;
  }
  return true;
}

function proceedCorePastResolvedFortifications(
  state: V070GameState,
  playerId: PlayerId,
): V070GameState {
  const masked = structuredClone(state) as V070GameState;
  const assetBanks: Record<PlayerId, string[]> = {
    A: [...masked.players.A.zones.assetBank],
    B: [...masked.players.B.zones.assetBank],
  };

  for (const candidate of ['A', 'B'] as const) {
    masked.players[candidate].zones.assetBank =
      masked.players[candidate].zones.assetBank.filter(instanceId =>
        masked.cardInstances[instanceId]?.cardId !== V070_FORTIFICATIONS_ID
      );
  }

  const next = reduceCoreWithAftermathPauses(masked, {
    type: 'proceed_from_onset',
    playerId,
  });
  for (const candidate of ['A', 'B'] as const) {
    next.players[candidate].zones.assetBank = [...assetBanks[candidate]];
  }
  return next;
}

function resumeV070ResistanceOnsetInitialization(
  state: V070GameState,
  resumeAction: V070ResistanceOnsetResumeAction,
): V070GameState {
  try {
    applyV070ResistanceAssetOnsetEffects(state);
  } catch (error) {
    if (error instanceof V070ResistanceAssetOnsetPause) {
      attachResistanceOnsetResumeAction(error.state, resumeAction);
      return error.state;
    }
    throw error;
  }

  initializeV070TermsWindow(state);

  if (resumeAction.type === 'return_after_ranger_fieldcraft') {
    return state;
  }

  if (resumeAction.type === 'proceed_from_onset'
    && state.battleRuntime?.terms.stage !== 'closed') {
    return state;
  }

  return reduceV070BattleActionInternal(state, resumeAction, false);
}

function requireResistanceOnsetResumeAction(
  pending: NonNullable<V070GameState['battleRuntime']>['pendingSubversionAssetBattle'] extends infer T
    ? NonNullable<T>
    : never,
): V070ResistanceOnsetResumeAction {
  if (!pending.resistanceOnsetResumeAction) {
    throw new V070GameActionError(
      'Resistance Subversion interruption is missing its Onset continuation.',
    );
  }
  return pending.resistanceOnsetResumeAction;
}

function attachResistanceOnsetResumeAction(
  state: V070GameState,
  resumeAction: V070ResistanceOnsetResumeAction,
): void {
  const pending = state.battleRuntime?.pendingSubversionAssetBattle;
  if (!pending
    || pending.deferredAction.type !== 'apply_resistance_onset_asset') {
    throw new V070GameActionError(
      'Resistance Onset pause is missing its pending Subversion Asset window.',
    );
  }
  pending.resistanceOnsetResumeAction = structuredClone(resumeAction);
}

function resistanceOnsetResumeActionForCoreAction(
  action: V070CoreBattleAction,
): V070ResistanceOnsetResumeAction {
  switch (action.type) {
    case 'proceed_from_onset':
      return { ...action };
    case 'pass_terms':
      return { ...action };
    case 'offer_terms':
      return { ...action };
    case 'use_ranger_fieldcraft':
      return {
        type: 'return_after_ranger_fieldcraft',
        playerId: action.playerId,
      };
    default:
      throw new V070GameActionError(
        `Cannot resume ${action.type} across the initial Resistance Onset interrupt.`,
      );
  }
}

function resumeV070AfterFoothold(
  state: V070GameState,
): V070GameState {
  const battle = state.battle;
  if (!battle) {
    throw new V070GameActionError(
      'Foothold can resume only while its battle is active.',
    );
  }
  return reduceCoreWithAftermathPauses(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}

function resumeV070AfterSpiritHollow(
  state: V070GameState,
): V070GameState {
  const battle = state.battle;
  if (!battle) {
    throw new V070GameActionError(
      'Spirit Hollow can resume only while its battle is active.',
    );
  }
  return reduceCoreWithAftermathPauses(state, {
    type: 'complete_aftermath',
    playerId: battle.attacker,
  });
}

function reduceCoreWithAftermathPauses(
  state: V070GameState,
  action: V070CoreBattleAction,
): V070GameState {
  try {
    return reduceV070BattleActionCore(state, action);
  } catch (error) {
    if (error instanceof V070SpiritHollowAftermathPause) {
      return error.state;
    }
    if (error instanceof V070ResistanceAssetOnsetPause) {
      attachResistanceOnsetResumeAction(
        error.state,
        resistanceOnsetResumeActionForCoreAction(action),
      );
      return error.state;
    }
    throw error;
  }
}

function footholdWindowMayOpen(state: V070GameState): boolean {
  const runtime = state.battleRuntime;
  if (!state.battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || runtime.footholdAssetWindowResolved
    || runtime.footholdAssetWindowPlayer) {
    return false;
  }
  if (runtime.pendingAccursedWager
    || runtime.pendingBattleAftermathControlledEffectChoice
    || runtime.pendingTerritoryAftermathChoice
    || runtime.pendingPoisonousGasAftermath
    || runtime.pendingSpiritHollowAftermath
    || runtime.pendingSubversionAssetBattle
    || runtime.pendingFortificationsAssetOnset
    || runtime.pendingFortificationsPostTactics
    || runtime.guardiansWindowOpen
    || runtime.finalJudgmentWindowOpen
    || runtime.relentlessPursuitWindowOpen
    || runtime.routWindowOpen
    || state.pendingAssetLimitChoice
    || state.pendingSanctionChoices.length > 0
    || state.pendingPurgeChoice
    || v070PoliticalCapitalPending(state)
    || v070ProposalChoicePending(state)
    || v070MysticInvocationPendingPlayers(state).length > 0) {
    return false;
  }
  return true;
}
