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

export interface V070ContrabandBattleRevealCandidate {
  sourceInstanceId: string;
  cardId: string;
  effectLabel: V070CopyableEffectLabel;
  text: string;
}

export interface V070ContrabandBattleRevealChoice {
  kind: 'contraband';
  owner: PlayerId;
  sourceInstanceId: string;
  role: 'gambit' | 'tactic';
  candidates: V070ContrabandBattleRevealCandidate[];
}

export interface V070ReconnaissanceBattleRevealChoice {
  kind: 'reconnaissance';
  owner: PlayerId;
  sourceInstanceId: string;
}

export interface V070OperationalReassessmentBattleRevealChoice {
  kind: 'operational_reassessment';
  owner: PlayerId;
  sourceInstanceId: string;
  role: 'gambit' | 'tactic';
  candidateInstanceIds: string[];
}

export interface V070ReserveForceBattleRevealChoice {
  kind: 'reserve_force';
  owner: PlayerId;
  sourceInstanceId: string;
  role: 'gambit' | 'tactic';
  candidateInstanceIds: string[];
}

export interface V070LateAdditionalTacticBattleRevealChoice {
  kind: 'late_additional_tactic';
  owner: PlayerId;
  sourceInstanceId: string;
  sourceCardId: string;
  candidateInstanceIds: string[];
  candidateZone?: 'reserve' | 'hand';
  chosenDestination?: 'discard' | 'graveyard';
  recordMysticSourceEffectAfterChoice?: boolean;
}

export interface V070HellfireBattleRevealChoice {
  kind: 'hellfire';
  owner: PlayerId;
  sourceInstanceId: string;
  maximumConviction: number;
}

export interface V070PlenipotentiaryBattleRevealChoice {
  kind: 'plenipotentiary';
  owner: PlayerId;
  sourceInstanceId: string;
  candidateProposalIds: string[];
}

export type V070FinancierPreDiceBattleRevealChoice =
  | {
      kind: 'financier_divestment';
      owner: PlayerId;
      sourceInstanceId: string;
      candidateTerritoryInstanceIds: string[];
    }
  | {
      kind: 'financier_liquidation';
      owner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'financier_margin_loan';
      owner: PlayerId;
      sourceInstanceId: string;
      candidateInstanceIds: string[];
    }
  | {
      kind: 'financier_immediate_subsidize';
      owner: PlayerId;
      sourceInstanceId: string;
      sourceCardId: string;
      minimumBonus: number;
      maximumBonus: number;
    };

export type V070BattleRevealChoice =
  | previous.V070BattleRevealChoice
  | V070WitchcraftBattleRevealChoice
  | V070ArcaneKnowledgeBattleRevealChoice
  | V070HeresyBattleRevealChoice
  | V070RendTheVeilBattleRevealChoice
  | V070ContrabandBattleRevealChoice
  | V070ReconnaissanceBattleRevealChoice
  | V070OperationalReassessmentBattleRevealChoice
  | V070ReserveForceBattleRevealChoice
  | V070LateAdditionalTacticBattleRevealChoice
  | V070HellfireBattleRevealChoice
  | V070PlenipotentiaryBattleRevealChoice
  | V070FinancierPreDiceBattleRevealChoice;

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
    pendingContrabandBattleRevealChoice?: V070ContrabandBattleRevealChoice | null;
    contrabandBattleRevealChoiceOpen?: boolean;
    pendingReconnaissanceBattleRevealChoice?: V070ReconnaissanceBattleRevealChoice | null;
    reconnaissanceBattleRevealChoiceOpen?: boolean;
    pendingOperationalReassessmentBattleRevealChoice?: V070OperationalReassessmentBattleRevealChoice | null;
    operationalReassessmentBattleRevealChoiceOpen?: boolean;
    pendingReserveForceBattleRevealChoice?: V070ReserveForceBattleRevealChoice | null;
    reserveForceBattleRevealChoiceOpen?: boolean;
    pendingLateAdditionalTacticBattleRevealChoice?: V070LateAdditionalTacticBattleRevealChoice | null;
    lateAdditionalTacticBattleRevealChoiceOpen?: boolean;
    pendingHellfireBattleRevealChoice?: V070HellfireBattleRevealChoice | null;
    hellfireBattleRevealChoiceOpen?: boolean;
    pendingPlenipotentiaryBattleRevealChoice?: V070PlenipotentiaryBattleRevealChoice | null;
    plenipotentiaryBattleRevealChoiceOpen?: boolean;
    pendingFinancierPreDiceBattleRevealChoice?: V070FinancierPreDiceBattleRevealChoice | null;
    financierPreDiceBattleRevealChoiceOpen?: boolean;
  }
}

