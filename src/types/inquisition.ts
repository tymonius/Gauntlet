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

export interface InquisitionPenanceBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionPenanceActionChoice {
  kind: 'penance_action';
  playerId: PlayerID;
  inquisitorId: PlayerID;
  handOptions: CardID[];
  options: ['sacrifice', 'conviction'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionPenanceBattleChoice {
  kind: 'penance_battle';
  playerId: PlayerID;
  inquisitorId: PlayerID;
  battleId: string;
  queueId: string;
  handOptions: CardID[];
  options: ['sacrifice', 'bonus'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionDivineMercyBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionDivineMercyBattleChoice {
  kind: 'divine_mercy_battle';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  queueId: string;
  graveyardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionExcommunicationBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionExcommunicationBattleChoice {
  kind: 'excommunication_battle';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  queueId: string;
  discardOptions: CardID[];
  valueLimit: 3;
  options: ['select_cards'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingInquisitionChoice =
  | PendingInquisitionPurgeHandChoice
  | PendingInquisitionAccusationSelectChoice
  | PendingInquisitionAccusationDestinationChoice
  | PendingInquisitionPenanceActionChoice
  | PendingInquisitionPenanceBattleChoice
  | PendingInquisitionDivineMercyBattleChoice
  | PendingInquisitionExcommunicationBattleChoice;

export type PublicInquisitionState = InquisitionState;
