import type { CardID, PlayerID, TerritoryID } from './ids';
import type { FactionResourceMap } from './resources';
import type { PrivateZones, PublicZoneView } from './zones';

export interface PlayerState {
  id: PlayerID;
  name: string;
  factionId?: string;
  leaderName?: string;
  resources?: FactionResourceMap;
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
  resources: FactionResourceMap;
  zones: {
    deck: PublicZoneView;
    hand: PublicZoneView;
    discard: PublicZoneView;
    graveyard: PublicZoneView;
    assetBank: PublicZoneView;
    removed: PublicZoneView;
  };
  controlledTerritoryCount: number;
  controlledTerritories: TerritoryID[];
  occupiedSpaceId?: string;
  actionsRemaining: number;
  movementRemaining: number;
}

export interface PrivatePlayerView extends PublicPlayerView {
  private: {
    deck: CardID[];
    hand: CardID[];
  };
}
