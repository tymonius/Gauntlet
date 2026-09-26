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
import {
  V070_REND_THE_VEIL_ID,
  V070_WITCHCRAFT_ID,
} from './copied-effect-callers';
import {
  V070_RECONNAISSANCE_ID,
  deferV070ReconnaissanceGambit,
  takeV070DeferredReconnaissanceGambits,
} from './reconnaissance-battle';
import {
  registerV070DeferredBattleAftermathCarrier,
} from './battle-aftermath-carrier';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import {
  configureV070WitchcraftBattleEffectHandlerResolver,
} from './witchcraft-handler-resolver';
import {
  V070_REARGUARD_BATTLE_TEXT,
  V070_REARGUARD_ID,
  registerV070RearguardBattleEffect,
} from './rearguard';
import {
  CURRENT_DIVINE_MERCY_BATTLE_TEXT,
  V070_DIVINE_MERCY_ID,
} from './divine-mercy-battle';
import {
  V070_NATURES_ALTAR_BATTLE_TEXT,
  V070_NATURES_ALTAR_ID,
  V070_SCORCHED_EARTH_BATTLE_TEXT,
  V070_SCORCHED_EARTH_ID,
  registerV070NaturesAltarBattleEffect,
  registerV070ScorchedEarthBattleEffect,
} from './aftermath-overlay-cards';
import {
  V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT,
  V070_BATTLEFIELD_PROMOTION_ID,
  V070_SECOND_LINE_BATTLE_TEXT,
  V070_SECOND_LINE_ID,
  V070_SALVAGE_BATTLE_TEXT,
  V070_SALVAGE_ID,
  registerV070BattlefieldPromotionBattleEffect,
  registerV070SecondLineBattleEffect,
  registerV070SalvageBattleEffect,
} from './aftermath-destination-cards';
import {
  V070_GRAVE_WARD_BATTLE_TEXT,
  V070_GRAVE_WARD_ID,
  V070_NECROMANCY_BATTLE_TEXT,
  V070_NECROMANCY_ID,
  V070_SOUL_FOR_SOUL_BATTLE_TEXT,
  V070_SOUL_FOR_SOUL_ID,
  registerV070PostClearMysticBattleEffect,
} from './post-clear-mystic-cards';
import {
  V070_FATES_TOLL_BATTLE_TEXT,
  V070_FATES_TOLL_ID,
  V070_VALOR_BATTLE_TEXT,
  V070_VALOR_ID,
  registerV070PostRollRerollEffect,
} from './post-roll-reroll-cards';
import {
  V070_MONETARY_CRISIS_BATTLE_TEXT,
  V070_MONETARY_CRISIS_ID,
  registerV070MonetaryCrisisBattleEffect,
} from './monetary-crisis-battle';

export * from './battle-effects-pre-capital-gains';

declare module './battle-types' {
  interface V070BattleRuntime {
    deferredWitchcraftGambitCommitments?: V070BattleCardCommitment[];
    deferredRendTheVeilGambitCommitments?: V070BattleCardCommitment[];
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

const rearguardHandler: previous.V070BattleEffectHandler = {
  cardId: V070_REARGUARD_ID,
  expectedText: V070_REARGUARD_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RearguardBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const naturesAltarHandler: previous.V070BattleEffectHandler = {
  cardId: V070_NATURES_ALTAR_ID,
  expectedText: V070_NATURES_ALTAR_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070NaturesAltarBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const scorchedEarthHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SCORCHED_EARTH_ID,
  expectedText: V070_SCORCHED_EARTH_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070ScorchedEarthBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const battlefieldPromotionHandler: previous.V070BattleEffectHandler = {
  cardId: V070_BATTLEFIELD_PROMOTION_ID,
  expectedText: V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070BattlefieldPromotionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const secondLineHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SECOND_LINE_ID,
  expectedText: V070_SECOND_LINE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SecondLineBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const salvageHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SALVAGE_ID,
  expectedText: V070_SALVAGE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SalvageBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const graveWardHandler: previous.V070BattleEffectHandler = {
  cardId: V070_GRAVE_WARD_ID,
  expectedText: V070_GRAVE_WARD_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_GRAVE_WARD_ID,
    );
  },
};

const soulForSoulHandler: previous.V070BattleEffectHandler = {
  cardId: V070_SOUL_FOR_SOUL_ID,
  expectedText: V070_SOUL_FOR_SOUL_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_SOUL_FOR_SOUL_ID,
    );
  },
};

const necromancyHandler: previous.V070BattleEffectHandler = {
  cardId: V070_NECROMANCY_ID,
  expectedText: V070_NECROMANCY_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostClearMysticBattleEffect(
      state,
      owner,
      commitment.instanceId,
      V070_NECROMANCY_ID,
    );
  },
};

const valorHandler: previous.V070BattleEffectHandler = {
  cardId: V070_VALOR_ID,
  expectedText: V070_VALOR_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostRollRerollEffect(
      state,
      owner,
      commitment.instanceId,
      V070_VALOR_ID,
    );
  },
};

const fatesTollHandler: previous.V070BattleEffectHandler = {
  cardId: V070_FATES_TOLL_ID,
  expectedText: V070_FATES_TOLL_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PostRollRerollEffect(
      state,
      owner,
      commitment.instanceId,
      V070_FATES_TOLL_ID,
    );
  },
};

