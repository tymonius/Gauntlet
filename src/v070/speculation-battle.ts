import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  gainV070Capital,
  spendV070Capital,
} from './financiers';
import {
  completeV070BattleRevealChoice,
  isV070BattleRevealChoiceOpen,
  markV070BattleRevealChoiceOpen,
  pendingV070BattleRevealChoice,
  queueV070BattleRevealChoice,
} from './battle-reveal-choices';

export const V070_SPECULATION_ID = 'financiers-speculation' as const;
export const V070_SPECULATION_BATTLE_TEXT =
  'If you initiated this battle, you may spend 1 Capital. If you do, in the Aftermath: Win — +2 Capital. Otherwise — put this card in your Graveyard.' as const;

export interface V070SpeculationAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    speculationAftermathEffects?: V070SpeculationAftermathEffect[];
  }
}

function validateV070SpeculationAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_SPECULATION_ID);
  const effect = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (!card || effect?.text !== V070_SPECULATION_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Speculation battle text drifted from released authority.',
    );
  }
}

validateV070SpeculationAuthority();

export function registerV070SpeculationBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Speculation battle resolution requires an active battle.',
    );
  }
  if (state.cardInstances[sourceInstanceId]?.owner !== owner
    || state.cardInstances[sourceInstanceId]?.cardId !== V070_SPECULATION_ID) {
    throw new V070GameActionError(
      'Speculation battle source does not match the revealed card instance.',
    );
  }

  if (battle.attacker !== owner) {
    appendV070Event(state, {
      type: 'speculation_battle_choice_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_SPECULATION_ID,
        reason: 'owner_did_not_initiate_battle',
      },
    });
    return;
  }

  const financier = state.players[owner].financiers;
  if (!financier || financier.capital < 1) {
    appendV070Event(state, {
      type: 'speculation_battle_choice_unavailable',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_SPECULATION_ID,
        reason: financier ? 'insufficient_capital' : 'owner_has_no_capital_resource',
      },
    });
    return;
  }

  queueV070BattleRevealChoice(state, {
    kind: 'speculation',
    owner,
    sourceInstanceId,
  });
}

export function openV070SpeculationBattleChoice(
  state: V070GameState,
): boolean {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'speculation') return false;
  if (isV070BattleRevealChoiceOpen(state)) return true;

  const financier = state.players[pending.owner].financiers;
  if (!financier || financier.capital < 1) {
    markV070BattleRevealChoiceOpen(state);
    completeV070BattleRevealChoice(state, 'speculation');
    appendV070Event(state, {
      type: 'speculation_battle_choice_unavailable',
      actor: pending.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_SPECULATION_ID,
        reason: financier ? 'capital_no_longer_available' : 'owner_has_no_capital_resource',
      },
    });
    return false;
  }

  markV070BattleRevealChoiceOpen(state);
  appendV070Event(state, {
    type: 'speculation_battle_choice_pending',
    actor: pending.owner,
    visibility: 'public',
    payload: {
      playerId: pending.owner,
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_SPECULATION_ID,
      cost: 1,
      optional: true,
    },
  });
  return true;
}

export function resolveV070SpeculationBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  use: boolean,
): void {
  const pending = pendingV070BattleRevealChoice(state);
  if (pending?.kind !== 'speculation'
    || !isV070BattleRevealChoiceOpen(state)) {
    throw new V070GameActionError(
      'No Speculation battle choice is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Speculation owner may resolve its optional Capital spend.',
    );
  }

  if (!use) {
    completeV070BattleRevealChoice(state, 'speculation');
    appendV070Event(state, {
      type: 'speculation_battle_choice_declined',
      actor: playerId,
      visibility: 'public',
      payload: {
        sourceInstanceId: pending.sourceInstanceId,
        sourceCardId: V070_SPECULATION_ID,
      },
    });
    return;
  }

  spendV070Capital(
    state,
    playerId,
    1,
    'Speculation battle effect',
  );
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new V070GameActionError(
      'Speculation requires an active battle runtime.',
    );
  }
  runtime.speculationAftermathEffects ??= [];
  runtime.speculationAftermathEffects.push({
    owner: playerId,
    sourceInstanceId: pending.sourceInstanceId,
  });
  completeV070BattleRevealChoice(state, 'speculation');

  appendV070Event(state, {
    type: 'speculation_battle_capital_spent',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: V070_SPECULATION_ID,
      amount: 1,
    },
  });
}

export function applyV070SpeculationAftermathEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath') return;
  const effects = runtime.speculationAftermathEffects ?? [];
  if (effects.length === 0) return;

  runtime.speculationAftermathEffects = [];
  for (const effect of effects) {
    if (battle.winner === effect.owner) {
      gainV070Capital(
        state,
        effect.owner,
        2,
        'Speculation battle Aftermath',
      );
      appendV070Event(state, {
        type: 'speculation_battle_capital_gained',
        actor: effect.owner,
        visibility: 'public',
        payload: {
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: V070_SPECULATION_ID,
          amount: 2,
        },
      });
      continue;
    }

    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_SPECULATION_ID,
      playerId: effect.owner,
      instanceId: effect.sourceInstanceId,
      destination: 'graveyard',
    });
    appendV070Event(state, {
      type: 'speculation_battle_graveyard_scheduled',
      actor: effect.owner,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        sourceCardId: V070_SPECULATION_ID,
        reason: battle.winner ? 'owner_lost' : 'no_battle_winner',
      },
    });
  }
}
