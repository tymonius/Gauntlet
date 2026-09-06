import { v070CanonicalContent } from '../content/v070';
import { appendV070Event, type V070GameState } from './engine';
import type {
  V070BattleCardCommitment,
  V070UnsupportedBattleEffect,
} from './battle-types';
import * as core from './battle-effects-core';
import {
  V070_ARMISTICE_BATTLE_TEXT,
  V070_ARMISTICE_ID,
  registerV070ArmisticeBattleEffect,
} from './armistice-battle';
import {
  V070_ASSASSINS_BATTLE_TEXT,
  V070_ASSASSINS_ID,
  registerV070AssassinsBattleEffect,
} from './assassins-battle';
import {
  V070_CAPITAL_PUNISHMENT_BATTLE_TEXT,
  V070_CAPITAL_PUNISHMENT_ID,
  registerV070CapitalPunishmentBattleEffect,
} from './capital-punishment-battle';
import {
  V070_DARK_OMENS_BATTLE_TEXT,
  V070_DARK_OMENS_ID,
  registerV070DarkOmensBattleEffect,
} from './dark-omens-battle';
import {
  V070_DECOYS_BATTLE_TEXT,
  V070_DECOYS_ID,
  registerV070DecoysBattleEffect,
} from './decoys-battle';
import {
  V070_DIVINE_MERCY_BATTLE_TEXT,
  V070_DIVINE_MERCY_ID,
  registerV070DivineMercyBattleEffect,
} from './divine-mercy-battle';
import {
  V070_DISRUPTION_BATTLE_TEXT,
  V070_DISRUPTION_ID,
  registerV070DisruptionBattleEffect,
} from './disruption-battle';
import {
  V070_LANDSLIDE_BATTLE_TEXT,
  registerV070LandslideBattleEffect,
} from './landslide';
import {
  V070_PALISADE_WALL_BATTLE_TEXT,
  V070_PALISADE_WALL_ID,
  registerV070PalisadeWallBattleEffect,
} from './palisade-wall-battle';
import {
  V070_PENANCE_BATTLE_TEXT,
  V070_PENANCE_ID,
  registerV070PenanceBattleEffect,
} from './penance-battle';
import {
  V070_PROPERTY_DUES_BATTLE_TEXT,
  V070_PROPERTY_DUES_ID,
  registerV070PropertyDuesBattleEffect,
} from './property-dues-battle';
import {
  V070_REQUISITION_BATTLE_TEXT,
  V070_REQUISITION_ID,
  registerV070RequisitionBattleEffect,
} from './requisition-battle';
import {
  V070_SEDITION_BATTLE_TEXT,
  V070_SEDITION_ID,
  registerV070SeditionBattleEffect,
} from './sedition-battle';
import {
  V070_SPECULATION_BATTLE_TEXT,
  V070_SPECULATION_ID,
  registerV070SpeculationBattleEffect,
} from './speculation-battle';
import {
  V070_TARIFFS_BATTLE_TEXT,
  V070_TARIFFS_ID,
  registerV070TariffsBattleEffect,
} from './tariffs-battle';
import {
  isV070BattleCardEffectNegated,
  markV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  openV070BattleRevealEffectOrderChoice,
  pendingV070BattleRevealEffectOrderChoice,
} from './battle-reveal-order';
import { applyV070BattleRetreatStep } from './retreat-step';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { v070MysticInvocationPendingPlayers } from './mystics';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import type { PlayerId } from './rules';

export type {
  V070BattleEffectContext,
  V070BattleEffectHandler,
  V070BattleEffectTiming,
} from './battle-effects-core';
export {
  resolveV070AftermathDrawEffects,
  resolveV070UnbrokenRanksCommand,
} from './battle-effects-core';

export type V070RevealEffectClass = 'interference' | 'ordinary';
type V070RevealEncounteredAt = 'reveal_gambits' | 'reveal_tactics';

interface V070SpecializedBattleEffectHandler
  extends core.V070BattleEffectHandler {
  revealClass?: V070RevealEffectClass;
  markAppliedAtRegistration?: boolean;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingRevealEffectCommitments?: V070BattleCardCommitment[];
    pendingRevealDeferredOrdinaryCommitments?: V070BattleCardCommitment[];
    pendingRevealEffectClass?: V070RevealEffectClass | null;
    pendingRevealEffectEncounteredAt?: V070RevealEncounteredAt | null;
  }
}

