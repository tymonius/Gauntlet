import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { V070BattleCardCommitment } from './battle-types';
import { resolveV070Withdrawal, type PlayerId } from './rules';
import { isV070BattleCardEffectNegated } from './battle-effect-status';
import {
  completeV070ReconnaissanceBattleRevealChoice,
  queueV070ReconnaissanceBattleRevealChoice,
} from './battle-reveal-choices';
import { settleV070RefusedTermsWithoutWinner } from './diplomats';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';

export const V070_RECONNAISSANCE_ID = 'intelligence-reconnaissance' as const;
export const V070_RECONNAISSANCE_BATTLE_TEXT =
  'After Tactics are revealed, you may withdraw.' as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredReconnaissanceGambitCommitments?: V070BattleCardCommitment[];
  }
}

function validateV070ReconnaissanceAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_RECONNAISSANCE_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_RECONNAISSANCE_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Reconnaissance battle text drifted from released authority.',
    );
  }
}

validateV070ReconnaissanceAuthority();

export function deferV070ReconnaissanceGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredReconnaissanceGambitCommitments ??= [];
  if (runtime.deferredReconnaissanceGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredReconnaissanceGambitCommitments.push({ ...commitment });
}

export function takeV070DeferredReconnaissanceGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredReconnaissanceGambitCommitments ?? [];
  runtime.deferredReconnaissanceGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_RECONNAISSANCE_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

export function registerV070ReconnaissanceBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Reconnaissance battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_RECONNAISSANCE_ID) {
    throw new V070GameActionError(
      'Reconnaissance battle source does not match the revealed card instance.',
    );
  }

  queueV070ReconnaissanceBattleRevealChoice(state, {
    kind: 'reconnaissance',
    owner,
    sourceInstanceId,
  });
}

export function resolveV070ReconnaissanceBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  withdraw: boolean,
): void {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingReconnaissanceBattleRevealChoice;
  if (!runtime || !pending || !runtime.reconnaissanceBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'No Reconnaissance battle withdrawal choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Reconnaissance controller may choose whether to withdraw.',
    );
  }

  completeV070ReconnaissanceBattleRevealChoice(state);

  if (!withdraw) {
    appendV070Event(state, {
      type: 'reconnaissance_battle_withdrawal_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_RECONNAISSANCE_ID,
      },
    });
    return;
  }

  const battle = state.battle;
  if (!battle) {
    throw new V070GameActionError(
      'Reconnaissance cannot withdraw after the battle has already ended.',
    );
  }

  const previousPositions = { ...battle.positions };
  state.battle = resolveV070Withdrawal(battle, [playerId]);
  runtime.pendingOutcome = null;
  runtime.stage = 'aftermath';
  runtime.trainingGroundsRedrawResolved = true;

  // Withdrawal ends the reveal procedure. No later reveal effect from this
  // battle may resume after the player has left the battle.
  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealDeferredOrdinaryCommitments = [];
  runtime.pendingRevealEffectClass = null;
  runtime.pendingRevealEffectEncounteredAt = null;
  runtime.pendingRevealEffectNextPlayer = null;
  runtime.pendingRevealForcedInstanceId = null;
  runtime.pendingRevealEffectOrderChoice = null;
  runtime.battleRevealChoices = [];
  runtime.battleRevealChoiceOpen = false;
  runtime.deferredReconnaissanceGambitCommitments = [];

  for (const participant of ['A', 'B'] as const) {
    const from = previousPositions[participant];
    const to = state.battle.positions[participant];
    if (from !== to) {
      openV070BlockadeChoicesForPositionChange(
        state,
        participant,
        from,
        to,
      );
    }
  }

  settleV070RefusedTermsWithoutWinner(state);

  appendV070Event(state, {
    type: 'reconnaissance_battle_withdrawal',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_RECONNAISSANCE_ID,
      playerId,
      positions: { ...state.battle.positions },
    },
  });
}

function battleContainsCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  const participant = state.battleRuntime?.participants[commitment.owner];
  if (!participant) return false;
  const candidates = commitment.role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
  return candidates.some(candidate => candidate.instanceId === commitment.instanceId);
}
