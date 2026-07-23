import type { CardID, PlayerID, SpaceID } from './ids';

export type ProposalID =
  | 'de-escalation' | 'orderly-withdrawal' | 'capitulation' | 'open-channels'
  | 'mutual-disarmament' | 'prisoner-exchange' | 'rebuilding-pact'
  | 'ultimatum' | 'diplomatic-recognition';

export interface ProposalDefinition {
  id: ProposalID;
  name: string;
  stake: 0 | 1 | 2;
  requirement: string;
  accepted: string;
  refused: string;
}

export interface DiplomatSanctionState {
  cardId: CardID;
  diplomatId: PlayerID;
  opponentId: PlayerID;
  territoryId?: string;
  spaceId?: SpaceID;
  censureLastTriggeredTurn?: number;
}

export interface DiplomatState {
  ratifiedProposals: ProposalID[];
  activeTerms?: ActiveTermsState;
  sanctionsAgainst?: Partial<Record<PlayerID, CardID[]>>;
  sanctionStates?: DiplomatSanctionState[];
  termsCards?: {
    setAsideCards: CardID[];
    goodFaithCard?: CardID;
    latitudeCard?: CardID;
    nonbindingCard?: CardID;
    tradeConcessionsCard?: CardID;
    gunboatCard?: CardID;
    neutralObserversUsed?: boolean;
    safeConductAvailable?: boolean;
  };
}

export interface ActiveTermsState {
  diplomat: PlayerID;
  opponent: PlayerID;
  proposalIds: ProposalID[];
  selectedProposalId?: ProposalID;
  stake: number;
  contestedSpace: SpaceID;
  attacker: PlayerID;
  defender: PlayerID;
  response?: 'accepted' | 'refused';
  leverageSpent?: number;
  refusedBattleDrawBonus?: number;
  refusedBattleModifier?: number;
  refusedLossDraw?: number;
  refusedImmediateCapture?: boolean;
}

export type PendingDiplomatChoice =
  | { kind: 'offer_terms'; playerId: PlayerID; opponentId: PlayerID; contestedSpace: SpaceID; eligibleProposals: ProposalID[]; options: Array<'offer' | 'decline'> }
  | { kind: 'respond_to_terms'; playerId: PlayerID; diplomatId: PlayerID; proposalIds: ProposalID[]; stake: number; options: Array<'accept' | 'refuse'> }
  | { kind: 'leverage'; playerId: PlayerID; maximum: number; options: number[] }
  | { kind: 'political_capital'; playerId: PlayerID; lostStake: number; handOptions: CardID[] }
  | { kind: 'mutual_disarmament'; playerId: PlayerID; diplomatId: PlayerID; opponentId: PlayerID; stage: 'diplomat' | 'opponent'; handOptions: CardID[] }
  | { kind: 'prisoner_exchange'; playerId: PlayerID; diplomatId: PlayerID; opponentId: PlayerID; stage: 'diplomat' | 'opponent'; graveyardOptions: CardID[]; optional: true }
  | { kind: 'rebuilding_pact'; playerId: PlayerID; diplomatId: PlayerID; opponentId: PlayerID; stage: 'diplomat' | 'opponent'; handOptions: CardID[]; optional: true }
  | { kind: 'trade_concessions'; playerId: PlayerID; diplomatId: PlayerID; options: Array<'draw_two' | 'bank_asset'> }
  | { kind: 'nonbinding_resolution'; playerId: PlayerID; diplomatId: PlayerID; proposalId: ProposalID; options: Array<'ratify' | 'decline_ratification'> }
  | { kind: 'latitude_refusal'; playerId: PlayerID; diplomatId: PlayerID; proposalIds: ProposalID[] }
  | { kind: 'clemency'; playerId: PlayerID; diplomatId: PlayerID; cardId: CardID; options: Array<'release' | 'leave'> }
  | { kind: 'censure'; playerId: PlayerID; diplomatId: PlayerID; options: Array<'discard' | 'diplomat_draw'> }
  | { kind: 'demilitarized_zone_upkeep'; playerId: PlayerID; diplomatId: PlayerID; spaceId: SpaceID; options: Array<'discard' | 'withdraw'> }
  | { kind: 'sanction_movement'; playerId: PlayerID; diplomatId: PlayerID; cardId: CardID; spaceId: SpaceID; options: Array<'discard' | 'influence'> };
