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

export interface DiplomatState {
  ratifiedProposals: ProposalID[];
  activeTerms?: ActiveTermsState;
  sanctionsAgainst?: Partial<Record<PlayerID, CardID[]>>;
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
  | { kind: 'rebuilding_pact'; playerId: PlayerID; diplomatId: PlayerID; opponentId: PlayerID; stage: 'diplomat' | 'opponent'; handOptions: CardID[]; optional: true };