const landslideHandler: V070SpecializedBattleEffectHandler = {
  cardId: 'neutral-landslide',
  expectedText: V070_LANDSLIDE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070LandslideBattleEffect(state, owner, commitment.instanceId);
  },
};
const divineMercyHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_DIVINE_MERCY_ID,
  expectedText: V070_DIVINE_MERCY_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070DivineMercyBattleEffect(state, owner, commitment.instanceId);
  },
};
const darkOmensHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_DARK_OMENS_ID,
  expectedText: V070_DARK_OMENS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070DarkOmensBattleEffect(state, owner, commitment.instanceId);
  },
};
const seditionHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_SEDITION_ID,
  expectedText: V070_SEDITION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SeditionBattleEffect(state, owner, commitment.instanceId);
  },
};
const requisitionHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_REQUISITION_ID,
  expectedText: V070_REQUISITION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RequisitionBattleEffect(state, owner, commitment.instanceId);
  },
};
const tariffsHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_TARIFFS_ID,
  expectedText: V070_TARIFFS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070TariffsBattleEffect(state, owner, commitment.instanceId);
  },
};
const penanceHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_PENANCE_ID,
  expectedText: V070_PENANCE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PenanceBattleEffect(state, owner, commitment.instanceId);
  },
};
const propertyDuesHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_PROPERTY_DUES_ID,
  expectedText: V070_PROPERTY_DUES_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PropertyDuesBattleEffect(state, owner, commitment.instanceId);
  },
};
const speculationHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_SPECULATION_ID,
  expectedText: V070_SPECULATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SpeculationBattleEffect(state, owner, commitment.instanceId);
  },
};
const palisadeWallHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_PALISADE_WALL_ID,
  expectedText: V070_PALISADE_WALL_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070PalisadeWallBattleEffect(state, owner, commitment.instanceId);
  },
};
const assassinsHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_ASSASSINS_ID,
  expectedText: V070_ASSASSINS_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070AssassinsBattleEffect(state, owner, commitment.instanceId);
  },
};
const capitalPunishmentHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_CAPITAL_PUNISHMENT_ID,
  expectedText: V070_CAPITAL_PUNISHMENT_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070CapitalPunishmentBattleEffect(state, owner, commitment.instanceId);
  },
};
const disruptionHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_DISRUPTION_ID,
  expectedText: V070_DISRUPTION_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070DisruptionBattleEffect(
      state,
      owner,
      commitment.instanceId,
      commitment.role,
    );
  },
};
const decoysHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_DECOYS_ID,
  expectedText: V070_DECOYS_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070DecoysBattleEffect(state, owner, commitment.instanceId);
  },
};
const armisticeHandler: V070SpecializedBattleEffectHandler = {
  cardId: V070_ARMISTICE_ID,
  expectedText: V070_ARMISTICE_BATTLE_TEXT,
  timing: 'reveal',
  revealClass: 'interference',
  markAppliedAtRegistration: false,
  apply: ({ state, owner, commitment }) => {
    registerV070ArmisticeBattleEffect(state, owner, commitment.instanceId);
  },
};

const specializedHandlers = new Map<string, V070SpecializedBattleEffectHandler>([
  [landslideHandler.cardId, landslideHandler],
  [divineMercyHandler.cardId, divineMercyHandler],
  [darkOmensHandler.cardId, darkOmensHandler],
  [seditionHandler.cardId, seditionHandler],
  [requisitionHandler.cardId, requisitionHandler],
  [tariffsHandler.cardId, tariffsHandler],
  [penanceHandler.cardId, penanceHandler],
  [propertyDuesHandler.cardId, propertyDuesHandler],
  [speculationHandler.cardId, speculationHandler],
  [palisadeWallHandler.cardId, palisadeWallHandler],
  [assassinsHandler.cardId, assassinsHandler],
  [capitalPunishmentHandler.cardId, capitalPunishmentHandler],
  [disruptionHandler.cardId, disruptionHandler],
  [decoysHandler.cardId, decoysHandler],
  [armisticeHandler.cardId, armisticeHandler],
]);

export const V070_SUPPORTED_REVEAL_EFFECT_IDS = [
  ...core.V070_SUPPORTED_REVEAL_EFFECT_IDS,
  ...specializedHandlers.keys(),
] as readonly string[];

export function v070BattleEffectHandler(
  cardId: string,
): core.V070BattleEffectHandler | undefined {
  return specializedHandlers.get(cardId) ?? core.v070BattleEffectHandler(cardId);
}

export function v070BattleRevealEffectClass(
  cardId: string,
): V070RevealEffectClass {
  return specializedHandlers.get(cardId)?.revealClass ?? 'ordinary';
}

