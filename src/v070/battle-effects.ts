import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as core from './battle-effects-core';
import {
  V070_DARK_OMENS_BATTLE_TEXT,
  V070_DARK_OMENS_ID,
  registerV070DarkOmensBattleEffect,
} from './dark-omens-battle';
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
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';

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

const darkOmensHandler: core.V070BattleEffectHandler = {
  cardId: V070_DARK_OMENS_ID,
  expectedText: V070_DARK_OMENS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070DarkOmensBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const specializedHandlers = new Map<string, core.V070BattleEffectHandler>([
  [landslideHandler.cardId, landslideHandler],
  [divineMercyHandler.cardId, divineMercyHandler],
  [darkOmensHandler.cardId, darkOmensHandler],
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
  // Validate the complete reveal before mutating live state. This preserves the
  // fail-closed contract even when core and specialized handlers share timing.
  const unsupported = commitments.flatMap(commitment =>
    unsupportedRevealEffect(state, commitment, encounteredAt)
  );
  if (unsupported.length > 0) return unsupported;

  for (const commitment of orderedRevealCommitments(state, commitments)) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    const card = v070CanonicalContent.cardsById.get(cardId);
    if (!card) throw new Error(`Unknown canonical card ${cardId}.`);

    if (v070MonasterySuppressesArcaneBattleEffects(state)
      && card.trait === 'Arcane') {
      appendV070Event(state, {
        type: 'battle_card_effect_suppressed',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
          reason: 'Monastery',
        },
      });
      continue;
    }

    const specialized = specializedHandlers.get(cardId);
    if (!specialized) {
      // Core resolves one commitment at a time here so specialized effects keep
      // their exact attacker/defender alternating position at shared timing.
      const coreUnsupported = core.resolveV070SupportedRevealEffects(
        state,
        [commitment],
        encounteredAt,
      );
      if (coreUnsupported.length > 0) {
        throw new Error(
          `Validated core battle effect became unsupported during resolution: ${cardId}.`,
        );
      }
      continue;
    }

    specialized.apply({
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
        timing: specialized.timing,
      },
    });
  }

  return [];
}

function unsupportedRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) throw new Error(`Unknown canonical card ${cardId}.`);

  if (v070MonasterySuppressesArcaneBattleEffects(state)
    && card.trait === 'Arcane') {
    return [];
  }

  const relevant = card.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  );
  if (relevant.length === 0) return [];

  const handler = v070BattleEffectHandler(cardId);
  if (handler
    && relevant.length === 1
    && relevant[0]?.text === handler.expectedText) {
    return [];
  }

  return relevant.map(effect => ({
    owner: commitment.owner,
    instanceId: commitment.instanceId,
    cardId,
    role: commitment.role,
    label: effect.label,
    text: effect.text,
    encounteredAt,
  }));
}

function orderedRevealCommitments(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
): V070BattleCardCommitment[] {
  const battle = state.battle;
  if (!battle) return [...commitments];

  const attackerQueue = commitments.filter(
    commitment => commitment.owner === battle.attacker,
  );
  const defenderQueue = commitments.filter(
    commitment => commitment.owner === battle.defender,
  );
  const ordered: V070BattleCardCommitment[] = [];
  while (attackerQueue.length > 0 || defenderQueue.length > 0) {
    const attackerCommitment = attackerQueue.shift();
    if (attackerCommitment) ordered.push(attackerCommitment);
    const defenderCommitment = defenderQueue.shift();
    if (defenderCommitment) ordered.push(defenderCommitment);
  }
  return ordered;
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
