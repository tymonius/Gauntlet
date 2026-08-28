import type { PlayerId } from './rules';

export type V070BattleRuntimeStage =
  | 'onset'
  | 'set_gambits'
  | 'reveal_gambits'
  | 'choose_tactics'
  | 'reveal_tactics'
  | 'outcome'
  | 'tiebreak'
  | 'aftermath'
  | 'halted';

export interface V070BattleCardCommitment {
  instanceId: string;
  owner: PlayerId;
  role: 'gambit' | 'tactic';
  faceUp: boolean;
}

export type V070TermsStage =
  | 'closed'
  | 'opportunity'
  | 'response'
  | 'proposal_choice'
  | 'refused'
  | 'political_capital';

export type V070ProposalChoiceKind =
  | 'mutual_disarmament_accepted'
  | 'mutual_disarmament_refused'
  | 'prisoner_exchange_accepted'
  | 'prisoner_exchange_refused'
  | 'rebuilding_pact_accepted'
  | 'rebuilding_pact_refused'
  | 'diplomatic_latitude_accepted'
  | 'diplomatic_latitude_refused';

export interface V070ProposalChoiceRuntime {
  kind: V070ProposalChoiceKind;
  playerId: PlayerId;
  stage: 'diplomat' | 'opponent' | 'single';
  optional: boolean;
}

export interface V070TermsRuntime {
  stage: V070TermsStage;
  priorityPlayer: PlayerId | null;
  offerer: PlayerId | null;
  opponent: PlayerId | null;
  proposalId: string | null;
  offeredProposalIds: string[];
  ratifiedAtOffer: string[];
  diplomaticLatitudeInstanceId: string | null;
  response: 'accepted' | 'refused' | null;
  stake: number;
  leverageResolved: boolean;
  leverageBonus: number;
  leverageCost: number;
  politicalCapitalPending: boolean;
  acceptingPlayer: PlayerId | null;
  proposalChoice: V070ProposalChoiceRuntime | null;
  deferredAfterPoliticalCapital: V070ProposalChoiceKind | null;
}

export interface V070BattleParticipantRuntime {
  gambit: V070BattleCardCommitment | null | undefined;
  reserve: string[];
  reserveBonus: number;
  tactic: V070BattleCardCommitment | null | undefined;
  battleModifier: number;
  advantage: number;
  disadvantage: number;
  battleDice: number[];
  selectedBattleDie: number | null;
  battleTotal: number | null;
  tiebreakRolls: number[];
}

export interface V070UnsupportedBattleEffect {
  owner: PlayerId;
  instanceId: string;
  cardId: string;
  role: 'gambit' | 'tactic';
  label: string;
  text: string;
  encounteredAt: 'reveal_gambits' | 'reveal_tactics';
}

export interface V070BattleRuntime {
  stage: V070BattleRuntimeStage;
  participants: Record<PlayerId, V070BattleParticipantRuntime>;
  terms: V070TermsRuntime;
  unsupportedEffects: V070UnsupportedBattleEffect[];
}

export function createV070BattleRuntime(): V070BattleRuntime {
  return {
    stage: 'onset',
    participants: {
      A: createParticipant(),
      B: createParticipant(),
    },
    terms: {
      stage: 'closed',
      priorityPlayer: null,
      offerer: null,
      opponent: null,
      proposalId: null,
      offeredProposalIds: [],
      ratifiedAtOffer: [],
      diplomaticLatitudeInstanceId: null,
      response: null,
      stake: 0,
      leverageResolved: true,
      leverageBonus: 0,
      leverageCost: 0,
      politicalCapitalPending: false,
      acceptingPlayer: null,
      proposalChoice: null,
      deferredAfterPoliticalCapital: null,
    },
    unsupportedEffects: [],
  };
}

function createParticipant(): V070BattleParticipantRuntime {
  return {
    gambit: undefined,
    reserve: [],
    reserveBonus: 0,
    tactic: undefined,
    battleModifier: 0,
    advantage: 0,
    disadvantage: 0,
    battleDice: [],
    selectedBattleDie: null,
    battleTotal: null,
    tiebreakRolls: [],
  };
}
