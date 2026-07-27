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
  tyrannyAssetUseTurn?: number;
  tyrannyAssetUsesThisTurn?: number;
}

export interface InquisitionConfessionConstraint {
  inquisitorId: PlayerID;
  opponentId: PlayerID;
  cardId: CardID;
  expiresTurn: number;
}

export interface InquisitionFinalJudgmentPurgeOption {
  mode: InquisitionPurgeMode;
  originalCost: 1 | 2 | 3 | 4;
  effectiveCost: 1 | 2 | 3;
  cardId?: CardID;
  cardIds?: CardID[];
}

export interface PendingInquisitionFinalJudgmentChoice {
  kind: 'final_judgment_purge';
  playerId: PlayerID;
  battleId: string;
  purgeOptions: InquisitionFinalJudgmentPurgeOption[];
  options: ['select_purge'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionPurgeHandChoice {
  kind: 'purge_hand_choice';
  playerId: PlayerID;
  inquisitorId: PlayerID;
  handOptions: CardID[];
  cost: number;
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

export interface InquisitionGuiltByAssociationBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
  usedCardOptions: CardID[];
}

export interface PendingInquisitionGuiltByAssociationBattleChoice {
  kind: 'guilt_by_association_battle';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  queueId: string;
  usedCardOptions: CardID[];
  options: ['select_title'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionActOfFaithBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionActOfFaithChoice {
  kind: 'act_of_faith';
  playerId: PlayerID;
  opponentId: PlayerID;
  source: 'action' | 'battle';
  revealedCards: CardID[];
  battleId?: string;
  queueId?: string;
  options: ['select_graveyard'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionBurningAtTheStakeBattleQueueEntry {
  id: string;
  battleId: string;
  inquisitorId: PlayerID;
  opponentId: PlayerID;
}

export interface PendingInquisitionBurningAtTheStakeChoice {
  kind: 'burning_at_the_stake';
  playerId: PlayerID;
  opponentId: PlayerID;
  source: 'action' | 'battle';
  revealedHand: CardID[];
  highestValueOptions: CardID[];
  battleId?: string;
  queueId?: string;
  options: ['select_highest'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionConfessionActionChoice {
  kind: 'confession_action';
  playerId: PlayerID;
  opponentId: PlayerID;
  handOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionConfessionBattleChoice {
  kind: 'confession_battle';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  replacementOptions: CardID[];
  originalCommitCardId: CardID;
  options: ['pass', 'replace'];
  resumePriorityPlayer?: PlayerID;
}

export interface InquisitionTyrannyTargetOption {
  targetKey: string;
  cardId: CardID;
  owner: PlayerID;
  sourceSlot: 'hand_commit' | 'battle_draw_played';
  sourceIndex?: number;
}

export interface PendingInquisitionTyrannyChoice {
  kind: 'tyranny_negate';
  playerId: PlayerID;
  battleId: string;
  sourceKind: 'battle_card' | 'asset';
  sourceSlot?: 'hand_commit' | 'battle_draw_played';
  sourceIndex?: number;
  targetOptions: InquisitionTyrannyTargetOption[];
  options: ['negate'] | ['pass', 'negate'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionNoMartyrsAssetChoice {
  kind: 'no_martyrs_asset';
  playerId: PlayerID;
  battleId: string;
  copyNumber: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionHellfireActionChoice {
  kind: 'hellfire_action';
  playerId: PlayerID;
  opponentId: PlayerID;
  maxSpend: number;
  options: ['spend'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionHellfireBattleChoice {
  kind: 'hellfire_battle';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  maxSpend: number;
  options: ['allocate'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInquisitionHeresyChoice {
  kind: 'heresy_replay';
  playerId: PlayerID;
  opponentId: PlayerID;
  battleId: string;
  graveyardOptions: CardID[];
  options: ['pass', 'replay'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingInquisitionChoice =
  | PendingInquisitionFinalJudgmentChoice
  | PendingInquisitionPurgeHandChoice
  | PendingInquisitionAccusationSelectChoice
  | PendingInquisitionAccusationDestinationChoice
  | PendingInquisitionPenanceActionChoice
  | PendingInquisitionPenanceBattleChoice
  | PendingInquisitionDivineMercyBattleChoice
  | PendingInquisitionExcommunicationBattleChoice
  | PendingInquisitionGuiltByAssociationBattleChoice
  | PendingInquisitionActOfFaithChoice
  | PendingInquisitionBurningAtTheStakeChoice
  | PendingInquisitionConfessionActionChoice
  | PendingInquisitionConfessionBattleChoice
  | PendingInquisitionTyrannyChoice
  | PendingInquisitionNoMartyrsAssetChoice
  | PendingInquisitionHellfireActionChoice
  | PendingInquisitionHellfireBattleChoice
  | PendingInquisitionHeresyChoice;

export type PublicInquisitionState = InquisitionState;
