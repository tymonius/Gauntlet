import type { PlayerId } from '../v070/rules';
import type { V070GameState } from '../v070/engine';
import type { V070BattleRuntime } from '../v070/battle-types';
import {
  isV070BattleCardEffectNegated,
  v070BattleCommitment,
} from '../v070/battle-effect-status';
import { v070CounterchargeAftermathCandidates } from '../v070/countercharge-battle';
import { v070GeneralRoutAvailableAtEndOfAftermath } from '../v070/military';
import { v070VictoryResultBenefitProhibited } from '../v070/victory-result-restrictions';

/**
 * Candidate-only scheduling contract for the accepted follow-up movement
 * decisions in the v0.7.3-candidate package. This module is deliberately not
 * called by the published v0.7.2 battle reducer or live reveal registry.
 *
 * In particular, selecting a grant does NOT spend Command, move a physical
 * card, start movement, or claim battle-effect registration. Those transitions
 * must occur in the live reducer after the candidate is promoted.
 */
export type V073FollowUpKind =
  | 'countercharge-battle'
  | 'countercharge-asset'
  | 'give-chase-battle'
  | 'general-rout';

export interface V073FollowUpGrant {
  key: string;
  owner: PlayerId;
  kind: V073FollowUpKind;
  sourceInstanceId: string | null;
  optional: boolean;
}

export interface V073FollowUpQueue {
  pending: V073FollowUpGrant[];
  active: V073FollowUpGrant | null;
  resolved: V073FollowUpGrant[];
  declined: V073FollowUpGrant[];
  expired: V073FollowUpGrant[];
  /** Mandatory grant whose movement could not be legally completed. */
  unfulfilled: V073FollowUpGrant[];
  closed: boolean;
}

declare module '../v070/engine' {
  interface V070GameState {
    /** Candidate follow-ups spanning a completed battle and separate movement sequences. */
    v073FollowUpQueue?: V073FollowUpQueue | null;
    /** Printed Give Chase restrictions only when its Advance starts a new battle. */
    v073GiveChaseBattleRestriction?: { owner: PlayerId; reservePenalty: number };
    /** Pending Give Chase restriction while its effect-granted Advance is in progress. */
    v073GiveChasePendingRestriction?: { owner: PlayerId; reservePenalty: number };
  }
}

declare module '../v070/battle-types' {
  interface V070BattleRuntime {
    giveChaseBattleSourceInstanceIds?: string[];
  }
}

/** Collect only physically eligible grants; never deduplicate by card title. */
export function v073CollectFollowUpGrants(
  state: V070GameState,
  revealedGiveChaseSourceInstanceIds: readonly string[] =
    state.battleRuntime?.giveChaseBattleSourceInstanceIds ?? [],
): V073FollowUpGrant[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath'
      || !runtime.aftermathCardsCleared || runtime.pendingGameVictory
      || !battle.winner
      || v070VictoryResultBenefitProhibited(state, battle.winner, 'movement')) {
    return [];
  }

  if (battle.winner === battle.defender) {
    return v070CounterchargeAftermathCandidates(state).map(candidate => ({
      key: 'countercharge-' + candidate.sourceMode + ':' + candidate.sourceInstanceId,
      owner: candidate.owner,
      kind: candidate.sourceMode === 'asset'
        ? 'countercharge-asset' as const
        : 'countercharge-battle' as const,
      sourceInstanceId: candidate.sourceInstanceId,
      optional: candidate.optional,
    }));
  }

  if (battle.winner !== battle.attacker) return [];

  const grants: V073FollowUpGrant[] = [];
  for (const sourceInstanceId of new Set(revealedGiveChaseSourceInstanceIds)) {
    const card = state.cardInstances[sourceInstanceId];
    const commitment = v070BattleCommitment(state, sourceInstanceId);
    if (card?.cardId !== 'military-give-chase'
        || card.owner !== battle.attacker
        || commitment?.owner !== battle.attacker
        || (commitment.role !== 'gambit' && commitment.role !== 'tactic')
        || !commitment.faceUp
        || isV070BattleCardEffectNegated(state, sourceInstanceId)) {
      continue;
    }
    grants.push({
      key: 'give-chase:' + sourceInstanceId,
      owner: battle.attacker,
      kind: 'give-chase-battle',
      sourceInstanceId,
      optional: true,
    });
  }

  if (v070GeneralRoutAvailableAtEndOfAftermath(state)) {
    grants.push({
      key: 'general-rout:' + battle.attacker,
      owner: battle.attacker,
      kind: 'general-rout',
      sourceInstanceId: null,
      optional: true,
    });
  }
  return grants;
}

