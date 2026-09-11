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
import { applyV070BattleRetreatStep } from './retreat-step';
import { v070MonasterySuppressesArcaneBattleEffects } from './territories';
import { v070MysticInvocationPendingPlayers } from './mystics';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

export type {
  V070BattleEffectContext,
  V070BattleEffectHandler,
  V070BattleEffectTiming,
} from './battle-effects-core';
export {
  resolveV070AftermathDrawEffects,
  resolveV070UnbrokenRanksCommand,
} from './battle-effects-core';

type V070RevealEncounteredAt = 'reveal_gambits' | 'reveal_tactics';

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Remaining effects from one simultaneous reveal, already authority-validated. */
    pendingRevealEffectCommitments?: V070BattleCardCommitment[];
    pendingRevealEffectEncounteredAt?: V070RevealEncounteredAt | null;
  }
}

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

const seditionHandler: core.V070BattleEffectHandler = {
  cardId: V070_SEDITION_ID,
  expectedText: V070_SEDITION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SeditionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const requisitionHandler: core.V070BattleEffectHandler = {
  cardId: V070_REQUISITION_ID,
  expectedText: V070_REQUISITION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070RequisitionBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const tariffsHandler: core.V070BattleEffectHandler = {
  cardId: V070_TARIFFS_ID,
  expectedText: V070_TARIFFS_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070TariffsBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const penanceHandler: core.V070BattleEffectHandler = {
  cardId: V070_PENANCE_ID,
  expectedText: V070_PENANCE_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PenanceBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const propertyDuesHandler: core.V070BattleEffectHandler = {
  cardId: V070_PROPERTY_DUES_ID,
  expectedText: V070_PROPERTY_DUES_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070PropertyDuesBattleEffect(
      state,
      owner,
      commitment.instanceId,
    );
  },
};

const speculationHandler: core.V070BattleEffectHandler = {
  cardId: V070_SPECULATION_ID,
  expectedText: V070_SPECULATION_BATTLE_TEXT,
  timing: 'reveal',
  apply: ({ state, owner, commitment }) => {
    registerV070SpeculationBattleEffect(
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
  [seditionHandler.cardId, seditionHandler],
  [requisitionHandler.cardId, requisitionHandler],
  [tariffsHandler.cardId, tariffsHandler],
  [penanceHandler.cardId, penanceHandler],
  [propertyDuesHandler.cardId, propertyDuesHandler],
  [speculationHandler.cardId, speculationHandler],
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
  encounteredAt: V070RevealEncounteredAt,
): V070UnsupportedBattleEffect[] {
  // Validate the complete simultaneous reveal before mutating live state. Once
  // validated, effects may pause between alternating applications for choices.
  const unsupported = commitments.flatMap(commitment =>
    unsupportedRevealEffect(state, commitment, encounteredAt)
  );
  if (unsupported.length > 0) return unsupported;

  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effect resolution requires an active runtime.');
  if ((runtime.pendingRevealEffectCommitments?.length ?? 0) > 0) {
    throw new Error('Cannot start a new reveal effect sequence while another is paused.');
  }

  applyRevealCommitmentsUntilPause(
    state,
    orderedRevealCommitments(state, commitments),
    encounteredAt,
  );
  return [];
}

export function v070BattleRevealEffectsPending(
  state: V070GameState,
): boolean {
  return (state.battleRuntime?.pendingRevealEffectCommitments?.length ?? 0) > 0;
}

/** Continue an already validated reveal sequence after its interrupt resolves. */
export function resumeV070SupportedRevealEffects(
  state: V070GameState,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) {
    throw new Error('Battle effect resumption requires an active runtime.');
  }
  const remaining = runtime.pendingRevealEffectCommitments ?? [];
  const encounteredAt = runtime.pendingRevealEffectEncounteredAt;
  if (remaining.length === 0 || !encounteredAt) return;

  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealEffectEncounteredAt = null;
  applyRevealCommitmentsUntilPause(
    state,
    remaining,
    encounteredAt,
  );
}

function applyRevealCommitmentsUntilPause(
  state: V070GameState,
  commitments: readonly V070BattleCardCommitment[],
  encounteredAt: V070RevealEncounteredAt,
): void {
  const runtime = state.battleRuntime;
  if (!runtime) throw new Error('Battle effect resolution requires an active runtime.');

  for (let index = 0; index < commitments.length; index += 1) {
    const commitment = commitments[index];
    applyValidatedRevealCommitment(state, commitment, encounteredAt);

    if (revealEffectInterruptPending(state)) {
      runtime.pendingRevealEffectCommitments = commitments.slice(index + 1);
      runtime.pendingRevealEffectEncounteredAt =
        runtime.pendingRevealEffectCommitments.length > 0
          ? encounteredAt
          : null;
      return;
    }
  }

  runtime.pendingRevealEffectCommitments = [];
  runtime.pendingRevealEffectEncounteredAt = null;
}

function revealEffectInterruptPending(state: V070GameState): boolean {
  return Boolean(
    pendingV070BattleRevealChoice(state)
    || v070MysticInvocationPendingPlayers(state).length > 0,
  );
}

function applyValidatedRevealCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: V070RevealEncounteredAt,
): void {
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
    return;
  }

  const specialized = specializedHandlers.get(cardId);
  if (!specialized) {
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
    return;
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

function unsupportedRevealEffect(
  state: V070GameState,
  commitment: V070BattleCardCommitment,
  encounteredAt: V070RevealEncounteredAt,
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
