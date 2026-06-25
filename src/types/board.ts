import type { PlayerID, SpaceID, TerritoryID } from './ids';

export type SpaceKind = 'heartland' | 'territory' | 'arena';

export interface BoardSpaceState {
  id: SpaceID;
  index: number;
  kind: SpaceKind;
  territoryId?: TerritoryID;
  controller?: PlayerID;
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