const monetaryCrisisHandler: previous.V070BattleEffectHandler = {
  cardId: V070_MONETARY_CRISIS_ID,
  expectedText: V070_MONETARY_CRISIS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070MonetaryCrisisBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const deferredHandlers = new Map<string, previous.V070BattleEffectHandler>([
  [V070_REARGUARD_ID, rearguardHandler],
  [V070_NATURES_ALTAR_ID, naturesAltarHandler],
  [V070_SCORCHED_EARTH_ID, scorchedEarthHandler],
  [V070_BATTLEFIELD_PROMOTION_ID, battlefieldPromotionHandler],
  [V070_SECOND_LINE_ID, secondLineHandler],
  [V070_SALVAGE_ID, salvageHandler],
  [V070_GRAVE_WARD_ID, graveWardHandler],
  [V070_SOUL_FOR_SOUL_ID, soulForSoulHandler],
  [V070_NECROMANCY_ID, necromancyHandler],
  [V070_VALOR_ID, valorHandler],
  [V070_FATES_TOLL_ID, fatesTollHandler],
  [V070_MONETARY_CRISIS_ID, monetaryCrisisHandler],
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

/**
 * Current-release audit adapter. Runtime resolution remains on the frozen
 * v0.7.0 handler graph until migrated deliberately; reviewed wording-only
 * changes can expose the current exact text here when behavior is unchanged.
 */
export function currentBattleEffectHandler(
  cardId: string,
): previous.V070BattleEffectHandler | undefined {
  const handler = v070BattleEffectHandler(cardId);
  if (!handler) return undefined;
  if (cardId === V070_DIVINE_MERCY_ID) {
    return {
      ...handler,
      expectedText: CURRENT_DIVINE_MERCY_BATTLE_TEXT,
    };
  }
  return handler;
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
  const deferredPostTactics = encounteredAt === 'reveal_tactics'
    ? [
        ...takeDeferredWitchcraftGambits(state),
        ...takeDeferredRendTheVeilGambits(state),
        ...takeV070DeferredReconnaissanceGambits(state),
      ]
    : [];
  const effectiveCommitments = [...commitments, ...deferredPostTactics];
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

    // Witchcraft, Rend the Veil, and Reconnaissance have printed
    // Gambit/Tactic text that resolves only after Tactics are revealed. A
    // copy set as the Gambit remains a legal revealed commitment, but its own
    // effect joins the reveal queue only at the post-Tactics timing.
    if (encounteredAt === 'reveal_gambits'
      && commitment.role === 'gambit'
      && (
        cardId === V070_WITCHCRAFT_ID
        || cardId === V070_REND_THE_VEIL_ID
        || cardId === V070_RECONNAISSANCE_ID
      )) {
      if (cardId === V070_WITCHCRAFT_ID) {
        deferWitchcraftGambit(state, commitment);
      } else if (cardId === V070_REND_THE_VEIL_ID) {
        deferRendTheVeilGambit(state, commitment);
      } else {
        deferV070ReconnaissanceGambit(state, commitment);
      }
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

    const card = v070CanonicalContent.cardsById.get(cardId);
    if (card?.trait === 'Arcane'
      && v070MonasterySuppressesArcaneBattleEffects(state)) {
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

function deferRendTheVeilGambit(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.deferredRendTheVeilGambitCommitments ??= [];
  if (runtime.deferredRendTheVeilGambitCommitments.some(
    candidate => candidate.instanceId === commitment.instanceId,
  )) return;
  runtime.deferredRendTheVeilGambitCommitments.push({ ...commitment });
}

function takeDeferredRendTheVeilGambits(
  state: V070GameState,
): V070BattleCardCommitment[] {
  const runtime = state.battleRuntime;
  if (!runtime) return [];
  const deferred = runtime.deferredRendTheVeilGambitCommitments ?? [];
  runtime.deferredRendTheVeilGambitCommitments = [];
  return deferred.filter(commitment =>
    state.cardInstances[commitment.instanceId]?.cardId === V070_REND_THE_VEIL_ID
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
  if (cardId === V070_REARGUARD_ID) {
    return state.battleRuntime?.battleCardAftermathAssetBanks.some(bank =>
      bank.sourceCardId === V070_REARGUARD_ID
      && bank.sourceInstanceId === sourceInstanceId
    ) ?? false;
  }
  if (cardId === V070_NATURES_ALTAR_ID
    || cardId === V070_SCORCHED_EARTH_ID) {
    return state.battleRuntime?.battleCardAftermathOverlayPlacements.some(
      placement =>
        placement.sourceCardId === cardId
        && placement.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_BATTLEFIELD_PROMOTION_ID
    || cardId === V070_SECOND_LINE_ID
    || cardId === V070_SALVAGE_ID) {
    return state.battleRuntime?.battleCardAftermathDestinationChoices.some(
      choice =>
        choice.sourceCardId === cardId
        && choice.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_GRAVE_WARD_ID
    || cardId === V070_SOUL_FOR_SOUL_ID
    || cardId === V070_NECROMANCY_ID) {
    return state.battleRuntime?.battleCardPostClearAftermathEffects.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_VALOR_ID || cardId === V070_FATES_TOLL_ID) {
    return state.battleRuntime?.battleCardPostRollRerolls.some(
      effect =>
        effect.sourceCardId === cardId
        && effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
  }
  if (cardId === V070_MONETARY_CRISIS_ID) {
    return state.battleRuntime?.battleCardAftermathMonetaryCrises.some(
      effect => effect.sourceInstanceId === sourceInstanceId,
    ) ?? false;
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
