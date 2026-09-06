import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as core from './battle-effects-core';
import {
  V070_LANDSLIDE_BATTLE_TEXT,
  registerV070LandslideBattleEffect,
} from './landslide';
import { applyV070BattleRetreatStep } from './retreat-step';

export type {
  V070BattleEffectContext,
  V070BattleEffectHandler,
  V070BattleEffectTiming,
} from './battle-effects-core';
export {
  resolveV070AftermathDrawEffects,
  resolveV070UnbrokenRanksCommand,
} from './battle-effects-core';

const landslideHandler: core.V070BattleEffectHandler = {
  cardId: 'neutral-landslide',
  expectedText: V070_LANDSLIDE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070LandslideBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...core.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  'neutral-landslide',
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): core.V070BattleEffectHandler | undefined {
  return cardId === 'neutral-landslide'
    ? landslideHandler
    : core.v070BattleEffectHandler(cardId);
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const landslides = commitments.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === 'neutral-landslide'
  );
  const remaining = commitments.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId !== 'neutral-landslide'
  );

  if (remaining.length > 0) {
    // Probe on a clone first so an unrelated unsupported reveal still preserves
    // the registry's existing all-or-nothing application guarantee.
    const probe = structuredClone(state) as V070GameState;
    const unsupported = core.resolveV070SupportedRevealEffects(
      probe,
      remaining,
      encounteredAt,
    );
    if (unsupported.length > 0) return unsupported;

    core.resolveV070SupportedRevealEffects(
      state,
      remaining,
      encounteredAt,
    );
  }

  for (const commitment of landslides) {
    const card = v070CanonicalContent.cardsById.get('neutral-landslide');
    const relevant = card?.effects.filter(effect =>
      effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
      || effect.label === 'Gambit/Tactic'
    ) ?? [];
    if (relevant.length !== 1
      || relevant[0]?.text !== V070_LANDSLIDE_BATTLE_TEXT) {
      return [{
        owner: commitment.owner,
        instanceId: commitment.instanceId,
        cardId: 'neutral-landslide',
        role: commitment.role,
        label: relevant[0]?.label ?? 'Gambit/Tactic',
        text: relevant[0]?.text ?? '',
        encounteredAt,
      }];
    }
  }

  for (const commitment of landslides) {
    landslideHandler.apply({
      state,
      owner: commitment.owner,
      opponent: commitment.owner === 'A' ? 'B' : 'A',
      commitment,
    });
    appendV070Event(state, {
      type: 'battle_card_effect_applied',
      actor: commitment.owner,
      visibility: 'public',
      payload: {
        instanceId: commitment.instanceId,
        cardId: 'neutral-landslide',
        role: commitment.role,
        timing: 'reveal',
      },
    });
  }

  return [];
}

export function applyV070BattleCardAdditionalRetreats(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !battle.loser) return;

  const loser = battle.loser;
  for (const effect of runtime.additionalRetreatEffects) {
    if (effect.targetPlayer !== loser) continue;
    for (let step = 0; step < effect.steps; step += 1) {
      const result = applyV070BattleRetreatStep(
        state,
        loser,
        {
          kind: 'battle_card',
          label: effect.sourceCardId,
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: effect.sourceCardId,
        },
      );
      if (!result.moved) break;

      appendV070Event(state, {
        type: 'battle_card_aftermath_retreat',
        actor: loser,
        visibility: 'public',
        payload: {
          sourceInstanceId: effect.sourceInstanceId,
          sourceCardId: effect.sourceCardId,
          loser,
          from: result.from,
          to: result.to,
          additionalRetreat: 1,
        },
      });
    }
  }
}