export function resolveV070SupportedRevealEffects(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: V070RevealEncounteredAt,
): V070UnsupportedBattleEffect[] {
  const unsupported = commitments.flatMap(commitment =>
    unsupportedRevealEffect(state, commitment, encounteredAt)
  );
  if (unsupported.length > 0) return unsupported;

  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effect resolution requires an active runtime.');
  if (v070BattleRevealEffectsPending(state)) {
    throw new Error('Cannot start a new reveal effect sequence while another is paused.');
  }

  const ordered = orderedRevealCommitments(state, commitments);
  const interference = ordered.filter(commitment =>
    revealClassForCommitment(state, commitment) === 'interference'
  );
  const ordinary = ordered.filter(commitment =>
    revealClassForCommitment(state, commitment) === 'ordinary'
  );

  runtime.pendingRevealEffectEncounteredAt = encounteredAt;
  runtime.pendingRevealDeferredOrdinaryCommitments = ordinary;
  if (interference.length > 0) {
    beginRevealClass(state, 'interference', interference);
  } else {
    runtime.pendingRevealDeferredOrdinaryCommitments = [];
    beginRevealClass(state, 'ordinary', ordinary);
  }

  resumeV070SupportedRevealEffects(state);
  return [];
}

export function v070BattleRevealEffectsPending(
  state: V070GameState,
): boolean {
  return Boolean(state.battleRuntime?.pendingRevealEffectEncounteredAt);
}

export function resumeV070SupportedRevealEffects(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new Error('Battle effect resumption requires an active runtime.');
  }
  const encounteredAt = runtime.pendingRevealEffectEncounteredAt;
  if (!encounteredAt) return;

  while (!revealEffectInterruptPending(state)) {
    pruneNoEffectRevealCommitments(state, encounteredAt);
    const current = runtime.pendingRevealEffectCommitments ?? [];
    if (current.length === 0) {
      if (runtime.pendingRevealEffectClass === 'interference'
        && (runtime.pendingRevealDeferredOrdinaryCommitments?.length ?? 0) > 0) {
        const ordinary = [...runtime.pendingRevealDeferredOrdinaryCommitments!];
        runtime.pendingRevealDeferredOrdinaryCommitments = [];
        beginRevealClass(state, 'ordinary', ordinary);
        continue;
      }
      clearPendingRevealProcedure(state);
      return;
    }

    const nextPlayer = normalizeNextRevealEffectPlayer(state, current);
    if (!nextPlayer) {
      clearPendingRevealProcedure(state);
      return;
    }
    const candidates = current.filter(
      commitment => commitment.owner === nextPlayer,
    );

    let commitment: V070BattleCardCommitment | undefined;
    const forcedInstanceId = runtime.pendingRevealForcedInstanceId;
    if (forcedInstanceId) {
      commitment = candidates.find(
        candidate => candidate.instanceId === forcedInstanceId,
      );
      if (!commitment) {
        throw new Error(
          'Chosen reveal effect is no longer eligible for the current controller.',
        );
      }
      runtime.pendingRevealForcedInstanceId = null;
    } else if (candidates.length > 1) {
      openV070BattleRevealEffectOrderChoice(
        state,
        nextPlayer,
        candidates.map(candidate => candidate.instanceId),
      );
      return;
    } else {
      commitment = candidates[0];
    }

    if (!commitment) {
      throw new Error('Reveal effect priority has no eligible commitment.');
    }
    runtime.pendingRevealEffectCommitments = current.filter(
      candidate => candidate.instanceId !== commitment!.instanceId,
    );
    runtime.pendingRevealEffectNextPlayer = nextRevealEffectPlayerAfter(
      state,
      runtime.pendingRevealEffectCommitments,
      nextPlayer,
    );
    applyValidatedRevealCommitment(state, commitment, encounteredAt);
  }
}

function beginRevealClass(
  state: V070GameState,
  revealClass: V070RevealEffectClass,
  commitments: readonly V070BattleCardCommitment[],
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.pendingRevealEffectClass = revealClass;
  runtime.pendingRevealEffectCommitments = [...commitments];
  runtime.pendingRevealEffectNextPlayer = firstRevealEffectPlayer(
    state,
    commitments,
  );
  runtime.pendingRevealForcedInstanceId = null;
  runtime.pendingRevealEffectOrderChoice = null;
}

function pruneNoEffectRevealCommitments(
  state: V070GameState,
  encounteredAt: V070RevealEncounteredAt,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  const remaining: V070BattleCardCommitment[] = [];
  for (const commitment of runtime.pendingRevealEffectCommitments ?? []) {
    const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
    const card = v070CanonicalContent.cardsById.get(cardId);
    const suppressed = Boolean(
      card
      && card.trait === 'Arcane'
      && v070MonasterySuppressesArcaneBattleEffects(state),
    );
    if (isV070BattleCardEffectNegated(state, commitment.instanceId)
      || suppressed) {
      applyValidatedRevealCommitment(state, commitment, encounteredAt);
      continue;
    }
    remaining.push(commitment);
  }
  runtime.pendingRevealEffectCommitments = remaining;
}

