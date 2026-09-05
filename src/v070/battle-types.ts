import type { PlayerId, V070BattleOutcome } from './rules';

export type V070BattleRuntimeStage =
  | 'onset'
  | 'set_gambits'
  | 'reveal_gambits'
  | 'choose_tactics'
  | 'reveal_tactics'
  | 'outcome'
  | 'tiebreak'
  | 'loss_replacement'
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
  | 'terms_card_choice'
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

export type V070TermsCardChoiceKind =
  | 'good_faith_set_aside'
  | 'nonbinding_resolution'
  | 'trade_concessions'
  | 'demilitarized_zone';

export interface V070TermsCardChoiceRuntime {
  kind: V070TermsCardChoiceKind;
  playerId: PlayerId;
  sourceInstanceId: string | null;
}

export interface V070TermsCardsRuntime {
  diplomaticDivinations: Array<{
    instanceId: string;
    prediction: 'accept' | 'refuse';
  }>;
  tradeConcessionsInstanceIds: string[];
  goodFaithSetAsideInstanceIds: string[];
  nonbindingResolutionInstanceIds: string[];
  resolvedNonbindingResolutionInstanceIds: string[];
  gunboatDiplomacyInstanceIds: string[];
  nonbindingSuppressRatification: boolean;
  acceptedStakeReturned: boolean;
  acceptedRatificationComplete: boolean;
  acceptedNewlyRatified: boolean;
}

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
  termsCardChoice: V070TermsCardChoiceRuntime | null;
  termsCards: V070TermsCardsRuntime;
  deferredAfterPoliticalCapital: V070ProposalChoiceKind | null;
}

