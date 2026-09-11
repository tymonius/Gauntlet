import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  reduceV070TurnAction as reduceV070TurnActionPostDraw,
  type V070TurnAction as V070PostDrawTurnAction,
} from './turn-engine-postdraw';
import {
  openV070SubversionTurnAssetWindow,
  pendingV070SubversionTurnAsset,
  resolveV070SubversionTurnAssetChoice,
  type V070SubversionTurnContinuation,
} from './subversion-turn';
import {
  applyV070WarBonds,
  continueV070WarBondsTiming,
  openV070WarBondsAfterFirstBattle,
  pendingV070WarBondsChoice,
  resolveV070WarBondsChoice,
  v070CurrentTurnHasCompletedBattle,
  type V070WarBondsContinuation,
} from './war-bonds';
import {
  openV070ReembodimentRecovery,
  pendingV070ReembodimentRecovery,
  recordV070ReembodimentQualifyingTransition,
  resolveV070ReembodimentRecovery,
  type V070ReembodimentContinuation,
} from './reembodiment';
import { resolveV070EncampmentEndOfTurn } from './encampment';
import {
  resolveV070ProtractedSiegeDepartures,
} from './protracted-siege';

export * from './turn-engine-postdraw';

export type V070TurnAction =
  | V070PostDrawTurnAction
  | {
      type: 'resolve_war_bonds';
      playerId: PlayerId;
      choice: 'pass' | 'use';
      handInstanceId?: string;
    }
  | {
      type: 'resolve_reembodiment_recovery';
      playerId: PlayerId;
      targetInstanceId?: string;
    };

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  const pendingReembodiment = pendingV070ReembodimentRecovery(state);
  if (pendingReembodiment) {
    if (action.type !== 'resolve_reembodiment_recovery') {
      throw new V070GameActionError(
        'Resolve or decline the pending Reembodiment recovery before continuing the turn.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    resolveV070ReembodimentRecovery(
      next,
      action.playerId,
      action.targetInstanceId,
    );
    return next;
  }
  if (action.type === 'resolve_reembodiment_recovery') {
    throw new V070GameActionError(
      'There is no pending Reembodiment recovery.',
    );
  }

  const pendingSubversion = pendingV070SubversionTurnAsset(state);
  const reembodimentSubversion = pendingSubversion
    && isReembodimentContinuation(
      pendingSubversion.deferredAction as unknown,
    )
    ? pendingSubversion
    : null;

  if (reembodimentSubversion) {
    if (action.type !== 'resolve_subversion_asset') {
      throw new V070GameActionError(
        'Resolve or decline the pending Subversion response to Reembodiment before continuing.',
      );
    }
    const next = structuredClone(state) as V070GameState;
    const resolved = resolveV070SubversionTurnAssetChoice(
      next,
      action.playerId,
      action.choice,
      action.subversionInstanceId,
    );
    const continuation = resolved.pending.deferredAction as unknown;
    if (!isReembodimentContinuation(continuation)) {
      throw new V070GameActionError(
        'The pending Subversion continuation no longer matches Reembodiment.',
      );
    }
    if (!resolved.used) {
      openV070ReembodimentRecovery(next, continuation);
    }
    return next;
  }

  const warBondsSubversion = pendingSubversion
    && isWarBondsContinuation(
      pendingSubversion.deferredAction as unknown,
    )
    ? pendingSubversion
    : null;

  if (warBondsSubversion) {
    if (action.type !== 'resolve_subversion_asset') {
      throw new V070GameActionError(
        'Resolve or decline the pending Subversion response to War Bonds before continuing.',
      );
    }

    const next = structuredClone(state) as V070GameState;
    const resolved = resolveV070SubversionTurnAssetChoice(
      next,
      action.playerId,
      action.choice,
      action.subversionInstanceId,
    );
    const deferred = resolved.pending.deferredAction as unknown;
    if (!isWarBondsContinuation(deferred)) {
      throw new V070GameActionError(
        'The pending Subversion continuation no longer matches War Bonds.',
      );
    }

    const continuation = deferred;
    if (!resolved.used) {
      applyV070WarBonds(next, continuation);
    }
    continueV070WarBondsTiming(next, continuation.remainingPlayerIds);
    return next;
  }

  const pendingWarBonds = pendingV070WarBondsChoice(state);
  if (pendingWarBonds) {
    if (action.type !== 'resolve_war_bonds') {
      throw new V070GameActionError(
        'Resolve or decline the pending War Bonds opportunity before continuing the turn.',
      );
    }

    const next = structuredClone(state) as V070GameState;
    const continuation = resolveV070WarBondsChoice(
      next,
      action.playerId,
      action.choice,
      action.handInstanceId,
    );
    if (!continuation) return next;

    if (openV070SubversionTurnAssetWindow(
      next,
      continuation.playerId,
      continuation.assetInstanceId,
      'War Bonds',
      continuation as unknown as V070SubversionTurnContinuation,
    )) {
      return next;
    }

    applyV070WarBonds(next, continuation);
    continueV070WarBondsTiming(next, continuation.remainingPlayerIds);
    return next;
  }

  if (action.type === 'resolve_war_bonds') {
    throw new V070GameActionError(
      'There is no pending War Bonds opportunity.',
    );
  }

  if (!state.battle
    && state.warBondsFirstBattleTurn !== state.turnNumber
    && v070CurrentTurnHasCompletedBattle(state)) {
    const next = structuredClone(state) as V070GameState;
    if (openV070WarBondsAfterFirstBattle(next)) return next;
    return reducePostDrawAndObserveReembodiment(
      next,
      action as V070PostDrawTurnAction,
    );
  }

  return reducePostDrawAndObserveReembodiment(
    state,
    action as V070PostDrawTurnAction,
  );
}

