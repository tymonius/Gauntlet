import type { BoardState, PublicBoardView } from './board';
import type { BattleState, CounterworksInactiveOverlay, CounterworksOverlayPrevention, PublicBattleView } from './battle';
import type { PendingDiplomatChoice } from './diplomats';
import type { PendingFinancierChoice } from './financiers';
import type { InquisitionAccusationQueueEntry, InquisitionActOfFaithBattleQueueEntry, InquisitionBurningAtTheStakeBattleQueueEntry, InquisitionConfessionConstraint, InquisitionDivineMercyBattleQueueEntry, InquisitionExcommunicationBattleQueueEntry, InquisitionGuiltByAssociationBattleQueueEntry, InquisitionPenanceBattleQueueEntry, PendingInquisitionChoice } from './inquisition';
import type { PendingIntelligenceChoice } from './intelligence';
import type { CardID, GameID, PlayerID, SpaceID } from './ids';
import type { LegalLeaderAbilityOption } from './leader';
import type { PendingMilitaryChoice, PendingMilitaryTimingChoice } from './military';
import type { PendingAccursedWagerAftermath, PendingMysticsChoice } from './mystics';
import type { ArmisticeAssetQueueEntry, CounterworksOverlayPlacementRequest, CourtMartialCleanupRequest, DecoysAssetQueueEntry, FootholdAssetQueueEntry, PendingNeutralChoice, RedemptionBattleReturns, RedemptionDiscardQueueEntry, RequisitionBattleQueueEntry, ResistanceBattleCleanupEntry, RousingSpeechAssetQueueEntry, NeutralSabotageAssetSuppression, ReservesBattleTopdecks, RevolutionBattleExchangeState, SequestrationActionState, SalvageBattleQueueEntry, ScorchedEarthAssetQueueEntry, SeditionBattleQueueEntry, SuppliesAssetQueueEntry, SuppliesBattleQueueEntry } from './neutral';
import type { PlayerState, PrivatePlayerView, PublicPlayerView } from './player';
import type { GamePhase } from './phase';

export type { GamePhase } from './phase';

export interface GameEvent { id: string; turn: number; actor?: PlayerID; type: string; message: string; payload?: unknown; visibility: 'public' | 'private' | 'system'; visibleTo?: PlayerID[]; }
export interface PendingAssetBankDiscard { playerId: PlayerID; limit: number; discardCount: number; options: CardID[]; }
export interface RecentBattleResult { counterworksInactiveOverlays?: CounterworksInactiveOverlay[]; counterworksOverlayPreventions?: CounterworksOverlayPrevention[]; battleId: string; turn: number; winner: PlayerID; loser: PlayerID; attacker: PlayerID; defender: PlayerID; location: SpaceID; attackerOrigin: SpaceID; retreatDirection: -1 | 1; battleHandCards?: Partial<Record<PlayerID, CardID[]>>; handCommittedCards?: Partial<Record<PlayerID, CardID[]>>; ordersUsed?: Partial<Record<PlayerID, string[]>>; bankedAssetUseProhibitedFor?: PlayerID[]; seditionInactiveAssets?: Partial<Record<PlayerID, CardID[]>>; lossRetreatEffectsSuppressedFor?: PlayerID[]; additionalRetreatPositions?: Partial<Record<PlayerID, number>>; }
export interface PendingLeaderAbilityWindow { playerId: PlayerID; timing: 'after_battle'; battleId: string; }
export interface InquisitionRelentlessPursuitRequest { playerId: PlayerID; loserId: PlayerID; direction: -1 | 1; }
export interface InquisitionRelentlessPursuitResume { playerId: PlayerID; turn: number; }
export interface NeutralPathfindersSuppression { playerId: PlayerID; spaceId: SpaceID; turn: number; }
export interface NeutralEntrenchmentActionLock { playerId: PlayerID; sourcePlayerId: PlayerID; turn: number; }
export interface NeutralReinforcementsActionOpportunity { playerId: PlayerID; turn: number; }
export interface NeutralInsurrectionActionOpportunity { playerId: PlayerID; turn: number; }
export interface NeutralLiberationActionOpportunity { playerId: PlayerID; turn: number; remaining: number; }
export interface NeutralProtractedSiegeCaptureResolution { capturingPlayerId: PlayerID; spaceId: SpaceID; sourceOwner: PlayerID; requestId: string; overlayCountBefore: number; }
export interface NeutralAssimilationCondition { playerId: PlayerID; turn: number; sourceCardId: CardID; consumedBattleId?: string; }
export interface NeutralAssimilationBattleResolution { battleId: string; attackerId: PlayerID; spaceId: SpaceID; actionEffect: boolean; battleEffect: boolean; }

