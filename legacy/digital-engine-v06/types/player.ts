import type { CardID, PlayerID, TerritoryID } from './ids';
import type { LeaderAbilityUsageState } from './leader';
import type { MilitaryCardState } from './military';
import type { DiplomatState } from './diplomats';
import type { FinancierState } from './financiers';
import type { IntelligenceState, PublicIntelligenceState } from './intelligence';
import type { MysticsState, PublicMysticsState } from './mystics';
import type { InquisitionState, PublicInquisitionState } from './inquisition';
import type { FactionResourceMap } from './resources';
import type { PrivateZones, PublicZoneView } from './zones';

export interface PlayerState {
  id: PlayerID;
  name: string;
  factionId?: string;
  leaderName?: string;
  resources?: FactionResourceMap;
  leaderAbilityUsage?: LeaderAbilityUsageState;
  factionTriggerUsage?: Record<string, number>;
  military?: MilitaryCardState;
  diplomats?: DiplomatState;
  financiers?: FinancierState;
  intelligence?: IntelligenceState;
  mystics?: MysticsState;
  inquisition?: InquisitionState;
  zones: PrivateZones;
  /** Physical banked Asset copies currently turned face down. */
  faceDownAssets?: CardID[];
  controlledTerritories: TerritoryID[];
  occupiedSpaceId?: string;
  actionsRemaining: number;
  movementRemaining: number;
  /** Movement positions that may not be spent to initiate a battle. */
  nonBattleMovementRemaining?: number;
  /** Additional positions granted by Advance Guard; ordinary movement is spent first. */
  advanceGuardMovementRemaining?: number;
  /** Additional movement positions from Invasion that may be used only to advance. */
  invasionAdvanceMovementRemaining?: number;
  hasPlayedActionThisTurn: boolean;
  hasPlayedBattleThisTurn: boolean;
}

export interface PublicPlayerView {
  id: PlayerID;
  name: string;
  factionId?: string;
  leaderName?: string;
  resources?: FactionResourceMap;
  leaderAbilityUsage?: LeaderAbilityUsageState;
  military?: MilitaryCardState;
  diplomats?: DiplomatState;
  financiers?: FinancierState;
  intelligence?: PublicIntelligenceState;
  mystics?: PublicMysticsState;
  inquisition?: PublicInquisitionState;
  zones: { deck: PublicZoneView; hand: PublicZoneView; discard: PublicZoneView; graveyard: PublicZoneView; assetBank: PublicZoneView; removed: PublicZoneView; };
  faceDownAssets?: CardID[];
  controlledTerritoryCount: number;
  controlledTerritories: TerritoryID[];
  occupiedSpaceId?: string;
  actionsRemaining: number;
  movementRemaining: number;
  nonBattleMovementRemaining?: number;
  advanceGuardMovementRemaining?: number;
  invasionAdvanceMovementRemaining?: number;
}

export interface PrivatePlayerView extends Omit<PublicPlayerView, 'intelligence' | 'mystics' | 'inquisition'> {
  intelligence?: IntelligenceState;
  mystics?: MysticsState;
  inquisition?: InquisitionState;
  private: { deck: CardID[]; hand: CardID[]; };
}