function reducePostDrawAndObserveReembodiment(
  state: V070GameState,
  action: V070PostDrawTurnAction,
): V070GameState {
  const prepared = action.type === 'complete_cleanup'
    ? structuredClone(state) as V070GameState
    : state;
  if (action.type === 'complete_cleanup') {
    resolveV070EncampmentEndOfTurn(prepared, action.playerId);
  }

  const previousPositions = battleOrPlayerPositions(prepared);
  const controlled = reembodimentControlledTurnEffect(prepared, action);
  const beforeHand = controlled
    ? [...prepared.players[controlled.playerId].zones.hand]
    : [];
  const next = reduceV070TurnActionPostDraw(prepared, action);
  resolveV070ProtractedSiegeDepartures(
    next,
    previousPositions,
    battleOrPlayerPositions(next),
  );
  if (!controlled) return next;

  const moved = beforeHand.filter(instanceId =>
    instanceId !== controlled.excludeInstanceId
    && !next.players[controlled.playerId].zones.hand.includes(instanceId)
    && next.players[controlled.playerId].zones.graveyard.includes(instanceId)
  );
  const continuation = recordV070ReembodimentQualifyingTransition(
    next,
    controlled.playerId,
    moved,
    controlled.sourceLabel,
    false,
  );
  if (!continuation) return next;

  if (openV070SubversionTurnAssetWindow(
    next,
    continuation.playerId,
    continuation.assetInstanceId,
    'Reembodiment',
    continuation as unknown as V070SubversionTurnContinuation,
  )) {
    return next;
  }
  openV070ReembodimentRecovery(next, continuation);
  return next;
}

function battleOrPlayerPositions(
  state: V070GameState,
): Record<PlayerId, number | null> {
  return state.battle
    ? { ...state.battle.positions }
    : {
        A: state.players.A.position,
        B: state.players.B.position,
      };
}

function reembodimentControlledTurnEffect(
  state: V070GameState,
  action: V070PostDrawTurnAction,
): {
  playerId: PlayerId;
  sourceLabel: string;
  excludeInstanceId?: string;
} | null {
  switch (action.type) {
    case 'mystics_begin_rite':
      return {
        playerId: action.playerId,
        sourceLabel: action.riteId === 'blood'
          ? 'Rite of Blood'
          : action.riteId === 'crossing'
            ? 'Rite of Crossing'
            : 'Rite of Echoes',
      };
    case 'choose_soul_for_soul_targets':
      return { playerId: action.playerId, sourceLabel: 'Soul for Soul' };
    case 'choose_dark_omens_graveyard_target':
      return { playerId: action.playerId, sourceLabel: 'Dark Omens' };
    case 'choose_fates_toll_cost':
      return { playerId: action.playerId, sourceLabel: "Fate's Toll" };
    case 'resolve_necromancy_action':
      return { playerId: action.playerId, sourceLabel: 'Necromancy' };
    case 'resolve_manifest_destiny_sacrifice':
      return { playerId: action.playerId, sourceLabel: 'Manifest Destiny' };
    case 'play_action_card': {
      const cardId = state.cardInstances[action.cardInstanceId]?.cardId;
      const name = cardId
        ? v070CanonicalContent.cardsById.get(cardId)?.name
        : undefined;
      return {
        playerId: action.playerId,
        sourceLabel: name ?? 'Action effect',
        excludeInstanceId: action.cardInstanceId,
      };
    }
    case 'resolve_sleeper_network_bound_action':
      return {
        playerId: action.playerId,
        sourceLabel: 'Sleeper Network bound Action',
      };
    case 'play_smugglers_run_stash_action':
      return {
        playerId: action.playerId,
        sourceLabel: "Smuggler's Run stashed Action",
      };
    default:
      return null;
  }
}

function isReembodimentContinuation(
  value: unknown,
): value is V070ReembodimentContinuation {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'apply_reembodiment_recovery';
}

function isWarBondsContinuation(
  value: unknown,
): value is V070WarBondsContinuation {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'war_bonds_apply';
}
