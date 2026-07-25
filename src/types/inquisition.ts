import type { CardID, PlayerID } from './ids';

export type InquisitionPurgeMode =
  | 'discard_top_to_graveyard'
  | 'discard_value_to_graveyard'
  | 'asset_to_graveyard'
  | 'opponent_choose_hand_to_graveyard'
  | 'choose_hand_to_graveyard';

export interface InquisitionState {
  /** Turn on which normal after-battle Conviction was last gained. */
  convictionBattleGainTurn?: number;
}

export interface PendingInquisitionPurgeHandChoice {
  kind: 'purge_hand_choice';
  playerId: PlayerID;
  inquisitorId: PlayerID;
  handOptions: CardID[];
  cost: 3;
  options: ['select'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionAccusationQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionAccusationSelectChoice {
  kind: 'accusation_select_card';
  playerId: PlayerID;
  opponentId: PlayerID;
  discardOptions: CardID[];
  queueId: string;
  battleId: string;
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionAccusationDestinationChoice {
  kind: 'accusation_destination';
  playerId: PlayerID;
  inquisitorId: PlayerID;
  cardId: CardID;
  queueId?: string;
  battleId?: string;
  options: ['top_deck', 'graveyard'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingInquisitionChoice =
  | PendingInquisitionPurgeHandChoice
  | PendingInquisitionAccusationSelectChoice
  | PendingInquisitionAccusationDestinationChoice;

export type PublicInquisitionState = InquisitionState;
