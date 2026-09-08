import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as previous from './battle-effects-pre-accusation';
import { isV070BattleCardEffectNegated } from './battle-effect-status';
import {
  V070_ACCUSATION_BATTLE_TEXT,
  V070_ACCUSATION_ID,
  registerV070AccusationBattleEffect,
} from './accusation-battle';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';

export * from './battle-effects-pre-accusation';

const accusationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_ACCUSATION_ID,
  expectedText: V070_ACCUSATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070AccusationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  V070_ACCUSATION_ID,
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  if (cardId === V070_ACCUSATION_ID) return accusationHandler;
  return previous.v070BattleEffectHandler(cardId);
}

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (cardId === V070_ACCUSATION_ID) return 'ordinary';
  return previous.v070BattleRevealEffectClass(cardId);
}

export function v070BattleRoleSupportsPreReveal(
  state: V070GameState,
  role: 'gambit' | 'tactic',
): boolean {
  const runtime = state.battleRuntime;
  if (!runtime) return false;
  const commitments = (['A', 'B'] as const).flatMap(playerId => {
    const participant = runtime.participants[playerId];
    return role === 'gambit'
      ? [
          ...(participant.gambit ? [participant.gambit] : []),
          ...participant.additionalGambits,
        ]
      : [
          ...(participant.tactic ? [participant.tactic] : []),
          ...participant.additionalTactics,
        ];
  });
  return commitments.every(commitment =>
    unsupportedRevealEffect(state, commitment, role).length === 0
  );
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: 'reveal_gambits' | 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const role = encounteredAt === 'reveal_gambits' ? 'gambit' : 'tactic';
  const unsupported = commitments.flatMap(commitment =>
    unsupportedRevealEffect(state, commitment, role, encounteredAt)
  );
  if (unsupported.length > 0) return unsupported;

  const forwarded: V070BattleCardCommitment[] = [];
  for (const commitment of commitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    if (cardId !== V070_ACCUSATION_ID) {
      forwarded.push(commitment);
      continue;
    }

    if (isV070BattleCardEffectNegated(state, commitment.instanceId)) {
      appendV070Event(state, {
        type: 'battle_card_effect_skipped_negated',
        actor: commitment.owner,
        visibility: 'public',
        payload: {
          instanceId: commitment.instanceId,
          cardId,
          role: commitment.role,
        },
      });
      continue;
    }

    const alreadyRegistered = Boolean(
      state.battleRuntime?.accusationBattleSourceInstanceIds?.includes(
        commitment.instanceId,
      ),
    );
    if (!alreadyRegistered) {
      accusationHandler.apply({
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
          revealClass: 'ordinary',
          deferredUntil: 'aftermath',
        },
      });
    }
  }

  if (forwarded.length === 0) return [];
  return previous.resolveV070SupportedRevealEffects(
    state,
    forwarded,
    encounteredAt,
  );
}

function unsupportedRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  role: 'gambit' | 'tactic',
  encounteredAt: 'reveal_gambits' | 'reveal_tactics' =
    role === 'gambit' ? 'reveal_gambits' : 'reveal_tactics',
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) {
    return [{
      owner: commitment.owner,
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      label: role === 'gambit' ? 'Gambit' : 'Tactic',
      text: 'Unknown canonical card.',
      encounteredAt,
    }];
  }
  if (card.trait === 'Arcane'
    && v070MonasterySuppressesArcaneBattleEffects(state)) {
    return [];
  }

  const relevant = card.effects.filter(effect =>
    effect.label === (role === 'gambit' ? 'Gambit' : 'Tactic')
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