function firstRevealEffectPlayer(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
): PlayerId | null {
  const battle = state.battle;
  if (!battle) return commitments[0]?.owner ?? null;
  if (commitments.some(commitment => commitment.owner === battle.attacker)) {
    return battle.attacker;
  }
  if (commitments.some(commitment => commitment.owner === battle.defender)) {
    return battle.defender;
  }
  return null;
}

function normalizeNextRevealEffectPlayer(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
): PlayerId | null {
  const runtime = state.battleRuntime;
  const preferred = runtime?.pendingRevealEffectNextPlayer ?? null;
  if (preferred
    && commitments.some(commitment => commitment.owner === preferred)) {
    return preferred;
  }
  return firstRevealEffectPlayer(state, commitments);
}

function nextRevealEffectPlayerAfter(
  state: V070GameState,
  remaining: readonly V070BattleCardCommitment[],
  justApplied: PlayerId,
): PlayerId | null {
  const battle = state.battle;
  if (!battle || remaining.length === 0) return remaining[0]?.owner ?? null;
  const other = justApplied === battle.attacker
    ? battle.defender
    : battle.attacker;
  if (remaining.some(commitment => commitment.owner === other)) return other;
  if (remaining.some(commitment => commitment.owner === justApplied)) {
    return justApplied;
  }
  return firstRevealEffectPlayer(state, remaining);
}

function clearPendingRevealProcedure(state: V070GameState): void {
  const runtime = state.battleRuntime;
  if (!runtime) return;
  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealDeferredOrdinaryCommitments = [];
  runtime.pendingRevealEffectClass = null;
  runtime.pendingRevealEffectEncounteredAt = null;
  runtime.pendingRevealEffectNextPlayer = null;
  runtime.pendingRevealForcedInstanceId = null;
  runtime.pendingRevealEffectOrderChoice = null;
}

function revealEffectInterruptPending(state: V070GameState): boolean {
  return Boolean(
    pendingV070BattleRevealChoice(state)
    || pendingV070BattleRevealEffectOrderChoice(state)
    || v070MysticInvocationPendingPlayers(state).length > 0,
  );
}

function revealClassForCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
): V070RevealEffectClass {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  return v070BattleRevealEffectClass(cardId);
}

function applyValidatedRevealCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: V070RevealEncounteredAt,
): void {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) throw new Error(`Unknown canonical card ${cardId}.`);

  if (isV070BattleCardEffectNegated(state, commitment.instanceId)) {
    appendV070Event(state, {
      type: 'battle_card_effect_skipped_negated',
      actor: commitment.owner,
      visibility: 'public',
      payload: { instanceId: commitment.instanceId, cardId, role: commitment.role },
    });
    return;
  }

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
    return;
  }

  const specialized = specializedHandlers.get(cardId);
  if (!specialized) {
    const handler = core.v070BattleEffectHandler(cardId);
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
    if (handler && !isDeferredOnlyRevealEffect(cardId, handler.expectedText)) {
      markV070BattleCardEffectApplied(state, commitment.instanceId);
    }
    return;
  }

  specialized.apply({
    state,
    owner: commitment.owner,
    opponent: commitment.owner === 'A' ? 'B' : 'A',
    commitment,
  });
  if (specialized.markAppliedAtRegistration !== false
    && !isDeferredOnlyRevealEffect(cardId, specialized.expectedText)) {
    markV070BattleCardEffectApplied(state, commitment.instanceId);
  }
  appendV070Event(state, {
    type: 'battle_card_effect_applied',
    actor: commitment.owner,
    visibility: 'public',
    payload: {
      instanceId: commitment.instanceId,
      cardId,
      role: commitment.role,
      timing: specialized.timing,
      revealClass: specialized.revealClass ?? 'ordinary',
    },
  });
}

function isDeferredOnlyRevealEffect(cardId: string, text: string): boolean {
  return /^In the Aftermath\b/.test(text)
    || cardId === 'military-unbroken-ranks';
}

function unsupportedRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: V070RevealEncounteredAt,
): V070UnsupportedBattleEffect[] {
  const cardId = state.cardInstances[commitment.instanceId]?.cardId ?? '';
  const card = v070CanonicalContent.cardsById.get(cardId);
  if (!card) throw new Error(`Unknown canonical card ${cardId}.`);

  if (v070MonasterySuppressesArcaneBattleEffects(state)
    && card.trait === 'Arcane') return [];

  const relevant = card.effects.filter(effect =>
    effect.label === (commitment.role === 'gambit' ? 'Gambit' : 'Tactic')
    || effect.label === 'Gambit/Tactic'
  );
  if (relevant.length === 0) return [];

  const handler = v070BattleEffectHandler(cardId);
  if (handler
    && relevant.length === 1
    && relevant[0]?.text === handler.expectedText) return [];

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
  return [
    ...commitments.filter(commitment => commitment.owner === battle.attacker),
    ...commitments.filter(commitment => commitment.owner === battle.defender),
  ];
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