export function v073CreateFollowUpQueue(
  grants: readonly V073FollowUpGrant[],
): V073FollowUpQueue {
  const keys = new Set(grants.map(grant => grant.key));
  if (keys.size !== grants.length) {
    throw new Error('Follow-up movement grants require unique physical or Order keys.');
  }
  return {
    pending: grants.map(grant => ({ ...grant })),
    active: null,
    resolved: [],
    declined: [],
    expired: [],
    unfulfilled: [],
    closed: false,
  };
}

/**
 * Give Chase must be offered before Rout when both follow an attacking win.
 * Other separately eligible effects preserve controller choice at their
 * timing, rather than using physical collection order as priority.
 */
export function v073OfferedFollowUpGrants(
  queue: V073FollowUpQueue,
): readonly V073FollowUpGrant[] {
  if (queue.closed || queue.active) return [];
  const giveChase = queue.pending.filter(grant =>
    grant.kind === 'give-chase-battle');
  return giveChase.length ? giveChase : queue.pending;
}

function takeOffered(
  queue: V073FollowUpQueue,
  key: string,
): V073FollowUpGrant {
  if (queue.closed || queue.active) {
    throw new Error('Resolve the current follow-up movement before choosing another.');
  }
  const offered = v073OfferedFollowUpGrants(queue);
  const found = offered.find(grant => grant.key === key);
  if (!found) {
    throw new Error('That follow-up effect is not currently offered.');
  }
  queue.pending.splice(
    queue.pending.findIndex(grant => grant.key === key), 1,
  );
  return found;
}

/**
 * Choosing is not payment or movement. The calling battle reducer must
 * perform source-specific costs and create the actual movement sequence.
 */
export function v073ChooseFollowUpGrant(
  queue: V073FollowUpQueue,
  key: string,
): V073FollowUpGrant {
  const grant = takeOffered(queue, key);
  queue.active = grant;
  return grant;
}

export function v073DeclineFollowUpGrant(
  queue: V073FollowUpQueue,
  key: string,
): void {
  if (!v073OfferedFollowUpGrants(queue)
    .some(grant => grant.key === key && grant.optional)) {
    throw new Error('Only a currently offered optional follow-up can be declined.');
  }
  queue.declined.push(takeOffered(queue, key));
}

/**
 * Call only after the selected movement's outcome is known.
 * A new battle closes the original end-of-Aftermath window and expires
 * remaining grants, including mandatory Countercharge copies and Rout.
 * If no battle started, other eligible grants remain available.
 */
export function v073CompleteFollowUpGrant(
  queue: V073FollowUpQueue,
  startedNewBattle: boolean,
): void {
  if (!queue.active || queue.closed) {
    throw new Error('No chosen follow-up movement is pending completion.');
  }
  queue.resolved.push(queue.active);
  queue.active = null;
  if (startedNewBattle) {
    queue.expired.push(...queue.pending);
    queue.pending = [];
    queue.closed = true;
  } else if (queue.pending.length === 0) {
    queue.closed = true;
  }
}

/** The mandatory effect resolves, but its illegal Advance does not occur.
 * Unlike starting another battle, this does not expire unrelated grants.
 */
export function v073MarkFollowUpAdvanceUnfulfilled(
  queue: V073FollowUpQueue,
): V073FollowUpGrant {
  if (!queue.active || queue.closed || queue.active.optional) {
    throw new Error('Only an active mandatory Advance may fail as unfulfillable.');
  }
  const grant = queue.active;
  queue.unfulfilled.push(grant);
  queue.active = null;
  if (queue.pending.length === 0) queue.closed = true;
  return grant;
}
