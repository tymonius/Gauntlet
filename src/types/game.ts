import type { BoardState, PublicBoardView } from './board';
import type { BattleState, PublicBattleView } from './battle';
import type { PendingDiplomatChoice } from './diplomats';
import type { PendingFinancierChoice } from './financiers';
import type { InquisitionAccusationQueueEntry, InquisitionActOfFaithBattleQueueEntry, InquisitionBurningAtTheStakeBattleQueueEntry, InquisitionConfessionConstraint, InquisitionDivineMercyBattleQueueEntry, InquisitionExcommunicationBattleQueueEntry, InquisitionGuiltByAssociationBattleQueueEntry, InquisitionPenanceBattleQueueEntry, PendingInquisitionChoice } from './inquisition';
import type { PendingIntelligenceChoice } from './intelligence';
import type { CardID, GameID, PlayerID, SpaceID } from './ids';
import type { LegalLeaderAbilityOption } from './leader';
import type { PendingMilitaryChoice, PendingMilitaryTimingChoice } from './military';
import type { PendingAccursedWagerAftermath, PendingMysticsChoice } from './mystics';
import type { PendingNeutralChoice, RedemptionBattleReturns, RedemptionDiscardQueueEntry } from './neutral';
import type { PlayerState, PrivatePlayerView, PublicPlayerView } from './player';

export type GamePhase = 'setup' | 'turn_start' | 'action_before_movement' | 'movement' | 'battle' | 'action_after_movement' | 'cleanup' | 'game_over';

export interface GameEvent { id: string; turn: number; actor?: PlayerID; type: string; message: string; payload?: unknown; visibility: 'public' | 'private' | 'system'; visibleTo?: PlayerID[]; }
export interface PendingAssetBankDiscard { playerId: PlayerID; limit: number; discardCount: number; options: CardID[]; }
export interface RecentBattleResult { battleId: string; turn: number; winner: PlayerID; loser: PlayerID; attacker: PlayerID; defender: PlayerID; location: SpaceID; attackerOrigin: SpaceID; retreatDirection: -1 | 1; battleHandCards?: Partial<Record<PlayerID, CardID[]>>; handCommittedCards?: Partial<Record<PlayerID, CardID[]>>; ordersUsed?: Partial<Record<PlayerID, string[]>>; lossRetreatEffectsSuppressedFor?: PlayerID[]; additionalRetreatPositions?: Partial<Record<PlayerID, number>>; }
export interface PendingLeaderAbilityWindow { playerId: PlayerID; timing: 'after_battle'; battleId: string; }
export interface InquisitionRelentlessPursuitRequest { playerId: PlayerID; loserId: PlayerID; direction: -1 | 1; }
export interface InquisitionRelentlessPursuitResume { playerId: PlayerID; turn: number; }
export interface NeutralPathfindersSuppression { playerId: PlayerID; spaceId: SpaceID; turn: number; }

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
  neutralRedemptionDiscardQueue?: RedemptionDiscardQueueEntry[];
  neutralRedemptionBattleReturns?: RedemptionBattleReturns;
  pendingLeaderAbilityWindow?: PendingLeaderAbilityWindow; pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[]; winner?: PlayerID;
}

export interface LegalActionPlayOption { action: 'play_action_card'; cardId: CardID; origin: 'hand'; destination: 'discard' | 'graveyard' | 'hand' | 'removed' | 'asset_bank'; requiresTarget: boolean; }
export interface PublicGameView {
  id: GameID; version: string; phase: GamePhase; turn: number; activePlayer: PlayerID; priorityPlayer?: PlayerID;
  players: Record<PlayerID, PublicPlayerView>; board: PublicBoardView; battle?: PublicBattleView;
  legalActionPlays?: LegalActionPlayOption[]; legalLeaderAbilities?: LegalLeaderAbilityOption[];
  neutralPathfindersSuppressions?: NeutralPathfindersSuppression[];
  pendingNeutralChoice?: PendingNeutralChoice;
  pendingMilitaryChoice?: PendingMilitaryChoice; pendingMilitaryTimingChoice?: PendingMilitaryTimingChoice; pendingDiplomatChoice?: PendingDiplomatChoice; pendingFinancierChoice?: PendingFinancierChoice;
  pendingLeaderAbilityWindow?: PendingLeaderAbilityWindow; pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[]; winner?: PlayerID;
}
export interface PrivateGameView extends Omit<PublicGameView, 'players'> {
  viewer: PlayerID;
  players: Record<PlayerID, PublicPlayerView | PrivatePlayerView>;
  pendingIntelligenceChoice?: PendingIntelligenceChoice;
  pendingMysticsChoice?: PendingMysticsChoice;
  pendingInquisitionChoice?: PendingInquisitionChoice;
}