export interface GameState {
  id: GameID; version: string; phase: GamePhase; turn: number; activePlayer: PlayerID; priorityPlayer?: PlayerID;
  players: Record<PlayerID, PlayerState>; board: BoardState; battle?: BattleState; recentBattleResult?: RecentBattleResult;
  pendingMilitaryChoice?: PendingMilitaryChoice; militaryChoiceQueue?: PendingMilitaryChoice[];
  pendingMilitaryTimingChoice?: PendingMilitaryTimingChoice; militaryTimingChoiceQueue?: PendingMilitaryTimingChoice[];
  pendingDiplomatChoice?: PendingDiplomatChoice; pendingFinancierChoice?: PendingFinancierChoice; financierChoiceQueue?: PendingFinancierChoice[];
  pendingIntelligenceChoice?: PendingIntelligenceChoice & { battleId?: string };
  pendingMysticsChoice?: PendingMysticsChoice; pendingMysticsAftermath?: PendingAccursedWagerAftermath;
  pendingInquisitionChoice?: PendingInquisitionChoice;
  pendingNeutralChoice?: PendingNeutralChoice;
  inquisitionConfessionConstraint?: InquisitionConfessionConstraint;
  inquisitionAccusationQueue?: InquisitionAccusationQueueEntry[];
  inquisitionPenanceQueue?: InquisitionPenanceBattleQueueEntry[];
  inquisitionDivineMercyQueue?: InquisitionDivineMercyBattleQueueEntry[];
  inquisitionExcommunicationQueue?: InquisitionExcommunicationBattleQueueEntry[];
  inquisitionGuiltByAssociationQueue?: InquisitionGuiltByAssociationBattleQueueEntry[];
  inquisitionActOfFaithQueue?: InquisitionActOfFaithBattleQueueEntry[];
  inquisitionBurningAtTheStakeQueue?: InquisitionBurningAtTheStakeBattleQueueEntry[];
  inquisitionRelentlessPursuitRequest?: InquisitionRelentlessPursuitRequest;
  inquisitionRelentlessPursuitResume?: InquisitionRelentlessPursuitResume;
  neutralPathfindersSuppressions?: NeutralPathfindersSuppression[];
  neutralEntrenchmentActionLocks?: NeutralEntrenchmentActionLock[];
  neutralReinforcementsActionOpportunity?: NeutralReinforcementsActionOpportunity;
  neutralInsurrectionActionOpportunity?: NeutralInsurrectionActionOpportunity;
  neutralLiberationActionOpportunity?: NeutralLiberationActionOpportunity;
  neutralProtractedSiegeCaptureResolution?: NeutralProtractedSiegeCaptureResolution;
  neutralAssimilationConditions?: NeutralAssimilationCondition[];
  neutralAssimilationBattleResolution?: NeutralAssimilationBattleResolution;
  neutralArmisticeAssetQueue?: ArmisticeAssetQueueEntry[];
  neutralCounterworksOverlayQueue?: CounterworksOverlayPlacementRequest[];
  neutralCourtMartialQueue?: CourtMartialCleanupRequest[];
  neutralDecoysAssetQueue?: DecoysAssetQueueEntry[];
  neutralFootholdAssetQueue?: FootholdAssetQueueEntry[];
  neutralRedemptionDiscardQueue?: RedemptionDiscardQueueEntry[];
  neutralRequisitionBattleQueue?: RequisitionBattleQueueEntry[];
  neutralResistanceCleanupQueue?: ResistanceBattleCleanupEntry[];
  neutralRousingSpeechAssetQueue?: RousingSpeechAssetQueueEntry[];
  neutralRevolutionBattleExchange?: RevolutionBattleExchangeState;
  neutralSequestrationAction?: SequestrationActionState;
  neutralSabotageAssetSuppressions?: NeutralSabotageAssetSuppression[];
  neutralSalvageBattleQueue?: SalvageBattleQueueEntry[];
  neutralScorchedEarthAssetQueue?: ScorchedEarthAssetQueueEntry[];
  neutralSeditionBattleQueue?: SeditionBattleQueueEntry[];
  neutralRedemptionBattleReturns?: RedemptionBattleReturns;
  neutralReservesBattleTopdecks?: ReservesBattleTopdecks;
  neutralSuppliesAssetQueue?: SuppliesAssetQueueEntry[];
  neutralSuppliesBattleQueue?: SuppliesBattleQueueEntry[];
  pendingLeaderAbilityWindow?: PendingLeaderAbilityWindow; pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[]; winner?: PlayerID;
}

