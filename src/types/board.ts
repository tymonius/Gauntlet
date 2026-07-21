import type { PlayerID, SpaceID, TerritoryID } from './ids';

export type SpaceKind = 'heartland' | 'endpoint' | 'territory' | 'arena';
export type EndpointRole = 'before_gauntlet' | 'beyond_gauntlet';

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
}

export interface BoardState {
  layout: 'standard_1x6' | 'dual_lane_2x6' | 'cross_small' | 'cross_large';
  spaces: BoardSpaceState[];
}

export interface PublicBoardSpaceView extends BoardSpaceState {
  territoryId?: TerritoryID;
}

export interface PublicBoardView {
  layout: BoardState['layout'];
  spaces: PublicBoardSpaceView[];
}
