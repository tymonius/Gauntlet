import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as previous from './battle-effects-pre-capital-gains';
import { isV070BattleCardEffectNegated } from './battle-effect-status';
import {
  V070_CAPITAL_GAINS_BATTLE_TEXT,
  V070_CAPITAL_GAINS_ID,
  registerV070CapitalGainsBattleEffect,
} from './capital-gains-battle';
import {
  V070_EXCOMMUNICATION_BATTLE_TEXT,
  V070_EXCOMMUNICATION_ID,
  registerV070ExcommunicationBattleEffect,
} from './excommunication-battle';
import {
  V070_SUPPLIES_BATTLE_TEXT,
  V070_SUPPLIES_ID,
  registerV070SuppliesBattleEffect,
} from './supplies-battle';
import { V070_WITCHCRAFT_ID } from './copied-effect-callers';
import {
  registerV070DeferredBattleAftermathCarrier,
} from './battle-aftermath-carrier';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import {
  configureV070WitchcraftBattleEffectHandlerResolver,
} from './witchcraft-handler-resolver';

export * from './battle-effects-pre-capital-gains';

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredWitchcraftGambitCommitments?: V070BattleCardCommitment[];
  }
}

const capitalGainsHandler: previous.V070BattleEffectHandler = {
  cardId: V070_CAPITAL_GAINS_ID,
  expectedText: V070_CAPITAL_GAINS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070CapitalGainsBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_CAPITAL_GAINS_ID,
      'owner_win',
    );
  },
};

const excommunicationHandler: previous.V070BattleEffectHandler = {
  cardId: V070_EXCOMMUNICATION_ID,
  expectedText: V070_EXCOMMUNICATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ExcommunicationBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_EXCOMMUNICATION_ID,
      'always',
    );
  },
};

const suppliesHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SUPPLIES_ID,
  expectedText: V070_SUPPLIES_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SuppliesBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
    registerV070DeferredBattleAftermathCarrier(
      state,
      owner,
      commitment.instanceId,
      V070_SUPPLIES_ID,
      'always',
    );
  },
};

const deferredHandlers = new Map<string, previous.V070BattleEffectHandler>([
  [V070_CAPITAL_GAINS_ID, capitalGainsHandler],
  [V070_EXCOMMUNICATION_ID, excommunicationHandler],
  [V070_SUPPLIES_ID, suppliesHandler],
]);

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...previous.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  ...deferredHandlers.keys(),
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  return deferredHandlers.get(cardId) ?? previous.v070BattleEffectHandler(cardId);
}

configureV070WitchcraftBattleEffectHandlerResolver(v070BattleEffectHandler);

export function v070BattleRevealEffectClass(
  cardId: string,
): previous.V070RevealEffectClass {
  if (deferredHandlers.has(cardId)) return 'ordinary';
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
  const deferredWitchcraft = encounteredAt === 'reveal_tactics'
    ? takeDeferredWitchcraftGambits(state)
    : [];
  const effectiveCommitments = [...commitments, ...deferredWitchcraft];
  const unsupported = effectiveCommitments.flatMap(commitment =>
    unsupportedRevealEffect(
      state,
      commitment,
      commitment.role,
      encounteredAt,
    )
  );
  if (unsupported.length > 0) return unsupported;

  const forwarded: V070BattleCardCommitment[] = [];
  for (const commitment of effectiveCommitments) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';

    // Witchcraft's printed Gambit/Tactic text is explicitly post-Tactics.
    // A Witchcraft set as the Gambit remains a legal revealed commitment and
    // may still be targeted by reveal-stage interference, but its own effect
    // joins the ordinary reveal queue only after Tactics have been revealed.
    if (encounteredAt === 'reveal_gambits'
      && commitment.role === 'gambit'
      && cardId === V070_WITCHCRAFT_ID) {
      deferWitchcraftGambit(state, commitment);
      continue;
    }

    const handler = deferredHandlers.get(cardId);
    if (!handler) {
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

    if (!deferredRegistrationExists(state, cardId, commitment.instanceId)) {
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

function deferWitchcraftGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredWitchcraftGambitCommitments ??= [];
  if (runtime.deferredWitchcraftGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredWitchcraftGambitCommitments.push({ ...commitment });
}

function takeDeferredWitchcraftGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredWitchcraftGambitCommitments ?? [];
  runtime.deferredWitchcraftGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_WITCHCRAFT_ID
    && !isV070BattleCardEffectNegated(state, commitment.instanceId)
    && battleContainsCommitment(state, commitment)
  );
}

function battleContainsCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): boolean {
  const participant = state.battleRuntime?.participants[commitment.owner];
  if (!participant) return false;
  const candidates = commitment.role === 'gambit'
    ? [
        ...(participant.gambit ? [participant.gambit] : []),
        ...participant.additionalGambits,
      ]
    : [
        ...(participant.tactic ? [participant.tactic] : []),
        ...participant.additionalTactics,
      ];
  return candidates.some(candidate => candidate.instanceId === commitment.instanceId);
}

function deferredRegistrationExists(
  state: V070GameState,
  cardId: string,
  sourceInstanceId: string,
): boolean {
  if (cardId === V070_CAPITAL_GAINS_ID) {
    return state.battleRuntime?.capitalGainsBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_EXCOMMUNICATION_ID) {
    return state.battleRuntime?.excommunicationBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  if (cardId === V070_SUPPLIES_ID) {
    return state.battleRuntime?.suppliesBattleSourceInstanceIds
      ?.includes(sourceInstanceId) ?? false;
  }
  return false;
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
