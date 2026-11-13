import { v070CanonicalContent } from '../content/v070';
import { beginV070OffTurnEffectMovement } from './off-turn-movement';
import { beginEffectGrantedV070Movement } from './rules';
import { putV070AssetInGraveyardByEffect } from './assets';
import { spendV070MilitaryCommand } from './military';
import { v073ChooseFollowUpGrant, v073CompleteFollowUpGrant, v073DeclineFollowUpGrant, v073OfferedFollowUpGrants, type V073FollowUpGrant } from '../v073/follow-up-movement';
import {
  V070GameActionError,
  appendV070Event,
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
    }
  | { type: 'choose_follow_up_movement'; playerId: PlayerId; grantKey: string }
  | { type: 'decline_follow_up_movement'; playerId: PlayerId; grantKey: string };

export function reduceV070TurnAction(
  state: V070GameState,
  action: V070TurnAction,
): V070GameState {
  if (state.v073FollowUpQueue) {
    return reduceCandidateFollowUpMovement(state, action);
  }
  if (action.type === 'choose_follow_up_movement' || action.type === 'decline_follow_up_movement') {
    throw new V070GameActionError('No follow-up movement is available.');
  }
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


/** Resolve end-of-Aftermath grants after the source battle has been cleared. */
function reduceCandidateFollowUpMovement(state: V070GameState, action: V070TurnAction): V070GameState {
  const queue = state.v073FollowUpQueue!;
  if (queue.active) {
    if (action.type !== 'choose_movement' || queue.active.owner !== action.playerId) {
      throw new V070GameActionError('The follow-up controller must resolve their chosen Advance.');
    }
    const next = reducePostDrawAndObserveReembodiment(state, action);
    const live = next.v073FollowUpQueue!;
    if (next.battle || !next.turnState?.movementSequenceOpen) {
      const newBattle = Boolean(next.battle);
      v073CompleteFollowUpGrant(live, newBattle);
      if (newBattle && next.v073GiveChasePendingRestriction) {
        next.v073GiveChaseBattleRestriction = next.v073GiveChasePendingRestriction;
      }
      delete next.v073GiveChasePendingRestriction;
      const grant = live.resolved[live.resolved.length - 1]!;
      appendV070Event(next, {
        type: 'follow_up_movement_resolved', actor: grant.owner, visibility: 'public',
        payload: { key: grant.key, startedNewBattle: newBattle, expired: live.expired.map(x => x.key) },
      });
      if (live.closed) delete next.v073FollowUpQueue;
    }
    return next;
  }
  if (state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError(
      'Resolve the pending Sanction movement choice before another follow-up movement.',
    );
  }
  if (action.type !== 'choose_follow_up_movement'
    && action.type !== 'decline_follow_up_movement') {
    throw new V070GameActionError('Resolve or decline the pending follow-up before continuing.');
  }
  const offered = v073OfferedFollowUpGrants(queue);
  const grant = offered.find(item => item.key === action.grantKey);
  if (!grant || grant.owner !== action.playerId) {
    throw new V070GameActionError('That follow-up effect is not offered to this player.');
  }
  const next = structuredClone(state) as V070GameState;
  const live = next.v073FollowUpQueue!;
  if (action.type === 'decline_follow_up_movement') {
    if (!grant.optional) throw new V070GameActionError('Mandatory Countercharge cannot be declined.');
    v073DeclineFollowUpGrant(live, grant.key);
    if (grant.kind === 'give-chase-battle') putFollowUpCardInGraveyard(next, grant);
    appendV070Event(next, {
      type: 'follow_up_movement_declined', actor: grant.owner, visibility: 'public',
      payload: { key: grant.key, kind: grant.kind },
    });
    if (!live.pending.length) delete next.v073FollowUpQueue;
    return next;
  }
  v073ChooseFollowUpGrant(live, grant.key);
  if (grant.kind === 'general-rout') {
    if (grant.owner !== next.activePlayer || next.players[grant.owner].leaderId !== 'general') {
      throw new V070GameActionError('Rout requires the eligible General on their own turn.');
    }
    spendV070MilitaryCommand(next, grant.owner, 2, 'Rout');
    appendV070Event(next, {
      type: 'military_order_used', actor: grant.owner, visibility: 'public',
      payload: {
        order: 'Rout',
        commandCost: 2,
        commandRemaining: next.players[grant.owner].military?.command ?? 0,
        source: 'follow_up_movement',
      },
    });
  } else if (grant.kind === 'countercharge-asset') {
    putV070AssetInGraveyardByEffect(
      next, grant.owner, grant.sourceInstanceId!, 'Countercharge follow-up Advance',
    );
  } else {
    putFollowUpCardInGraveyard(next, grant);
  }
  const step = {
    source: grant.kind === 'general-rout' ? 'General Rout'
      : grant.kind === 'give-chase-battle' ? 'Give Chase battle' : 'Countercharge battle',
    choiceRestriction: 'advance_required' as const,
    battleRestriction: grant.kind === 'give-chase-battle'
      ? 'allowed_no_gambit' as const : 'allowed' as const,
  };
  if (grant.kind === 'give-chase-battle') {
    const lastStart = next.events.map(event => event.type).lastIndexOf('turn_started');
    const earlierBattles = next.events.filter((event, index) =>
      index > lastStart && event.type === 'battle_initiated').length;
    next.v073GiveChasePendingRestriction = {
      owner: grant.owner, reservePenalty: Math.max(0, earlierBattles - 1),
    };
  }
  if (grant.owner === next.activePlayer) {
    if (!next.turnState) throw new V070GameActionError('Missing turn for follow-up.');
    next.turnState = beginEffectGrantedV070Movement(next.turnState, 1, step);
  } else {
    beginV070OffTurnEffectMovement(next, grant.owner, step);
  }
  appendV070Event(next, {
    type: 'follow_up_movement_started', actor: grant.owner, visibility: 'public',
    payload: { key: grant.key, kind: grant.kind, sourceInstanceId: grant.sourceInstanceId },
  });
  return next;
}
function putFollowUpCardInGraveyard(state: V070GameState, grant: V073FollowUpGrant): void {
  const id = grant.sourceInstanceId;
  if (!id) throw new V070GameActionError('Follow-up card source is missing.');
  const zones = state.players[grant.owner].zones;
  if (zones.graveyard.includes(id)) return;
  const index = zones.discardPile.indexOf(id);
  if (index < 0) throw new V070GameActionError('The post-battle Tactic cannot be located.');
  zones.discardPile.splice(index, 1);
  zones.graveyard.push(id);
  appendV070Event(state, {
    type: 'follow_up_battle_card_graveyarded', actor: grant.owner, visibility: 'public',
    payload: { sourceInstanceId: id, kind: grant.kind },
  });
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
