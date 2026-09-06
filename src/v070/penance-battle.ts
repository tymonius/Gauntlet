import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_PENANCE_ID = 'inquisition-penance' as const;
export const V070_PENANCE_BATTLE_TEXT =
  'The opponent chooses one: put one card from their Hand in their Graveyard; or +1 Battle Total.' as const;

export interface V070PenanceBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070PenanceAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_PENANCE_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_PENANCE_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Penance battle text drifted from released authority.',
    );
  }
}

validateV070PenanceAuthority();

export function registerV070PenanceBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Penance battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_PENANCE_ID) {
    throw new V070GameActionError(
      'Penance battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = [...state.players[opponent].zones.hand];
  if (candidates.length === 0) {
    applyV070PenanceBattleTotal(state, owner, opponent, sourceInstanceId, 'opponent_hand_empty');
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'penance',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  });
}

export function pendingV070PenanceBattleChoice(
  state: V070GameState,
): V070PenanceBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'penance' ? pending : null;
}

export function openV070PenanceBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070PenanceBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    state.players[pending.opponent].zones.hand.includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'penance');
    applyV070PenanceBattleTotal(
      state,
      pending.owner,
      pending.opponent,
      pending.sourceInstanceId,
      'original_hand_cards_no_longer_available',
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'penance_battle_choice_pending',
    actor: pending.opponent,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PENANCE_ID,
      effectOwner: pending.owner,
      opponent: pending.opponent,
      candidateCount: available.length,
      choices: ['graveyard_hand_card', 'battle_total'],
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'penance_battle_choice_options',
    actor: pending.opponent,
    visibility: pending.opponent,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      handInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070PenanceBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'graveyard' | 'battle_total',
  cardInstanceId?: string,
): void {
  const pending = pendingV070PenanceBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Penance battle choice is pending.',
    );
  }
  if (pending.opponent !== playerId) {
    throw new V070GameActionError(
      'Only the opponent targeted by Penance may resolve its choice.',
    );
  }

  if (choice === 'battle_total') {
    if (cardInstanceId) {
      throw new V070GameActionError(
        'Penance Battle Total choice does not select a Hand card.',
      );
    }
    completeV070BattleRevealChoice(state, 'penance');
    applyV070PenanceBattleTotal(
      state,
      pending.owner,
      pending.opponent,
      pending.sourceInstanceId,
      'opponent_chose_battle_total',
    );
    return;
  }

  if (!cardInstanceId
    || !pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Penance must choose a Hand card that was eligible when its battle effect took effect.',
    );
  }
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The selected Penance card is no longer in that player’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(cardInstanceId);
  completeV070BattleRevealChoice(state, 'penance');

  appendV070Event(state, {
    type: 'penance_battle_card_graveyarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PENANCE_ID,
      effectOwner: pending.owner,
      targetInstanceId: cardInstanceId,
      targetCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
    },
  });
}

function applyV070PenanceBattleTotal(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  reason: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Penance Battle Total requires an active battle runtime.',
    );
  }
  runtime.participants[owner].battleModifier += 1;
  appendV070Event(state, {
    type: 'penance_battle_total_gained',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_PENANCE_ID,
      opponent,
      battleTotalBonus: 1,
      reason,
    },
  });
}
