import type { CardID, PlayerID, TerritoryID } from './ids';
import type { LeaderAbilityUsageState } from './leader';
import type { MilitaryCardState } from './military';
import type { DiplomatState } from './diplomats';
import type { FinancierState } from './financiers';
import type { IntelligenceState, PublicIntelligenceState } from './intelligence';
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
  zones: PrivateZones;
  controlledTerritories: TerritoryID[];
  occupiedSpaceId?: string;
  actionsRemaining: number;
  movementRemaining: number;
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
  zones: { deck: PublicZoneView; hand: PublicZoneView; discard: PublicZoneView; graveyard: PublicZoneView; assetBank: PublicZoneView; removed: PublicZoneView; };
  controlledTerritoryCount: number;
  controlledTerritories: TerritoryID[];
  occupiedSpaceId?: string;
  actionsRemaining: number;
  movementRemaining: number;
}

export interface PrivatePlayerView extends Omit<PublicPlayerView, 'intelligence'> {
  intelligence?: IntelligenceState;
  private: { deck: CardID[]; hand: CardID[]; };
}
