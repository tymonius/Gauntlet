import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { drawV070Cards } from './card-draw';
import type { PlayerId } from './rules';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';
import { recordV070MysticBattleEffectApplied } from './mystics';

export const V070_DARK_OMENS_ID = 'mystics-dark-omens' as const;
export const V070_DARK_OMENS_BATTLE_TEXT =
  '+1 Card. You may put it in your Graveyard to gain Advantage.' as const;

export interface V070DarkOmensBattleChoiceRuntime {
  owner: PlayerId;
  sourceInstanceId: string;
  drawnInstanceId: string;
}

export interface V070DarkOmensBattleChoiceResult {
  playerId: PlayerId;
  sourceInstanceId: string;
  graveyardedInstanceId: string | null;
}

function validateV070DarkOmensAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_DARK_OMENS_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card
    || card.trait !== 'Arcane'
    || effect?.text !== V070_DARK_OMENS_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Dark Omens battle text drifted from released authority.',
    );
  }
}

validateV070DarkOmensAuthority();

export function registerV070DarkOmensBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  if (!state.battle || !state.battleRuntime) {
    throw new V070GameActionError(
      'Dark Omens battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_DARK_OMENS_ID) {
    throw new V070GameActionError(
      'Dark Omens battle source does not match the revealed card instance.',
    );
  }

  const draw = drawV070Cards(
    state,
    owner,
    1,
    'Dark Omens battle effect',
  );
  state.players[owner].zones.hand.push(...draw.drawn);
  appendV070Event(state, {
    type: 'cards_drawn',
    actor: owner,
    visibility: 'public',
    payload: {
      count: draw.drawn.length,
      purpose: 'Dark Omens battle effect',
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  if (draw.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: owner,
      visibility: owner,
      payload: {
        cardInstanceIds: [...draw.drawn],
        purpose: 'Dark Omens battle effect',
      },
    });
  }

  const drawnInstanceId = draw.drawn[0];
  if (!drawnInstanceId) {
    appendV070Event(state, {
      type: 'dark_omens_battle_choice_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_DARK_OMENS_ID,
        reason: 'no_card_drawn',
      },
    });
    recordV070MysticBattleEffectApplied(
      state,
      owner,
      sourceInstanceId,
    );
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'dark_omens',
    owner,
    sourceInstanceId,
    drawnInstanceId,
  });
}

export function pendingV070DarkOmensBattleChoice(
  state: V070GameState,
): V070DarkOmensBattleChoiceRuntime | null {
  const pending = pendingV070BattleRevealChoice(state);
  return pending?.kind === 'dark_omens'
    ? pending
    : null;
}

export function openV070DarkOmensBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070DarkOmensBattleChoice(state);
  if (!pending) return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const stillInHand = state.players[pending.owner].zones.hand.includes(
    pending.drawnInstanceId,
  );
  if (!stillInHand) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'dark_omens');
    appendV070Event(state, {
      type: 'dark_omens_battle_choice_unavailable',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_DARK_OMENS_ID,
        reason: 'drawn_card_no_longer_in_hand',
      },
    });
    recordV070MysticBattleEffectApplied(
      state,
      pending.owner,
      pending.sourceInstanceId,
    );
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'dark_omens_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'dark_omens_battle_choice_options',
    actor: pending.owner,
    visibility: pending.owner,
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      drawnInstanceId: pending.drawnInstanceId,
      drawnCardId:
        state.cardInstances[pending.drawnInstanceId]?.cardId ?? null,
    },
  });
  return true;
}

export function resolveV070DarkOmensBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
): V070DarkOmensBattleChoiceResult {
  const pending = pendingV070DarkOmensBattleChoice(state);
  if (!pending || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Dark Omens battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Dark Omens owner may resolve its optional battle effect.',
    );
  }

  let graveyardedInstanceId: string | null = null;
  if (use) {
    const hand = state.players[playerId].zones.hand;
    const index = hand.indexOf(pending.drawnInstanceId);
    if (index < 0) {
      throw new V070GameActionError(
        'Dark Omens can put only the card it just drew in your Graveyard.',
      );
    }
    hand.splice(index, 1);
    state.players[playerId].zones.graveyard.push(pending.drawnInstanceId);
    state.battleRuntime!.participants[playerId].advantage += 1;
    graveyardedInstanceId = pending.drawnInstanceId;

    appendV070Event(state, {
      type: 'dark_omens_battle_card_graveyarded',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_DARK_OMENS_ID,
        targetInstanceId: pending.drawnInstanceId,
        targetCardId:
          state.cardInstances[pending.drawnInstanceId]?.cardId ?? null,
        advantageGained: 1,
      },
    });
  } else {
    appendV070Event(state, {
      type: 'dark_omens_battle_choice_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_DARK_OMENS_ID,
      },
    });
  }

  completeV070BattleRevealChoice(state, 'dark_omens');
  recordV070MysticBattleEffectApplied(
    state,
    playerId,
    pending.sourceInstanceId,
  );

  return {
    playerId,
    sourceInstanceId: pending.sourceInstanceId,
    graveyardedInstanceId,
  };
}
