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

export * from './turn-engine-postdraw';

export type V070TurnAction =
  | V070PostDrawTurnAction
  | {
      type: 'resolve_war_bonds';
      playerId: PlayerId;
      choice: 'pass' | 'use';
      handInstanceId?: string;
    };

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  const pendingSubversion = pendingV070SubversionTurnAsset(state);
  const warBondsSubversion = pendingSubversion
    && isWarBondsContinuation(pendingSubversion.deferredAction)
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
    if (!isWarBondsContinuation(resolved.pending.deferredAction)) {
      throw new V070GameActionError(
        'The pending Subversion continuation no longer matches War Bonds.',
      );
    }

    const continuation = resolved.pending.deferredAction;
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
    return reduceV070TurnActionPostDraw(
      next,
      action as V070PostDrawTurnAction,
    );
  }

  return reduceV070TurnActionPostDraw(
    state,
    action as V070PostDrawTurnAction,
  );
}

function isWarBondsContinuation(
  value: unknown,
): value is V070WarBondsContinuation {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'war_bonds_apply';
}
