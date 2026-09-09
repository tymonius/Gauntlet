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
import {
  V070_ACT_OF_FAITH_BATTLE_TEXT,
  V070_ACT_OF_FAITH_ID,
  registerV070ActOfFaithBattleEffect,
} from './act-of-faith-battle';
import {
  V070_BOMBARDMENT_BATTLE_TEXT,
  V070_BOMBARDMENT_ID,
  applyV070BombardmentBattleEffect,
} from './bombardment-battle';
import {
  V070_BROTHERS_IN_ARMS_BATTLE_TEXT,
  V070_BROTHERS_IN_ARMS_ID,
} from './brothers-in-arms-battle';
import {
  V070_BURNING_AT_THE_STAKE_BATTLE_TEXT,
  V070_BURNING_AT_THE_STAKE_ID,
  registerV070BurningAtTheStakeBattleEffect,
} from './burning-at-the-stake-battle';
import {
  V070_CAPITAL_GAINS_BATTLE_TEXT,
  V070_CAPITAL_GAINS_ID,
  applyV070CapitalGainsBattleEffect,
} from './capital-gains-battle';
import {
  registerV070DeferredBattleAftermathCarrier,
} from './battle-aftermath-carrier';
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
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_ACCUSATION_ID,
    );
  },
};

const actOfFaithHandler: previous.V070BattleEffectHandler = {
  cardId: V070_ACT_OF_FAITH_ID,
  expectedText: V070_ACT_OF_FAITH_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ActOfFaithBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_ACT_OF_FAITH_ID,
    );
  },
};

const bombardmentHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BOMBARDMENT_ID,
  expectedText: V070_BOMBARDMENT_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    applyV070BombardmentBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

// Brothers in Arms begins resolving when it is chosen as a Tactic. Its
// optional additional-Tactic permission and destination override are therefore
// already installed before the normal reveal stage. The reveal handler is an
// authority marker/no-op so normal unsupported-effect preflight does not halt.
const brothersInArmsHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BROTHERS_IN_ARMS_ID,
  expectedText: V070_BROTHERS_IN_ARMS_BATTLE_TEXT,
  timing: 'reveal',
  apply: () => {},
};

const burningAtTheStakeHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BURNING_AT_THE_STAKE_ID,
  expectedText: V070_BURNING_AT_THE_STAKE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070BurningAtTheStakeBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_BURNING_AT_THE_STAKE_ID,
    );
  },
};

const capitalGainsHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CAPITAL_GAINS_ID,
  expectedText: V070_CAPITAL_GAINS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    applyV070CapitalGainsBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  V070_ACCUSATION_ID,
  V070_ACT_OF_FAITH_ID,
  V070_BOMBARDMENT_ID,
  V070_BROTHERS_IN_ARMS_ID,
  V070_BURNING_AT_THE_STAKE_ID,
  V070_CAPITAL_GAINS_ID,
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  if (cardId === V070_ACCUSATION_ID) return accusationHandler;
  if (cardId === V070_ACT_OF_FAITH_ID) return actOfFaithHandler;
  if (cardId === V070_BOMBARDMENT_ID) return bombardmentHandler;
  if (cardId === V070_BROTHERS_IN_ARMS_ID) return brothersInArmsHandler;
  if (cardId === V070_BURNING_AT_THE_STAKE_ID) {
    return burningAtTheStakeHandler;
  }
  if (cardId === V070_CAPITAL_GAINS_ID) return capitalGainsHandler;
  return previous.v070BattleEffectHandler(cardId);
}

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (cardId === V070_ACCUSATION_ID
    || cardId === V070_ACT_OF_FAITH_ID
    || cardId === V070_BOMBARDMENT_ID
    || cardId === V070_BROTHERS_IN_ARMS_ID
    || cardId === V070_BURNING_AT_THE_STAKE_ID
    || cardId === V070_CAPITAL_GAINS_ID) {
    return 'ordinary';
  }
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
    const deferred = cardId === V070_ACCUSATION_ID
      ? {
          registered: state.battleRuntime?.accusationBattleSourceInstanceIds
            ?.includes(commitment.instanceId) ?? false,
          handler: accusationHandler,
        }
      : cardId === V070_ACT_OF_FAITH_ID
        ? {
            registered: state.battleRuntime?.actOfFaithBattleSourceInstanceIds
              ?.includes(commitment.instanceId) ?? false,
            handler: actOfFaithHandler,
          }
        : cardId === V070_BURNING_AT_THE_STAKE_ID
          ? {
              registered: state.battleRuntime
                ?.burningAtTheStakeBattleSourceInstanceIds
                ?.includes(commitment.instanceId) ?? false,
              handler: burningAtTheStakeHandler,
            }
          : null;

    if (cardId === V070_BOMBARDMENT_ID
      || cardId === V070_BROTHERS_IN_ARMS_ID
      || cardId === V070_CAPITAL_GAINS_ID) {
      const handler = cardId === V070_BOMBARDMENT_ID
        ? bombardmentHandler
        : cardId === V070_BROTHERS_IN_ARMS_ID
          ? brothersInArmsHandler
          : capitalGainsHandler;
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
      } else {
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
            timing: cardId === V070_BROTHERS_IN_ARMS_ID
              ? 'choice_then_reveal'
              : 'reveal',
            revealClass: 'ordinary',
          },
        });
      }
      continue;
    }

    if (!deferred) {
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

    if (!deferred.registered) {
      deferred.handler.apply({
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