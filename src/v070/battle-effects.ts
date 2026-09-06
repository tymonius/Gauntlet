import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as core from './battle-effects-core';
import {
  V070_DIVINE_MERCY_BATTLE_TEXT,
  V070_DIVINE_MERCY_ID,
  registerV070DivineMercyBattleEffect,
} from './divine-mercy-battle';
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

const divineMercyHandler: core.V070BattleEffectHandler = {
  cardId: V070_DIVINE_MERCY_ID,
  expectedText: V070_DIVINE_MERCY_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070DivineMercyBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const specializedHandlers = new Map<string, core.V070BattleEffectHandler>([
  [landslideHandler.cardId, landslideHandler],
  [divineMercyHandler.cardId, divineMercyHandler],
]);

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...core.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  ...specializedHandlers.keys(),
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): core.V070BattleEffectHandler | undefined {
  return specializedHandlers.get(cardId)
    ?? core.v070BattleEffectHandler(cardId);
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const specialized = commitments.filter(commitment =>
    specializedHandlers.has(
      state.cardInstances[commitment.instanceId]?.cardId ?? '',
    )
  );
  const remaining = commitments.filter(commitment =>
    !specializedHandlers.has(
      state.cardInstances[commitment.instanceId]?.cardId ?? '',
    )
  );

  // Preserve the registry's all-or-nothing reveal guarantee. Validate every
  // core and specialized effect before any current state is mutated.
  if (remaining.length > 0) {
    const probe = structuredClone(state) as V070GameState;
    const unsupported = core.resolveV070SupportedRevealEffects(
      probe,
      remaining,
      encounteredAt,
    );
    if (unsupported.length > 0) return unsupported;
  }

  for (const commitment of specialized) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    const handler = specializedHandlers.get(cardId);
    const card = v070CanonicalContent.cardsById.get(cardId);
    const relevant = card?.effects.filter(effect =>
      effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
      || effect.label === 'Gambit/Tactic'
    ) ?? [];
    if (!handler
      || relevant.length !== 1
      || relevant[0]?.text !== handler.expectedText) {
      return [{
        owner: commitment.owner,
        instanceId: commitment.instanceId,
        cardId,
        role: commitment.role,
        label: relevant[0]?.label ?? 'Gambit/Tactic',
        text: relevant[0]?.text ?? '',
        encounteredAt,
      }];
    }
  }

  if (remaining.length > 0) {
    core.resolveV070SupportedRevealEffects(
      state,
      remaining,
      encounteredAt,
    );
  }

  for (const commitment of orderedSpecializedCommitments(state, specialized)) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    const handler = specializedHandlers.get(cardId)!;
    handler.apply({
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
        cardId,
        role: commitment.role,
        timing: handler.timing,
      },
    });
  }

  return [];
}

function orderedSpecializedCommitments(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
): V070BattleCardCommitment[] {
  const battle = state.battle;
  if (!battle) return [...commitments];
  return [battle.attacker, battle.defender].flatMap(owner =>
    commitments.filter(commitment => commitment.owner === owner)
  );
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
