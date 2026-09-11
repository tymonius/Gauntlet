import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as previous from './battle-effects-core-pre-counterworks-authority';
import {
  V070_COUNTERWORKS_BATTLE_TEXT,
  V070_COUNTERWORKS_ID,
  registerV070CounterworksBattleEffect,
} from './counterworks-battle';

export * from './battle-effects-core-pre-counterworks-authority';

const counterworksHandler: previous.V070BattleEffectHandler = {
  cardId: V070_COUNTERWORKS_ID,
  expectedText: V070_COUNTERWORKS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070CounterworksBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  V070_COUNTERWORKS_ID,
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  if (cardId === V070_COUNTERWORKS_ID) return counterworksHandler;
  return previous.v070BattleEffectHandler(cardId);
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const unsupported = commitments.flatMap(commitment =>
    unsupportedCounterworksCommitment(state, commitment, encounteredAt)
  );
  if (unsupported.length > 0) return unsupported;

  for (const commitment of commitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    if (cardId !== V070_COUNTERWORKS_ID) {
      const forwarded = previous.resolveV070SupportedRevealEffects(
        state,
        [commitment],
        encounteredAt,
      );
      if (forwarded.length > 0) return forwarded;
      continue;
    }

    counterworksHandler.apply({
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
        timing: 'reveal',
      },
    });
  }
  return [];
}

function unsupportedCounterworksCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  if (cardId !== V070_COUNTERWORKS_ID) return [];
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) {
    return [{
      owner: commitment.owner,
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      label: 'Gambit/Tactic',
      text: 'Unknown canonical card.',
      encounteredAt,
    }];
  }
  const relevant = card.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  );
  if (relevant.length === 1
    && relevant[0]?.text === V070_COUNTERWORKS_BATTLE_TEXT) {
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
