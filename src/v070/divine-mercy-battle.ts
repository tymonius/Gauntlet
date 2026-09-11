import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { assertV070GraveyardExitAllowed } from './territories';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_DIVINE_MERCY_ID = 'inquisition-divine-mercy' as const;
export const V070_DIVINE_MERCY_BATTLE_TEXT =
  "Move one card from the opponent's Graveyard to their Discard Pile. +2 Battle Total." as const;

export interface V070DivineMercyBattleEffectRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
}

function validateV070DivineMercyAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_DIVINE_MERCY_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_DIVINE_MERCY_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Divine Mercy battle text drifted from released authority.',
    );
  }
}

validateV070DivineMercyAuthority();

export function registerV070DivineMercyBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Divine Mercy battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_DIVINE_MERCY_ID) {
    throw new V070GameActionError(
      'Divine Mercy battle source does not match the revealed card instance.',
    );
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  runtime.participants[owner].battleModifier += 2;
  appendV070Event(state, {
    type: 'divine_mercy_battle_bonus_applied',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_DIVINE_MERCY_ID,
      battleTotalBonus: 2,
    },
  });

  if (state.players[opponent].zones.graveyard.length === 0) {
    appendV070Event(state, {
      type: 'divine_mercy_battle_recycle_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_DIVINE_MERCY_ID,
        opponent,
        reason: 'opponent_graveyard_empty',
      },
    });
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'divine_mercy',
    owner,
    opponent,
    sourceInstanceId,
  });
}

export function pendingV070DivineMercyBattleChoice(
  state: V070GameState,
): V070DivineMercyBattleEffectRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'divine_mercy'
    ? pending
    : null;
}

export function openV070DivineMercyBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070DivineMercyBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  markV070BattleRevealChoiceOpen(state);
  const candidates = state.players[pending.opponent].zones.graveyard;
  if (candidates.length === 0) {
    // A prior shared-timing effect may have removed the last candidate after
    // Divine Mercy was queued. Resolve this instruction as far as able.
    completeV070BattleRevealChoice(state, 'divine_mercy');
    appendV070Event(state, {
      type: 'divine_mercy_battle_recycle_unavailable',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_DIVINE_MERCY_ID,
        opponent: pending.opponent,
        reason: 'opponent_graveyard_became_empty',
      },
    });
    return false;
  }

  appendV070Event(state, {
    type: 'divine_mercy_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      opponent: pending.opponent,
      sourceInstanceId: pending.sourceInstanceId,
      candidateCount: candidates.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'divine_mercy_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      targetInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070DivineMercyBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const pending = pendingV070DivineMercyBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Divine Mercy battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Divine Mercy owner may choose the opposing Graveyard card.',
    );
  }

  const graveyard = state.players[pending.opponent].zones.graveyard;
  const index = graveyard.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      "Divine Mercy must choose a card in the opponent's Graveyard.",
    );
  }

  assertV070GraveyardExitAllowed(state, 'Divine Mercy');
  graveyard.splice(index, 1);
  state.players[pending.opponent].zones.discardPile.push(targetInstanceId);
  completeV070BattleRevealChoice(state, 'divine_mercy');

  appendV070Event(state, {
    type: 'divine_mercy_battle_recycled',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_DIVINE_MERCY_ID,
      opponent: pending.opponent,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId,
    },
  });
}
