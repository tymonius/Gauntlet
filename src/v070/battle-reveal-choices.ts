import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import type {
  V070CopiedEffectApplication,
  V070CopyableEffectLabel,
} from './copied-effects';
import * as previous from './battle-reveal-choices-pre-witchcraft';

export * from './battle-reveal-choices-pre-witchcraft';

export interface V070WitchcraftBattleRevealChoice {
  kind: 'witchcraft';
  owner: PlayerId;
  sourceInstanceId: string;
  candidateInstanceIds: string[];
  parentApplication?: V070CopiedEffectApplication;
}

export interface V070ArcaneKnowledgeBattleRevealCandidate {
  sourceInstanceId: string;
  effectLabel: V070CopyableEffectLabel;
}

export interface V070ArcaneKnowledgeBattleRevealChoice {
  kind: 'arcane_knowledge';
  owner: PlayerId;
  sourceInstanceId: string;
  encounteredAt: 'reveal_gambits' | 'reveal_tactics';
  candidates: V070ArcaneKnowledgeBattleRevealCandidate[];
  parentApplication?: V070CopiedEffectApplication;
}

export interface V070HeresyBattleRevealCandidate {
  sourceInstanceId: string;
  effectLabel: V070CopyableEffectLabel;
}

export interface V070HeresyBattleRevealChoice {
  kind: 'heresy';
  owner: PlayerId;
  sourceInstanceId: string;
  encounteredAt: 'reveal_gambits' | 'reveal_tactics';
  candidates: V070HeresyBattleRevealCandidate[];
  parentApplication?: V070CopiedEffectApplication;
}

export interface V070RendTheVeilBattleRevealCandidate {
  sourceInstanceId: string;
  effectLabel: V070CopyableEffectLabel;
}

export interface V070RendTheVeilBattleRevealChoice {
  kind: 'rend_the_veil';
  owner: PlayerId;
  sourceInstanceId: string;
  candidates: V070RendTheVeilBattleRevealCandidate[];
  parentApplication?: V070CopiedEffectApplication;
}

export type V070BattleRevealChoice =
  | previous.V070BattleRevealChoice
  | V070WitchcraftBattleRevealChoice
  | V070ArcaneKnowledgeBattleRevealChoice
  | V070HeresyBattleRevealChoice
  | V070RendTheVeilBattleRevealChoice;

declare module './battle-types' {
  interface V070BattleRuntime {
    pendingWitchcraftBattleRevealChoice?: V070WitchcraftBattleRevealChoice | null;
    witchcraftBattleRevealChoiceOpen?: boolean;
    pendingArcaneKnowledgeBattleRevealChoice?: V070ArcaneKnowledgeBattleRevealChoice | null;
    arcaneKnowledgeBattleRevealChoiceOpen?: boolean;
    pendingHeresyBattleRevealChoice?: V070HeresyBattleRevealChoice | null;
    heresyBattleRevealChoiceOpen?: boolean;
    pendingRendTheVeilBattleRevealChoice?: V070RendTheVeilBattleRevealChoice | null;
    rendTheVeilBattleRevealChoiceOpen?: boolean;
  }
}

export function queueV070WitchcraftBattleRevealChoice(
  state: V070GameState,
  choice: V070WitchcraftBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Witchcraft battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Witchcraft cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingWitchcraftBattleRevealChoice = {
    ...choice,
    candidateInstanceIds: [...choice.candidateInstanceIds],
    parentApplication: choice.parentApplication
      ? structuredClone(choice.parentApplication)
      : undefined,
  };
  runtime.witchcraftBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'witchcraft_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'mystics-witchcraft',
      candidateCount: choice.candidateInstanceIds.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'witchcraft_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      targetInstanceIds: [...choice.candidateInstanceIds],
    },
  });
}

export function queueV070ArcaneKnowledgeBattleRevealChoice(
  state: V070GameState,
  choice: V070ArcaneKnowledgeBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Arcane Knowledge battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Arcane Knowledge cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingArcaneKnowledgeBattleRevealChoice = {
    ...choice,
    candidates: choice.candidates.map(candidate => ({ ...candidate })),
    parentApplication: choice.parentApplication
      ? structuredClone(choice.parentApplication)
      : undefined,
  };
  runtime.arcaneKnowledgeBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'arcane_knowledge_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'neutral-arcane-knowledge',
      candidateCount: choice.candidates.length,
      encounteredAt: choice.encounteredAt,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'arcane_knowledge_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      candidates: choice.candidates.map(candidate => ({ ...candidate })),
    },
  });
}

