import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import { assertV070GraveyardExitAllowed } from './territories';

export const V070_DIVINE_MERCY_ID = 'inquisition-divine-mercy' as const;
export const V070_DIVINE_MERCY_BATTLE_TEXT =
  "Move one card from the opponent's Graveyard to their Discard Pile. +2 Battle Total." as const;

export interface V070DivineMercyBattleEffectRuntime {
  owner: PlayerId;
  opponent: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    divineMercyBattleQueue?: V070DivineMercyBattleEffectRuntime[];
    divineMercyBattleChoiceOpen?: boolean;
  }
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

  runtime.divineMercyBattleQueue ??= [];
  if (!runtime.divineMercyBattleQueue.some(effect =>
    effect.sourceInstanceId === sourceInstanceId
  )) {
    runtime.divineMercyBattleQueue.push({
      owner,
      opponent,
      sourceInstanceId,
    });
  }
}

export function pendingV070DivineMercyBattleChoice(
  state: V070GameState,
): V070DivineMercyBattleEffectRuntime | null {
  return state.battleRuntime?.divineMercyBattleQueue?.[0] ?? null;
}

/**
 * Open the next Divine Mercy recycle choice. Effects whose opponent no longer
 * has a Graveyard card resolve as far as able and leave the +2 Battle Total in
 * place. The queue preserves reveal shared-timing order.
 */
export function openV070DivineMercyBattleChoice(
  state: V070GameState,
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  runtime.divineMercyBattleQueue ??= [];

  while (runtime.divineMercyBattleQueue.length > 0) {
    const pending = runtime.divineMercyBattleQueue[0];
    const candidates = state.players[pending.opponent].zones.graveyard;
    if (candidates.length === 0) {
      runtime.divineMercyBattleQueue.shift();
      runtime.divineMercyBattleChoiceOpen = false;
      appendV070Event(state, {
        type: 'divine_mercy_battle_recycle_unavailable',
        actor: pending.owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: pending.sourceInstanceId,
          sourceCardId: V070_DIVINE_MERCY_ID,
          opponent: pending.opponent,
          reason: 'opponent_graveyard_empty',
        },
      });
      continue;
    }

    if (!runtime.divineMercyBattleChoiceOpen) {
      runtime.divineMercyBattleChoiceOpen = true;
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
    }
    return true;
  }

  runtime.divineMercyBattleChoiceOpen = false;
  return false;
}

export function resolveV070DivineMercyBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const pending = pendingV070DivineMercyBattleChoice(state);
  if (!runtime || !pending || !runtime.divineMercyBattleChoiceOpen) {
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
  runtime.divineMercyBattleQueue!.shift();
  runtime.divineMercyBattleChoiceOpen = false;

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