export function queueV070FinancierPreDiceBattleRevealChoice(
  state: V070GameState,
  choice: V070FinancierPreDiceBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A Financier pre-dice battle choice requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'A Financier pre-dice choice cannot open while another reveal-timing choice is pending.',
    );
  }
  runtime.pendingFinancierPreDiceBattleRevealChoice =
    structuredClone(choice);
  runtime.financierPreDiceBattleRevealChoiceOpen = true;
}

export function queueV070PlenipotentiaryBattleRevealChoice(
  state: V070GameState,
  choice: V070PlenipotentiaryBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A Plenipotentiary battle choice requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Plenipotentiary cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingPlenipotentiaryBattleRevealChoice = {
    ...choice,
    candidateProposalIds: [...choice.candidateProposalIds],
  };
  runtime.plenipotentiaryBattleRevealChoiceOpen = true;
  appendV070Event(state, {
    type: 'plenipotentiary_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'diplomats-plenipotentiary',
      candidateCount: choice.candidateProposalIds.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'plenipotentiary_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      proposalIds: [...choice.candidateProposalIds],
      handInstanceIds: [...state.players[choice.owner].zones.hand],
    },
  });
}

export function queueV070HellfireBattleRevealChoice(
  state: V070GameState,
  choice: V070HellfireBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A Hellfire battle choice requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Hellfire cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingHellfireBattleRevealChoice = { ...choice };
  runtime.hellfireBattleRevealChoiceOpen = true;
  appendV070Event(state, {
    type: 'hellfire_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'inquisition-hellfire',
      minimumConviction: 0,
      maximumConviction: choice.maximumConviction,
      mandatoryChoice: true,
    },
  });
}

export function queueV070LateAdditionalTacticBattleRevealChoice(
  state: V070GameState,
  choice: V070LateAdditionalTacticBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'A late additional Tactic requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'A late additional Tactic cannot open while another reveal-timing choice is pending.',
    );
  }
  runtime.pendingLateAdditionalTacticBattleRevealChoice = {
    ...choice,
    candidateInstanceIds: [...choice.candidateInstanceIds],
  };
  runtime.lateAdditionalTacticBattleRevealChoiceOpen = true;
  appendV070Event(state, {
    type: 'late_additional_tactic_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: choice.sourceCardId,
      candidateCount: choice.candidateInstanceIds.length,
      candidateZone: choice.candidateZone ?? 'reserve',
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'late_additional_tactic_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: choice.sourceCardId,
      candidateZone: choice.candidateZone ?? 'reserve',
      candidateInstanceIds: [...choice.candidateInstanceIds],
    },
  });
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

export function queueV070ContrabandBattleRevealChoice(
  state: V070GameState,
  choice: V070ContrabandBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Contraband battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Contraband cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingContrabandBattleRevealChoice = {
    ...choice,
    candidates: choice.candidates.map(candidate => ({ ...candidate })),
  };
  runtime.contrabandBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'contraband_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'neutral-contraband',
      role: choice.role,
      candidateCount: choice.candidates.length,
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'contraband_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      role: choice.role,
      candidates: choice.candidates.map(candidate => ({
        sourceInstanceId: candidate.sourceInstanceId,
        cardId: candidate.cardId,
        effectLabel: candidate.effectLabel,
      })),
    },
  });
}

