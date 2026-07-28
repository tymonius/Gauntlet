import type { BattleCardTarget } from '../effects';
import type { CardID, PlayerID, SpaceID } from './ids';

export type DecoysAssetZone = 'asset_bank' | 'hand' | 'discard' | 'graveyard' | 'removed';

export interface DecoysAssetExit {
  exitId: string;
  cardId: CardID;
  destination?: Exclude<DecoysAssetZone, 'asset_bank'>;
}

export interface DecoysSourceLocation {
  sourceId: string;
  zone: DecoysAssetZone;
}

export interface DecoysAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  affectedAssets: DecoysAssetExit[];
  decoySources: DecoysSourceLocation[];
  triggersRemaining: number;
}

export interface PendingDecoysAssetChoice {
  kind: 'decoys_asset';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  assetOptions: DecoysAssetExit[];
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

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

export interface FootholdAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  battleId: string;
  triggersRemaining: number;
}

export interface PendingFootholdAssetChoice {
  kind: 'foothold_asset';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}


export interface PendingPalisadeWallAssetChoice {
  kind: 'palisade_wall_asset';
  playerId: PlayerID;
  battleId: string;
  targetPlayerId: PlayerID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}


export interface PendingReinforcementsBattleChoice {
  kind: 'reinforcements_battle';
  playerId: PlayerID;
  battleId: string;
  drawnCardId: CardID;
  canPlay: boolean;
  resolverPlayerId: PlayerID;
  battleCardTargets?: BattleCardTarget[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface RequisitionBattleQueueEntry {
  id: string;
  playerId: PlayerID;
  battleId: string;
  triggersRemaining: number;
}

export interface PendingRequisitionBattleChoice {
  kind: 'requisition_battle';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  options: ['pass', 'select_card'];
  resumePriorityPlayer?: PlayerID;
}


export interface RousingSpeechAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  triggersRemaining: number;
}

export interface PendingRousingSpeechAssetChoice {
  kind: 'rousing_speech_asset';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingRousingSpeechDiscardChoice {
  kind: 'rousing_speech_discard';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  options: ['select_card'];
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

export type ScoutingReportActionMode =
  | 'inspect_own_draw'
  | 'inspect_opponent_draw'
  | 'inspect_opponent_hand';

export interface PendingScoutingReportActionChoice {
  kind: 'scouting_report_action';
  playerId: PlayerID;
  opponentId: PlayerID;
  options: ScoutingReportActionMode[];
  resumePriorityPlayer?: PlayerID;
}

export interface ScoutingReportBattleTargetOption {
  targetKey: string;
  targetOwner: PlayerID;
  targetSource: 'hand' | 'battle_draw';
}

export interface PendingScoutingReportBattleInspectChoice {
  kind: 'scouting_report_battle_inspect';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  targetOptions: ScoutingReportBattleTargetOption[];
  options: ['inspect'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingScoutingReportBattleReplaceChoice {
  kind: 'scouting_report_battle_replace';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  replacementOptions: CardID[];
  options: ['pass', 'replace'];
  resumePriorityPlayer?: PlayerID;
}


export interface SalvageBattleQueueEntry {
  id: string;
  playerId: PlayerID;
  battleId: string;
  cardIds: CardID[];
  triggersRemaining: number;
}

export interface PendingSalvageActionDiscardChoice {
  kind: 'salvage_action_discard';
  playerId: PlayerID;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSalvageBattleChoice {
  kind: 'salvage_battle';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSalvageBattleDiscardChoice {
  kind: 'salvage_battle_discard';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface ScorchedEarthAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  battleId: string;
  spaceId: SpaceID;
  triggersRemaining: number;
}

export interface PendingScorchedEarthAssetChoice {
  kind: 'scorched_earth_asset';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  spaceId: SpaceID;
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface NeutralSabotageAssetSuppression {
  id: string;
  sourcePlayerId: PlayerID;
  targetPlayerId: PlayerID;
  cardId: CardID;
  appliedTurn: number;
}

export interface SuppliesAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  triggersRemaining: number;
}

export interface SuppliesBattleQueueEntry {
  id: string;
  playerId: PlayerID;
  battleId: string;
  triggersRemaining: number;
}

export interface PendingSuppliesAssetChoice {
  kind: 'supplies_asset';
  playerId: PlayerID;
  entryId: string;
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSuppliesBattleDiscardChoice {
  kind: 'supplies_battle_discard';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingNeutralChoice =
  | PendingDecoysAssetChoice
  | PendingRedemptionAssetChoice
  | PendingRedemptionBattleChoice
  | PendingFootholdAssetChoice
  | PendingPalisadeWallAssetChoice
  | PendingReinforcementsBattleChoice
  | PendingRequisitionBattleChoice
  | PendingRousingSpeechAssetChoice
  | PendingRousingSpeechDiscardChoice
  | PendingReservesActionChoice
  | PendingReservesBattleChoice
  | PendingScoutingReportActionChoice
  | PendingScoutingReportBattleInspectChoice
  | PendingScoutingReportBattleReplaceChoice
  | PendingSalvageActionDiscardChoice
  | PendingSalvageBattleChoice
  | PendingSalvageBattleDiscardChoice
  | PendingScorchedEarthAssetChoice
  | PendingSuppliesAssetChoice
  | PendingSuppliesBattleDiscardChoice;

export interface RedemptionBattleReturns {
  battleId: string;
  byPlayer: Partial<Record<PlayerID, CardID[]>>;
}

export interface ReservesBattleTopdecks {
  battleId: string;
  byPlayer: Partial<Record<PlayerID, CardID[]>>;
  completedPlayers: PlayerID[];
}