export interface LegalNeutralAssetUseOption { action: 'use_neutral_reinforcements_asset'; cardId: CardID; }
export interface LegalActionPlayOption { action: 'play_action_card'; cardId: CardID; origin: 'hand'; destination: 'discard' | 'graveyard' | 'hand' | 'removed' | 'asset_bank'; requiresTarget: boolean; }
export interface PublicGameView {
  id: GameID; version: string; phase: GamePhase; turn: number; activePlayer: PlayerID; priorityPlayer?: PlayerID;
  players: Record<PlayerID, PublicPlayerView>; board: PublicBoardView; battle?: PublicBattleView;
  legalActionPlays?: LegalActionPlayOption[]; legalNeutralAssetUses?: LegalNeutralAssetUseOption[]; legalLeaderAbilities?: LegalLeaderAbilityOption[];
  neutralPathfindersSuppressions?: NeutralPathfindersSuppression[];
  neutralEntrenchmentActionLocks?: NeutralEntrenchmentActionLock[];
  neutralReinforcementsActionOpportunity?: NeutralReinforcementsActionOpportunity;
  neutralInsurrectionActionOpportunity?: NeutralInsurrectionActionOpportunity;
  neutralLiberationActionOpportunity?: NeutralLiberationActionOpportunity;
  neutralProtractedSiegeCaptureResolution?: NeutralProtractedSiegeCaptureResolution;
  neutralAssimilationConditions?: NeutralAssimilationCondition[];
  pendingNeutralChoice?: PendingNeutralChoice;
  pendingMilitaryChoice?: PendingMilitaryChoice; pendingMilitaryTimingChoice?: PendingMilitaryTimingChoice; pendingDiplomatChoice?: PendingDiplomatChoice; pendingFinancierChoice?: PendingFinancierChoice;
  pendingLeaderAbilityWindow?: PendingLeaderAbilityWindow; pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[]; winner?: PlayerID;
}
export interface PrivateGameView extends Omit<PublicGameView, 'players' | 'pendingNeutralChoice'> {
  viewer: PlayerID;
  players: Record<PlayerID, PublicPlayerView | PrivatePlayerView>;
  pendingNeutralChoice?: PendingNeutralChoice;
  pendingIntelligenceChoice?: PendingIntelligenceChoice;
  pendingMysticsChoice?: PendingMysticsChoice;
  pendingInquisitionChoice?: PendingInquisitionChoice;
}