export function queueV070HeresyBattleRevealChoice(
  state: V070GameState,
  choice: V070HeresyBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Heresy battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Heresy cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingHeresyBattleRevealChoice = {
    ...choice,
    candidates: choice.candidates.map(candidate => ({ ...candidate })),
    parentApplication: choice.parentApplication
      ? structuredClone(choice.parentApplication)
      : undefined,
  };
  runtime.heresyBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'heresy_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'inquisition-heresy',
      candidateCount: choice.candidates.length,
      encounteredAt: choice.encounteredAt,
      mandatory: false,
    },
  });
  appendV070Event(state, {
    type: 'heresy_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      candidates: choice.candidates.map(candidate => ({ ...candidate })),
    },
  });
}

export function queueV070RendTheVeilBattleRevealChoice(
  state: V070GameState,
  choice: V070RendTheVeilBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Rend the Veil battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Rend the Veil cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingRendTheVeilBattleRevealChoice = {
    ...choice,
    candidates: choice.candidates.map(candidate => ({ ...candidate })),
    parentApplication: choice.parentApplication
      ? structuredClone(choice.parentApplication)
      : undefined,
  };
  runtime.rendTheVeilBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'rend_the_veil_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'mystics-rend-the-veil',
      candidateCount: choice.candidates.length,
      mandatory: false,
    },
  });
  appendV070Event(state, {
    type: 'rend_the_veil_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      candidates: choice.candidates.map(candidate => ({ ...candidate })),
    },
  });
}

export function pendingV070BattleRevealChoice(
  state: V070GameState,
): V070BattleRevealChoice | null {
  return state.battleRuntime?.pendingRendTheVeilBattleRevealChoice
    ?? state.battleRuntime?.pendingHeresyBattleRevealChoice
    ?? state.battleRuntime?.pendingArcaneKnowledgeBattleRevealChoice
    ?? state.battleRuntime?.pendingWitchcraftBattleRevealChoice
    ?? previous.pendingV070BattleRevealChoice(state);
}

export function isV070BattleRevealChoiceOpen(
  state: V070GameState,
): boolean {
  if (state.battleRuntime?.pendingRendTheVeilBattleRevealChoice) {
    return Boolean(state.battleRuntime.rendTheVeilBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingHeresyBattleRevealChoice) {
    return Boolean(state.battleRuntime.heresyBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingArcaneKnowledgeBattleRevealChoice) {
    return Boolean(state.battleRuntime.arcaneKnowledgeBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingWitchcraftBattleRevealChoice) {
    return Boolean(state.battleRuntime.witchcraftBattleRevealChoiceOpen);
  }
  return previous.isV070BattleRevealChoiceOpen(state);
}

export function completeV070WitchcraftBattleRevealChoice(
  state: V070GameState,
): V070WitchcraftBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingWitchcraftBattleRevealChoice;
  if (!runtime || !pending || !runtime.witchcraftBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Witchcraft battle-effect choice.',
    );
  }
  runtime.pendingWitchcraftBattleRevealChoice = null;
  runtime.witchcraftBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070ArcaneKnowledgeBattleRevealChoice(
  state: V070GameState,
): V070ArcaneKnowledgeBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingArcaneKnowledgeBattleRevealChoice;
  if (!runtime || !pending || !runtime.arcaneKnowledgeBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Arcane Knowledge battle-effect choice.',
    );
  }
  runtime.pendingArcaneKnowledgeBattleRevealChoice = null;
  runtime.arcaneKnowledgeBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070HeresyBattleRevealChoice(
  state: V070GameState,
): V070HeresyBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingHeresyBattleRevealChoice;
  if (!runtime || !pending || !runtime.heresyBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Heresy battle-effect choice.',
    );
  }
  runtime.pendingHeresyBattleRevealChoice = null;
  runtime.heresyBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070RendTheVeilBattleRevealChoice(
  state: V070GameState,
): V070RendTheVeilBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingRendTheVeilBattleRevealChoice;
  if (!runtime || !pending || !runtime.rendTheVeilBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Rend the Veil battle-effect choice.',
    );
  }
  runtime.pendingRendTheVeilBattleRevealChoice = null;
  runtime.rendTheVeilBattleRevealChoiceOpen = false;
  return pending;
}
