import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { resolveV070Withdrawal, type PlayerId } from './rules';
import type { V070BattleCardCommitment } from './battle-types';
import { settleV070RefusedTermsWithoutWinner } from './diplomats';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';

export const V070_ARMISTICE_ID = 'neutral-armistice' as const;
export const V070_ARMISTICE_BATTLE_TEXT =
  "The attacker withdraws. Put every other Gambit and Tactic still in battle in its owner's Discard Pile, then put this card in its owner's Graveyard." as const;

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Set when Armistice has ended the reveal procedure in a late withdrawal. */
    armisticeWithdrawalResolved?: boolean;
  }
}

function validateV070ArmisticeAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_ARMISTICE_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_ARMISTICE_BATTLE_TEXT) {
    throw new Error('v0.7.0 Armistice battle text drifted from released authority.');
  }
}

validateV070ArmisticeAuthority();

export function registerV070ArmisticeBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Armistice battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_ARMISTICE_ID) {
    throw new V070GameActionError(
      'Armistice battle source does not match the revealed card instance.',
    );
  }

  const source = battleCommitments(runtime)
    .find(commitment => commitment.instanceId === sourceInstanceId);
  if (!source) {
    throw new V070GameActionError(
      'Armistice must still be committed in the current battle when its effect applies.',
    );
  }

  const previousPositions = { ...battle.positions };
  const otherCommitments = battleCommitments(runtime)
    .filter(commitment => commitment.instanceId !== sourceInstanceId);

  // Armistice's destination instruction happens as part of its reveal effect,
  // before the ordinary late-withdrawal Aftermath clears the remaining Reserve.
  for (const commitment of otherCommitments) {
    removeCommitment(runtime, commitment);
    pushUnique(
      state.players[commitment.owner].zones.discardPile,
      commitment.instanceId,
    );
    appendV070Event(state, {
      type: 'armistice_battle_card_discarded',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_ARMISTICE_ID,
        targetInstanceId: commitment.instanceId,
        targetCardId: state.cardInstances[commitment.instanceId]?.cardId ?? null,
        targetOwner: commitment.owner,
        targetRole: commitment.role,
      },
    });
  }

  removeCommitment(runtime, source);
  pushUnique(state.players[owner].zones.graveyard, sourceInstanceId);
  appendV070Event(state, {
    type: 'armistice_battle_source_graveyarded',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ARMISTICE_ID,
      sourceRole: source.role,
    },
  });

  state.battle = resolveV070Withdrawal(battle, [battle.attacker]);
  runtime.pendingOutcome = null;
  runtime.stage = 'aftermath';
  runtime.armisticeWithdrawalResolved = true;

  // The core Gambit reveal path normally opens Training Grounds after reveal
  // effects finish. This battle has already ended, so suppress that redraw.
  runtime.trainingGroundsRedrawResolved = true;

  for (const playerId of ['A', 'B'] as const) {
    const from = previousPositions[playerId];
    const to = state.battle.positions[playerId];
    if (from !== to) {
      openV070BlockadeChoicesForPositionChange(state, playerId, from, to);
    }
  }

  // Armistice terminates this reveal stage. None of the cards it just removed
  // may continue through either the interference or ordinary reveal queue.
  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealDeferredOrdinaryCommitments = [];
  runtime.pendingRevealEffectClass = null;
  runtime.pendingRevealEffectEncounteredAt = null;
  runtime.pendingRevealEffectNextPlayer = null;
  runtime.pendingRevealForcedInstanceId = null;
  runtime.pendingRevealEffectOrderChoice = null;
  runtime.battleRevealChoices = [];
  runtime.battleRevealChoiceOpen = false;

  settleV070RefusedTermsWithoutWinner(state);

  appendV070Event(state, {
    type: 'armistice_battle_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_ARMISTICE_ID,
      attacker: battle.attacker,
      owner,
      discardedOtherBattleCardCount: otherCommitments.length,
      positions: { ...state.battle.positions },
    },
  });
}

function battleCommitments(
  runtime: NonNullable<V070GameState['battleRuntime']>,
): V070BattleCardCommitment[] {
  return (['A', 'B'] as const).flatMap(playerId => {
    const participant = runtime.participants[playerId];
    return [
      ...(participant.gambit ? [participant.gambit] : []),
      ...participant.additionalGambits,
      ...(participant.tactic ? [participant.tactic] : []),
      ...participant.additionalTactics,
    ];
  });
}

function removeCommitment(
  runtime: NonNullable<V070GameState['battleRuntime']>,
  commitment: V070BattleCardCommitment,
): void {
  const participant = runtime.participants[commitment.owner];
  if (commitment.role === 'gambit') {
    if (participant.gambit?.instanceId === commitment.instanceId) {
      participant.gambit = null;
    }
    participant.additionalGambits = participant.additionalGambits.filter(
      candidate => candidate.instanceId !== commitment.instanceId,
    );
    return;
  }

  if (participant.tactic?.instanceId === commitment.instanceId) {
    participant.tactic = null;
  }
  participant.additionalTactics = participant.additionalTactics.filter(
    candidate => candidate.instanceId !== commitment.instanceId,
  );
}

function pushUnique(target: string[], instanceId: string): void {
  if (!target.includes(instanceId)) target.push(instanceId);
}
