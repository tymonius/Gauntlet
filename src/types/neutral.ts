import type { CardID, PlayerID } from './ids';

export interface RedemptionDiscardQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  cardIds: CardID[];
  triggersRemaining: number;
}

export interface PendingRedemptionAssetChoice {
  kind: 'redemption_asset';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface RedemptionBattleTarget {
  sourceCardId: CardID;
  sourceOwner: PlayerID;
  targetCardId: CardID;
  targetOwner: PlayerID;
}

export interface PendingRedemptionBattleChoice {
  kind: 'redemption_battle';
  playerId: PlayerID;
  battleId: string;
  cardOptions: CardID[];
  selectCount: number;
  resolverPlayerId: PlayerID;
  battleCardTargets?: RedemptionBattleTarget[];
  options: ['select_cards'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingReservesActionChoice {
  kind: 'reserves_action';
  playerId: PlayerID;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingReservesBattleChoice {
  kind: 'reserves_battle';
  playerId: PlayerID;
  battleId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  resolverPlayerId: PlayerID;
  battleCardTargets?: RedemptionBattleTarget[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingNeutralChoice =
  | PendingRedemptionAssetChoice
  | PendingRedemptionBattleChoice
  | PendingReservesActionChoice
  | PendingReservesBattleChoice;

export interface RedemptionBattleReturns {
  battleId: string;
  byPlayer: Partial<Record<PlayerID, CardID[]>>;
}

export interface ReservesBattleTopdecks {
  battleId: string;
  byPlayer: Partial<Record<PlayerID, CardID[]>>;
  completedPlayers: PlayerID[];
}
