import type { CardID, PlayerID, SpaceID, TerritoryID } from './ids';
export type SpaceKind = 'heartland' | 'endpoint' | 'territory' | 'arena';
export type EndpointRole = 'before_gauntlet' | 'beyond_gauntlet';

export type TerritoryOverlayKind = 'standard' | 'ruins';

export interface TerritoryOverlayState {
  cardId: CardID;
  owner: PlayerID;
  faceUp: boolean;
  /** Explicit role for overlays whose physical card becomes persistent Ruins. */
  kind?: TerritoryOverlayKind;
  /** Occupier whose pending capture this Overlay tracks, when applicable. */
  captureDelayOccupier?: PlayerID;
  bombardmentSource?: 'action' | 'battle';
  bombardmentBattleId?: string;
  bombardmentOrigin?: 'hand' | 'battle_draw' | 'replayed';
}

export interface BoardSpaceState {
  id: SpaceID;
  index: number;
  kind: SpaceKind;
  territoryId?: TerritoryID;
  controller?: PlayerID;
  endpointOwner?: PlayerID;
  endpointRole?: EndpointRole;
  occupant?: PlayerID;
  revealed: boolean;
  capturePendingBy?: PlayerID;
  overlays?: TerritoryOverlayState[];
}

export interface BoardState {
  layout: 'standard_1x6' | 'dual_lane_2x6' | 'cross_small' | 'cross_large';
  spaces: BoardSpaceState[];
}

export interface PublicBoardSpaceView extends BoardSpaceState { territoryId?: TerritoryID; }
export interface PublicBoardView { layout: BoardState['layout']; spaces: PublicBoardSpaceView[]; }