export function queueV070ReconnaissanceBattleRevealChoice(
  state: V070GameState,
  choice: V070ReconnaissanceBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Reconnaissance battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Reconnaissance cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingReconnaissanceBattleRevealChoice = { ...choice };
  runtime.reconnaissanceBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'reconnaissance_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'intelligence-reconnaissance',
      mandatory: false,
    },
  });
}


export function queueV070OperationalReassessmentBattleRevealChoice(
  state: V070GameState,
  choice: V070OperationalReassessmentBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Operational Reassessment battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Operational Reassessment cannot open while another reveal-timing battle choice is pending.',
    );
  }

  runtime.pendingOperationalReassessmentBattleRevealChoice = {
    ...choice,
    candidateInstanceIds: [...choice.candidateInstanceIds],
  };
  runtime.operationalReassessmentBattleRevealChoiceOpen = true;

  appendV070Event(state, {
    type: 'operational_reassessment_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'intelligence-operational-reassessment',
      role: choice.role,
      replacementCount: choice.candidateInstanceIds.length,
      choices: choice.candidateInstanceIds.length > 0
        ? ['withdraw', 'replace']
        : ['withdraw'],
      mandatory: true,
    },
  });
  appendV070Event(state, {
    type: 'operational_reassessment_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      role: choice.role,
      candidateInstanceIds: [...choice.candidateInstanceIds],
    },
  });
}

export function queueV070ReserveForceBattleRevealChoice(
  state: V070GameState,
  choice: V070ReserveForceBattleRevealChoice,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Reserve Force battle resolution requires an active battle.',
    );
  }
  if (pendingV070BattleRevealChoice(state)) {
    throw new V070GameActionError(
      'Reserve Force cannot open while another reveal-timing battle choice is pending.',
    );
  }
  runtime.pendingReserveForceBattleRevealChoice = {
    ...choice,
    candidateInstanceIds: [...choice.candidateInstanceIds],
  };
  runtime.reserveForceBattleRevealChoiceOpen = true;
  appendV070Event(state, {
    type: 'reserve_force_battle_choice_pending',
    actor: choice.owner,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: 'military-reserve-force',
      role: choice.role,
      candidateCount: choice.candidateInstanceIds.length,
      maximumReplacements: 2,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'reserve_force_battle_choice_options',
    actor: choice.owner,
    visibility: choice.owner,
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      role: choice.role,
      candidateInstanceIds: [...choice.candidateInstanceIds],
      maximumReplacements: 2,
    },
  });
}

export function pendingV070BattleRevealChoice(
  state: V070GameState,
): V070BattleRevealChoice | null {
  return state.battleRuntime?.pendingPlenipotentiaryBattleRevealChoice
    ?? state.battleRuntime?.pendingOperationalReassessmentBattleRevealChoice
    ?? state.battleRuntime?.pendingReserveForceBattleRevealChoice
    ?? state.battleRuntime?.pendingContrabandBattleRevealChoice
    ?? state.battleRuntime?.pendingFinancierPreDiceBattleRevealChoice
    ?? state.battleRuntime?.pendingHellfireBattleRevealChoice
    ?? state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice
    ?? state.battleRuntime?.pendingReconnaissanceBattleRevealChoice
    ?? state.battleRuntime?.pendingRendTheVeilBattleRevealChoice
    ?? state.battleRuntime?.pendingHeresyBattleRevealChoice
    ?? state.battleRuntime?.pendingArcaneKnowledgeBattleRevealChoice
    ?? state.battleRuntime?.pendingWitchcraftBattleRevealChoice
    ?? previous.pendingV070BattleRevealChoice(state);
}

