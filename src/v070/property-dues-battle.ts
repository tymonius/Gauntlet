import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  gainV070Capital,
  v070DeedOwner,
} from './financiers';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_PROPERTY_DUES_ID = 'financiers-property-dues' as const;
export const V070_PROPERTY_DUES_BATTLE_TEXT =
  'If this battle takes place on a Territory whose Deed you own, your opponent chooses one: discard one card from Hand; or +3 Capital in the Aftermath.' as const;

export interface V070PropertyDuesBattleChoiceRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
}

export interface V070PropertyDuesAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
  amount: 3;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    propertyDuesAftermathEffects?: V070PropertyDuesAftermathEffect[];
  }
}

function validateV070PropertyDuesAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_PROPERTY_DUES_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_PROPERTY_DUES_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Property Dues battle text drifted from released authority.',
    );
  }
}

validateV070PropertyDuesAuthority();

export function registerV070PropertyDuesBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Property Dues battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_PROPERTY_DUES_ID) {
    throw new V070GameActionError(
      'Property Dues battle source does not match the revealed card instance.',
    );
  }

  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory
    || v070DeedOwner(state, territory.territoryInstanceId) !== owner) {
    appendV070Event(state, {
      type: 'property_dues_battle_condition_not_met',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_PROPERTY_DUES_ID,
        contestedPosition: battle.contestedPosition,
      },
    });
    return;
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const candidates = [...state.players[opponent].zones.hand];
  if (candidates.length === 0) {
    scheduleV070PropertyDuesCapital(
      state,
      owner,
      opponent,
      sourceInstanceId,
      'opponent_hand_empty',
    );
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'property_dues',
    owner,
    opponent,
    sourceInstanceId,
    candidateInstanceIds: candidates,
  });
}

export function pendingV070PropertyDuesBattleChoice(
  state: V070GameState,
): V070PropertyDuesBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'property_dues' ? pending : null;
}

export function openV070PropertyDuesBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070PropertyDuesBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const available = pending.candidateInstanceIds.filter(instanceId =>
    state.players[pending.opponent].zones.hand.includes(instanceId)
  );
  if (available.length === 0) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'property_dues');
    scheduleV070PropertyDuesCapital(
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
    type: 'property_dues_battle_choice_pending',
    actor: pending.opponent,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PROPERTY_DUES_ID,
      effectOwner: pending.owner,
      opponent: pending.opponent,
      candidateCount: available.length,
      choices: ['discard_hand_card', 'capital_in_aftermath'],
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'property_dues_battle_choice_options',
    actor: pending.opponent,
    visibility: pending.opponent,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      handInstanceIds: [...available],
    },
  });
  return true;
}

export function resolveV070PropertyDuesBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'discard' | 'capital',
  cardInstanceId?: string,
): void {
  const pending = pendingV070PropertyDuesBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Property Dues battle choice is pending.',
    );
  }
  if (pending.opponent !== playerId) {
    throw new V070GameActionError(
      'Only the opponent targeted by Property Dues may resolve its choice.',
    );
  }

  if (choice === 'capital') {
    if (cardInstanceId) {
      throw new V070GameActionError(
        'Property Dues Capital choice does not select a Hand card.',
      );
    }
    completeV070BattleRevealChoice(state, 'property_dues');
    scheduleV070PropertyDuesCapital(
      state,
      pending.owner,
      pending.opponent,
      pending.sourceInstanceId,
      'opponent_chose_capital',
    );
    return;
  }

  if (!cardInstanceId
    || !pending.candidateInstanceIds.includes(cardInstanceId)) {
    throw new V070GameActionError(
      'Property Dues must choose a Hand card that was eligible when its battle effect took effect.',
    );
  }
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The selected Property Dues card is no longer in that player’s Hand.',
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.discardPile.push(cardInstanceId);
  completeV070BattleRevealChoice(state, 'property_dues');

  appendV070Event(state, {
    type: 'property_dues_battle_card_discarded',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_PROPERTY_DUES_ID,
      effectOwner: pending.owner,
      targetInstanceId: cardInstanceId,
      targetCardId: state.cardInstances[cardInstanceId]?.cardId ?? null,
    },
  });
}

export function applyV070PropertyDuesAftermathEffects(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return;
  const effects = runtime.propertyDuesAftermathEffects ?? [];
  if (effects.length === 0) return;

  runtime.propertyDuesAftermathEffects = [];
  for (const effect of effects) {
    gainV070Capital(
      state,
      effect.owner,
      effect.amount,
      'Property Dues battle Aftermath',
    );
    appendV070Event(state, {
      type: 'property_dues_battle_capital_gained',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_PROPERTY_DUES_ID,
        amount: effect.amount,
      },
    });
  }
}

function scheduleV070PropertyDuesCapital(
  state: V070GameState,
  owner: PlayerId,
  opponent: PlayerId,
  sourceInstanceId: string,
  reason: string,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Property Dues Capital scheduling requires an active battle runtime.',
    );
  }
  runtime.propertyDuesAftermathEffects ??= [];
  runtime.propertyDuesAftermathEffects.push({
    owner,
    sourceInstanceId,
    amount: 3,
  });
  appendV070Event(state, {
    type: 'property_dues_battle_capital_scheduled',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_PROPERTY_DUES_ID,
      opponent,
      amount: 3,
      reason,
    },
  });
}
