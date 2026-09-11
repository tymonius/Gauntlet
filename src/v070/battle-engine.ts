import {
  V070GameActionError,
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
} from './foothold';
import {
  v070PoliticalCapitalPending,
  v070ProposalChoicePending,
} from './diplomats';
import {
  recordV070MysticQualifyingHandSacrifice,
  v070MysticInvocationPendingPlayers,
} from './mystics';
import { assertV070GraveyardExitAllowed } from './territories';
import {
  V070SpiritHollowAftermathPause,
  openV070SpiritHollowAftermathChoice,
  resolveV070SpiritHollowAftermathChoice,
} from './spirit-hollow';

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
      type: 'resolve_spirit_hollow_aftermath';
      playerId: PlayerId;
      handInstanceId?: string;
      graveyardInstanceId?: string;
    };

export function reduceV070BattleAction(
  state: V070GameState,
  action: V070BattleAction,
): V070GameState {
  const spiritHollowPending =
    state.battleRuntime?.pendingSpiritHollowAftermath ?? null;
  if (spiritHollowPending
    && action.type !== 'resolve_spirit_hollow_aftermath') {
    throw new V070GameActionError(
      'Resolve or decline the pending Spirit Hollow opportunity before continuing the Aftermath.',
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

  const next = reduceCoreWithAftermathPauses(
    state,
    action as V070CoreBattleAction,
  );
  if (footholdWindowMayOpen(next)) {
    openV070FootholdAssetAftermathWindow(next);
  }
  return next;
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
