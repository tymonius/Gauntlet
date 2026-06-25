import type { CardID, PlayerID, SpaceID } from '../types';

export type GameAction =
  | DrawCardAction
  | RevealSpaceAction
  | MovePlayerAction
  | EndTurnAction;

export interface DrawCardAction {
  type: 'draw_card';
  playerId: PlayerID;
  count?: number;
}

export interface RevealSpaceAction {
  type: 'reveal_space';
  playerId: PlayerID;
  spaceId: SpaceID;
}

export interface MovePlayerAction {
  type: 'move_player';
  playerId: PlayerID;
  toSpaceId: SpaceID;
}

export interface EndTurnAction {
  type: 'end_turn';
  playerId: PlayerID;
}

export interface ActionResult {
  drawnCards?: CardID[];
}