export interface V070BattleParticipantRuntime {
  gambit: V070BattleCardCommitment | null | undefined;
  additionalGambits: V070BattleCardCommitment[];
  reserve: string[];
  reserveBonus: number;
  tactic: V070BattleCardCommitment | null | undefined;
  additionalTactics: V070BattleCardCommitment[];
  tacticLimit: number;
  tacticChoicesMade: number;
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

export interface V070AdditionalRetreatEffect {
  sourceInstanceId: string;
  sourceCardId: string;
  targetPlayer: PlayerId;
  steps: number;
}

export interface V070AftermathDrawEffect {
  sourceInstanceId: string;
  sourceCardId: string;
  owner: PlayerId;
  count: number;
}

export interface V070BattleCardAftermathDestinationOverride {
  sourceCardId: string;
  playerId: PlayerId;
  instanceId: string;
  destination: 'discard' | 'graveyard' | 'hand';
}

export interface V070BattleCardAftermathOverlayPlacement {
  sourceInstanceId: string;
  sourceCardId: string;
  owner: PlayerId;
  territoryInstanceId: string;
  condition: 'always' | 'owner_win';
}

export interface V070BattleCardAftermathTerritoryInsertion {
  sourceInstanceId: string;
  sourceCardId: string;
  owner: PlayerId;
  condition: 'owner_win_as_attacker';
  location: 'front_line';
}

export interface V070BattleCardAftermathAssetBank {
  sourceInstanceId: string;
  sourceCardId: string;
  owner: PlayerId;
  condition: 'owner_win';
}

export interface V070BattleAftermathControlledEffectChoiceRuntime {
  playerId: PlayerId;
  candidateSourceInstanceIds: string[];
  immediateWinner: PlayerId | null;
}

export interface V070SpiritHollowAftermathRuntime {
  playerId: PlayerId;
  overlayInstanceId: string;
  territoryInstanceId: string;
  candidateHandInstanceIds: string[];
  candidateGraveyardInstanceIds: string[];
}

export interface V070FortificationsRetreatRuntime {
  playerId: PlayerId;
  sourceInstanceId: string;
}

export interface V070GambitOrderOverride {
  source: 'neutral_observers' | 'watchtower';
  firstPlayer: PlayerId;
  secondPlayer: PlayerId;
  nextPlayer: PlayerId | null;
  firstCommitmentFaceUp: boolean;
}

export interface V070RefusedTermsContext {
  offerer: PlayerId;
  opponent: PlayerId;
}

export interface V070AccursedWagerAftermathRuntime {
  loser: PlayerId;
  remainingSourceActionInstanceIds: string[];
  immediateWinner: PlayerId | null;
}

export interface V070TerritoryAftermathChoiceRuntime {
  kind: 'field_hospital' | 'old_battlefield' | 'spoils_of_war';
  playerId: PlayerId;
  candidateInstanceIds: string[];
  immediateWinner: PlayerId | null;
}

export interface V070TerritoryAftermathOverride {
  source: 'Field Hospital' | 'Old Battlefield' | 'Arena: Spoils of War';
  playerId: PlayerId;
  instanceId: string;
  destination: 'discard' | 'graveyard' | 'hand';
}

export interface V070PoisonousGasAftermathRuntime {
  playerId: PlayerId;
  candidateInstanceIds: string[];
  remainingPlayerIds: PlayerId[];
  immediateWinner: PlayerId | null;
}

export type V070ResistanceOnsetResumeAction =
  | { type: 'proceed_from_onset'; playerId: PlayerId }
  | { type: 'pass_terms'; playerId: PlayerId }
  | { type: 'offer_terms'; playerId: PlayerId; proposalId: string }
  | { type: 'return_after_ranger_fieldcraft'; playerId: PlayerId };

export type V070SubversionAssetBattleContinuation =
  | {
      type: 'use_plenipotentiary';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'use_good_faith';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'use_neutral_observers';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'use_safe_conduct';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'use_foothold_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | {
      type: 'apply_resistance_onset_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | {
      type: 'apply_fortifications_tactic_limit_asset';
      playerId: PlayerId;
      assetInstanceId: string;
    }
  | {
      type: 'resolve_battle_aftermath_controlled_effect';
      playerId: PlayerId;
      sourceInstanceId: string;
      replaceAssetInstanceId?: string;
    };

export interface V070SubversionAssetBattleRuntime {
  playerId: PlayerId;
  targetOwner: PlayerId;
  targetAssetInstanceId: string;
  effectLabel: string;
  candidateSubversionInstanceIds: string[];
  deferredAction: V070SubversionAssetBattleContinuation;
  resistanceOnsetResumeAction?: V070ResistanceOnsetResumeAction;
}

export interface V070BattleRuntime {
  stage: V070BattleRuntimeStage;
  participants: Record<PlayerId, V070BattleParticipantRuntime>;
  terms: V070TermsRuntime;
  refusedTermsContext: V070RefusedTermsContext | null;
  gambitOrderOverride: V070GambitOrderOverride | null;
  pendingOutcome: V070BattleOutcome | null;
  pendingAccursedWager: V070AccursedWagerAftermathRuntime | null;
  battleAccursedWagerInstanceIds: string[];
  pendingBattleAftermathControlledEffectChoice:
    V070BattleAftermathControlledEffectChoiceRuntime | null;
  battleAftermathControlledEffectNextPlayer: PlayerId | null;
  pendingTerritoryAftermathChoice:
    V070TerritoryAftermathChoiceRuntime | null;
  territoryAftermathChoiceResolved: boolean;
  territoryAftermathOverride: V070TerritoryAftermathOverride | null;
  pendingPoisonousGasAftermath:
    V070PoisonousGasAftermathRuntime | null;
  poisonousGasAftermathResolved: boolean;
  poisonousGasReserveGraveyardInstanceIds: string[];
  aftermathPositionsSynchronized: boolean;
  aftermathCardsCleared: boolean;
  pendingSpiritHollowAftermath: V070SpiritHollowAftermathRuntime | null;
  spiritHollowAftermathPlayers: PlayerId[] | null;
  pendingSubversionAssetBattle: V070SubversionAssetBattleRuntime | null;
  resistanceAssetOnsetProcessedInstanceIds: string[];
  fortificationsAssetTacticLimitResolved: boolean;
  fortificationsRetreatSourceInstanceIds: string[];
  fortificationsRetreatResolvedSourceInstanceIds: string[];
  pendingFortificationsRetreat: V070FortificationsRetreatRuntime | null;
  footholdAssetWindowPlayer: PlayerId | null;
  footholdAssetWindowResolved: boolean;
  routWindowOpen: boolean;
  finalJudgmentWindowOpen: boolean;
  relentlessPursuitWindowOpen: boolean;
  guardiansWindowOpen: boolean;
  mysticLossInterruptionResolved: boolean;
  additionalRetreatEffects: V070AdditionalRetreatEffect[];
  aftermathDrawEffects: V070AftermathDrawEffect[];
  battleCardAftermathDestinationOverrides:
    V070BattleCardAftermathDestinationOverride[];
  battleCardAftermathOverlayPlacements:
    V070BattleCardAftermathOverlayPlacement[];
  battleCardAftermathTerritoryInsertions:
    V070BattleCardAftermathTerritoryInsertion[];
  battleCardAftermathAssetBanks:
    V070BattleCardAftermathAssetBank[];
  militaryOrderUsedPlayers: PlayerId[];
  unbrokenRanksInstanceIds: string[];
  pendingGameVictory: {
    winner: PlayerId;
    route:
      | 'last_stand'
      | 'final_territory_capture'
      | 'ritual_of_ascension';
  } | null;
  activeOverlayAtOnset: string | null;
  activePrintedTerritoryAtOnset: {
    territoryInstanceId: string;
    territoryId: string;
  } | null;
  assetInactivePlayers: PlayerId[];
  assetUseProhibitedPlayers: PlayerId[];
  trainingGroundsRedrawPlayer: PlayerId | null;
  trainingGroundsRedrawResolved: boolean;
  gambitProhibitedPlayers: PlayerId[];
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
      termsCardChoice: null,
      termsCards: {
        diplomaticDivinations: [],
        tradeConcessionsInstanceIds: [],
        goodFaithSetAsideInstanceIds: [],
        nonbindingResolutionInstanceIds: [],
        resolvedNonbindingResolutionInstanceIds: [],
        gunboatDiplomacyInstanceIds: [],
        nonbindingSuppressRatification: false,
        acceptedStakeReturned: false,
        acceptedRatificationComplete: false,
        acceptedNewlyRatified: false,
      },
      deferredAfterPoliticalCapital: null,
    },
    refusedTermsContext: null,
    gambitOrderOverride: null,
    pendingOutcome: null,
    pendingAccursedWager: null,
    battleAccursedWagerInstanceIds: [],
    pendingBattleAftermathControlledEffectChoice: null,
    battleAftermathControlledEffectNextPlayer: null,
    pendingTerritoryAftermathChoice: null,
    territoryAftermathChoiceResolved: false,
    territoryAftermathOverride: null,
    pendingPoisonousGasAftermath: null,
    poisonousGasAftermathResolved: false,
    poisonousGasReserveGraveyardInstanceIds: [],
    aftermathPositionsSynchronized: false,
    aftermathCardsCleared: false,
    pendingSpiritHollowAftermath: null,
    spiritHollowAftermathPlayers: null,
    pendingSubversionAssetBattle: null,
    resistanceAssetOnsetProcessedInstanceIds: [],
    fortificationsAssetTacticLimitResolved: false,
    fortificationsRetreatSourceInstanceIds: [],
    fortificationsRetreatResolvedSourceInstanceIds: [],
    pendingFortificationsRetreat: null,
    footholdAssetWindowPlayer: null,
    footholdAssetWindowResolved: false,
    routWindowOpen: false,
    finalJudgmentWindowOpen: false,
    relentlessPursuitWindowOpen: false,
    guardiansWindowOpen: false,
    mysticLossInterruptionResolved: false,
    additionalRetreatEffects: [],
    aftermathDrawEffects: [],
    battleCardAftermathDestinationOverrides: [],
    battleCardAftermathOverlayPlacements: [],
    battleCardAftermathTerritoryInsertions: [],
    battleCardAftermathAssetBanks: [],
    militaryOrderUsedPlayers: [],
    unbrokenRanksInstanceIds: [],
    pendingGameVictory: null,
    activeOverlayAtOnset: null,
    activePrintedTerritoryAtOnset: null,
    assetInactivePlayers: [],
    assetUseProhibitedPlayers: [],
    trainingGroundsRedrawPlayer: null,
    trainingGroundsRedrawResolved: false,
    gambitProhibitedPlayers: [],
    unsupportedEffects: [],
  };
}

function createParticipant(): V070BattleParticipantRuntime {
  return {
    gambit: undefined,
    additionalGambits: [],
    reserve: [],
    reserveBonus: 0,
    tactic: undefined,
    additionalTactics: [],
    tacticLimit: 1,
    tacticChoicesMade: 0,
    battleModifier: 0,
    advantage: 0,
    disadvantage: 0,
    battleDice: [],
    selectedBattleDie: null,
    battleTotal: null,
    tiebreakRolls: [],
  };
}
