import type { BattleCardTarget } from '../effects/v06';
import type { CardID, PlayerID, SpaceID } from './ids';

export type DecoysAssetZone = 'asset_bank' | 'hand' | 'discard' | 'graveyard' | 'removed';

export interface DecoysAssetExit {
  exitId: string;
  cardId: CardID;
  destination?: Exclude<DecoysAssetZone, 'asset_bank'>;
  faceDown?: boolean;
}

export interface DecoysSourceLocation {
  sourceId: string;
  zone: DecoysAssetZone;
  exitId?: string;
}

export interface DecoysAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  affectedAssets: DecoysAssetExit[];
  deferredExits: DecoysAssetExit[];
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

export interface ArmisticeAssetQueueEntry {
  id: string;
  playerId: PlayerID;
  triggersRemaining: number;
}

export interface PendingArmisticeAssetChoice {
  kind: 'armistice_asset';
  playerId: PlayerID;
  entryId: string;
  triggersRemaining: number;
  cardOptions: CardID[];
  options: Array<'select_cards' | 'use'>;
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

export interface PendingInvasionBattleChoice {
  kind: 'invasion_battle';
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


export interface PendingConscriptionActionChoice {
  kind: 'conscription_action';
  playerId: PlayerID;
  cardOptions: CardID[];
  options: ['pass', 'play_action_card'];
  resumePriorityPlayer?: PlayerID;
}

export type ArcaneKnowledgeBattleSource =
  | { zone: 'hand_commit' }
  | { zone: 'battle_draw_played'; index: number };

export interface PendingArcaneKnowledgeBattleChoice {
  kind: 'arcane_knowledge_battle';
  playerId: PlayerID;
  battleId: string;
  source: ArcaneKnowledgeBattleSource;
  resolverPlayerId: PlayerID;
  battleCardTargets?: BattleCardTarget[];
  graveyardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export type ContrabandBattleSource =
  | { zone: 'hand_commit' }
  | { zone: 'battle_draw_played'; index: number };

export interface PendingContrabandBattleChoice {
  kind: 'contraband_battle';
  playerId: PlayerID;
  battleId: string;
  source: ContrabandBattleSource;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface CourtMartialCleanupRequest {
  id: string;
  sourcePlayerId: PlayerID;
  targetPlayerId: PlayerID;
  battleId: string;
  source: 'battle' | 'asset';
  assetConsumed?: boolean;
}

export interface PendingCourtMartialAssetChoice {
  kind: 'court_martial_asset';
  playerId: PlayerID;
  battleId: string;
  requestId: string;
  targetPlayerId: PlayerID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingCourtMartialRetreatChoice {
  kind: 'court_martial_retreat';
  playerId: PlayerID;
  battleId: string;
  requestId: string;
  sourcePlayerId: PlayerID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingTacticalPlanningActionChoice {
  kind: 'tactical_planning_action';
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

export interface SeditionBattleQueueEntry {
  id: string;
  sourcePlayerId: PlayerID;
  targetPlayerId: PlayerID;
  battleId: string;
  triggersRemaining: number;
  resolverPlayerId: PlayerID;
  battleCardTargets?: BattleCardTarget[];
}

export interface PendingSeditionActionChoice {
  kind: 'sedition_action';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSeditionBattleChoice {
  kind: 'sedition_battle';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  triggersRemaining: number;
  resolverPlayerId: PlayerID;
  battleCardTargets?: BattleCardTarget[];
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



export interface StrategicWithdrawalBattleTargetOption {
  targetKey: string;
  cardId: CardID;
  origin: 'hand' | 'battle_draw' | 'replayed';
}

export interface PendingStrategicWithdrawalBattleChoice {
  kind: 'strategic_withdrawal_battle';
  playerId: PlayerID;
  battleId: string;
  triggerSourceKey: string;
  sourceKeysRemaining: string[];
  targetOptions: StrategicWithdrawalBattleTargetOption[];
  retreatDirection: -1 | 1;
  options: ['pass', 'use'];
  resume: {
    playerId: PlayerID;
    battleCardTargets?: BattleCardTarget[];
  };
  resumePriorityPlayer?: PlayerID;
}

export interface PendingStandGroundMovementChoice {
  kind: 'stand_ground_movement';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  sourceCardId: CardID;
  battleId: string;
  movementKind: 'no_martyrs' | 'war_crimes' | 'shock_and_awe';
  triggersRemaining: number;
  options: ['pass', 'use'];
  resume:
    | {
      kind: 'resolve_battle';
      playerId: PlayerID;
      battleCardTargets?: BattleCardTarget[];
    }
    | {
      kind: 'resolve_military_choice';
      playerId: PlayerID;
      choice: string;
      cardId?: CardID;
    };
  resumePriorityPlayer?: PlayerID;
}


export interface PendingFortificationsBattleChoice {
  kind: 'fortifications_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  sourceKeysRemaining: string[];
  retreatDirection: -1 | 1;
  options: ['pass', 'use'];
  resume: {
    playerId: PlayerID;
    battleCardTargets?: BattleCardTarget[];
  };
  resumePriorityPlayer?: PlayerID;
}

export interface SequestrationActionState {
  sourcePlayerId: PlayerID;
  playerIds: PlayerID[];
  completedPlayerIds: PlayerID[];
  keptCardIds: Partial<Record<PlayerID, CardID>>;
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSequestrationActionChoice {
  kind: 'sequestration_action';
  playerId: PlayerID;
  sourcePlayerId: PlayerID;
  cardOptions: CardID[];
  options: ['select_card'];
  resumePriorityPlayer?: PlayerID;
}

export interface RevolutionBattleExchangeState {
  battleId: string;
  eligiblePlayerIds: PlayerID[];
  decisions: Partial<Record<PlayerID, 'keep' | 'exchange'>>;
  resumePriorityPlayer?: PlayerID;
}

export interface PendingRevolutionBattleChoice {
  kind: 'revolution_battle';
  playerId: PlayerID;
  battleId: string;
  options: ['keep', 'exchange'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingValorBattleChoice {
  kind: 'valor_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  oldRoll: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}


export type CounterworksOverlaySource =
  | { zone: 'hand' | 'removed' | 'discard' | 'graveyard' | 'asset_bank' }
  | { zone: 'battle_card'; battleId: string; owner: PlayerID; origin: 'hand' | 'battle_draw' | 'replayed' };

export type CounterworksOverlayPlacementKind =
  | 'fog_of_war_action'
  | 'spirit_hollow_action'
  | 'circle_of_bones_action'
  | 'demilitarized_zone'
  | 'blockade'
  | 'circle_of_bones_battle'
  | 'spirit_hollow_battle'
  | 'scorched_earth_battle'
  | 'scorched_earth_asset'
  | 'protracted_siege_battle'
  | 'protracted_siege_asset'
  | 'military_encampment_action'
  | 'military_encampment_battle'
  | 'bombardment_action'
  | 'bombardment_battle';

export interface CounterworksOverlayPlacementRequest {
  id?: string;
  kind: CounterworksOverlayPlacementKind;
  playerId: PlayerID;
  cardId: CardID;
  spaceId: SpaceID;
  source: CounterworksOverlaySource;
  opponentId?: PlayerID;
  battleId?: string;
  captureOccupierId?: PlayerID;
  resumeBattleReveal?: {
    playerId: PlayerID;
    battleCardTargets?: BattleCardTarget[];
  };
}

export interface CounterworksOverlayOption {
  targetKey: string;
  spaceId: SpaceID;
  index: number;
  cardId: CardID;
  owner: PlayerID;
}

export interface PendingCounterworksAssetChoice {
  kind: 'counterworks_asset';
  playerId: PlayerID;
  requestId: string;
  overlayCardId: CardID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingCounterworksBattleChoice {
  kind: 'counterworks_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  overlayOptions: CounterworksOverlayOption[];
  options: ['deactivate_overlay', 'prevent_overlay'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingProtractedSiegeCaptureChoice {
  kind: 'protracted_siege_capture';
  playerId: PlayerID;
  capturingPlayerId: PlayerID;
  spaceId: SpaceID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface ResistanceBattleCleanupEntry {
  id: string;
  battleId: string;
  playerId: PlayerID;
  normalDestination: 'discard' | 'graveyard';
}

export interface PendingResistanceBattleChoice {
  kind: 'resistance_battle';
  playerId: PlayerID;
  entryId: string;
  battleId: string;
  cardOptions: CardID[];
  options: ['pass', 'select_card'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingNeutralChoice =
  | PendingDecoysAssetChoice
  | PendingArmisticeAssetChoice
  | PendingRedemptionAssetChoice
  | PendingRedemptionBattleChoice
  | PendingFootholdAssetChoice
  | PendingPalisadeWallAssetChoice
  | PendingReinforcementsBattleChoice
  | PendingInvasionBattleChoice
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
  | PendingSeditionActionChoice
  | PendingSeditionBattleChoice
  | PendingStandGroundMovementChoice
  | PendingStrategicWithdrawalBattleChoice
  | PendingTacticalPlanningActionChoice
  | PendingConscriptionActionChoice
  | PendingArcaneKnowledgeBattleChoice
  | PendingContrabandBattleChoice
  | PendingCounterworksAssetChoice
  | PendingCounterworksBattleChoice
  | PendingCourtMartialAssetChoice
  | PendingCourtMartialRetreatChoice
  | PendingFortificationsBattleChoice
  | PendingSequestrationActionChoice
  | PendingRevolutionBattleChoice
  | PendingValorBattleChoice
  | PendingScorchedEarthAssetChoice
  | PendingProtractedSiegeCaptureChoice
  | PendingResistanceBattleChoice
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
