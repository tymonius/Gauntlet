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

export const V070_TARIFFS_ID = 'financiers-tariffs' as const;
export const V070_TARIFFS_BATTLE_TEXT =
  'Your opponent may discard one card from Hand. If they do not, +1 Battle Total.' as const;

export interface V070TariffsBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

function validateV070TariffsAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_TARIFFS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_TARIFFS_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Tariffs battle text drifted from released authority.',
    );
  }
}

validateV070TariffsAuthority();

export function registerV070TariffsBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Tariffs battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_TARIFFS_ID) {
    throw new V070GameActionError(
      'Tariffs battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = [...state.players[opponent].zones.hand];
  if (candidates.length === 0) {
    applyV070TariffsBattleNoDiscardBonus(
      state,
      owner,
      opponent,
      sourceInstanceId,
      'opponent_hand_empty',
    );
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'tariffs',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  });
}

export function pendingV070TariffsBattleChoice(
  state: V070GameState,
): V070TariffsBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'tariffs'
    ? pending
    : null;
}

export function openV070TariffsBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070TariffsBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    state.players[pending.opponent].zones.hand.includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'tariffs');
    applyV070TariffsBattleNoDiscardBonus(
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
    type: 'tariffs_battle_choice_pending',
    actor: pending.opponent,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_TARIFFS_ID,
      effectOwner: pending.owner,
      opponent: pending.opponent,
      candidateCount: available.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'tariffs_battle_choice_options',
    actor: pending.opponent,
    visibility: pending.opponent,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      cardInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070TariffsBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId?: string,
): void {
  const pending = pendingV070TariffsBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Tariffs battle discard choice is pending.',
    );
  }
  if (pending.opponent !== playerId) {
    throw new V070GameActionError(
      'Only the opponent targeted by Tariffs may resolve its Hand-discard choice.',
    );
  }

  if (!cardInstanceId) {
    completeV070BattleRevealChoice(state, 'tariffs');
    applyV070TariffsBattleNoDiscardBonus(
      state,
      pending.owner,
      pending.opponent,
      pending.sourceInstanceId,
      'opponent_declined',
    );
    return;
  }

  if (!pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Tariffs must discard a card that was in the opponent’s Hand when its battle effect took effect.',
    );
  }
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The selected Tariffs card is no longer in that player’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.discardPile.push(cardInstanceId);
  completeV070BattleRevealChoice(state, 'tariffs');

  appendV070Event(state, {
    type: 'tariffs_battle_card_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_TARIFFS_ID,
      effectOwner: pending.owner,
      discardedInstanceId: cardInstanceId,
      discardedCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
      battleTotalBonusPrevented: 1,
    },
  });
}

function applyV070TariffsBattleNoDiscardBonus(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  reason: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Tariffs battle bonus requires an active battle runtime.',
    );
  }
  runtime.participants[owner].battleModifier += 1;
  appendV070Event(state, {
    type: 'tariffs_battle_no_discard_bonus',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_TARIFFS_ID,
      opponent,
      battleTotalBonus: 1,
      reason,
    },
  });
}