export function isV070BattleRevealChoiceOpen(
  state: V070GameState,
): boolean {
  if (state.battleRuntime?.pendingPlenipotentiaryBattleRevealChoice) {
    return Boolean(state.battleRuntime.plenipotentiaryBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingOperationalReassessmentBattleRevealChoice) {
    return Boolean(
      state.battleRuntime.operationalReassessmentBattleRevealChoiceOpen,
    );
  }
  if (state.battleRuntime?.pendingReserveForceBattleRevealChoice) {
    return Boolean(state.battleRuntime.reserveForceBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingContrabandBattleRevealChoice) {
    return Boolean(state.battleRuntime.contrabandBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingFinancierPreDiceBattleRevealChoice) {
    return Boolean(
      state.battleRuntime.financierPreDiceBattleRevealChoiceOpen,
    );
  }
  if (state.battleRuntime?.pendingHellfireBattleRevealChoice) {
    return Boolean(state.battleRuntime.hellfireBattleRevealChoiceOpen);
  }
  if (state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice) {
    return Boolean(
      state.battleRuntime.lateAdditionalTacticBattleRevealChoiceOpen,
    );
  }
  if (state.battleRuntime?.pendingReconnaissanceBattleRevealChoice) {
    return Boolean(state.battleRuntime.reconnaissanceBattleRevealChoiceOpen);
  }
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

export function completeV070FinancierPreDiceBattleRevealChoice(
  state: V070GameState,
  expectedKind: V070FinancierPreDiceBattleRevealChoice['kind'],
): V070FinancierPreDiceBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingFinancierPreDiceBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.financierPreDiceBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Financier pre-dice battle choice.',
    );
  }
  if (pending.kind !== expectedKind) {
    throw new V070GameActionError(
      `The pending Financier pre-dice choice is ${pending.kind}, not ${expectedKind}.`,
    );
  }
  runtime.pendingFinancierPreDiceBattleRevealChoice = null;
  runtime.financierPreDiceBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070PlenipotentiaryBattleRevealChoice(
  state: V070GameState,
): V070PlenipotentiaryBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingPlenipotentiaryBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.plenipotentiaryBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Plenipotentiary battle choice.',
    );
  }
  runtime.pendingPlenipotentiaryBattleRevealChoice = null;
  runtime.plenipotentiaryBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070HellfireBattleRevealChoice(
  state: V070GameState,
): V070HellfireBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingHellfireBattleRevealChoice;
  if (!runtime || !pending || !runtime.hellfireBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Hellfire battle choice.',
    );
  }
  runtime.pendingHellfireBattleRevealChoice = null;
  runtime.hellfireBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070LateAdditionalTacticBattleRevealChoice(
  state: V070GameState,
): V070LateAdditionalTacticBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingLateAdditionalTacticBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.lateAdditionalTacticBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open late additional-Tactic choice.',
    );
  }
  runtime.pendingLateAdditionalTacticBattleRevealChoice = null;
  runtime.lateAdditionalTacticBattleRevealChoiceOpen = false;
  return pending;
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

export function completeV070ContrabandBattleRevealChoice(
  state: V070GameState,
): V070ContrabandBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingContrabandBattleRevealChoice;
  if (!runtime || !pending || !runtime.contrabandBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Contraband battle replacement choice.',
    );
  }
  runtime.pendingContrabandBattleRevealChoice = null;
  runtime.contrabandBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070OperationalReassessmentBattleRevealChoice(
  state: V070GameState,
): V070OperationalReassessmentBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingOperationalReassessmentBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.operationalReassessmentBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Operational Reassessment battle-effect choice.',
    );
  }
  runtime.pendingOperationalReassessmentBattleRevealChoice = null;
  runtime.operationalReassessmentBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070ReserveForceBattleRevealChoice(
  state: V070GameState,
): V070ReserveForceBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingReserveForceBattleRevealChoice;
  if (!runtime
    || !pending
    || !runtime.reserveForceBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Reserve Force battle replacement choice.',
    );
  }
  runtime.pendingReserveForceBattleRevealChoice = null;
  runtime.reserveForceBattleRevealChoiceOpen = false;
  return pending;
}

export function completeV070ReconnaissanceBattleRevealChoice(
  state: V070GameState,
): V070ReconnaissanceBattleRevealChoice {
  const runtime = state.battleRuntime;
  const pending = runtime?.pendingReconnaissanceBattleRevealChoice;
  if (!runtime || !pending || !runtime.reconnaissanceBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'There is no open Reconnaissance battle-effect choice.',
    );
  }
  runtime.pendingReconnaissanceBattleRevealChoice = null;
  runtime.reconnaissanceBattleRevealChoiceOpen = false;
  return pending;
}
