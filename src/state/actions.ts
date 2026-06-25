import type { CardID, PlayerID, SpaceID } from '../types';

export type GameAction =
  | DrawCardAction
  | RevealSpaceAction
  | MovePlayerAction
  | CommitBattleHandCardAction
  | PassBattleHandCommitAction
  | DrawBattleCardsAction
  | PlayBattleDrawCardAction
  | RollBattleDieAction
  | ResolveBattleAction
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

export interface CommitBattleHandCardAction {
  type: 'commit_battle_hand_card';
  playerId: PlayerID;
  cardId: CardID;
}

export interface PassBattleHandCommitAction {
  type: 'pass_battle_hand_commit';
  playerId: PlayerID;
}

export interface DrawBattleCardsAction {
  type: 'draw_battle_cards';
  playerId: PlayerID;
  count?: number;
}

export interface PlayBattleDrawCardAction {
  type: 'play_battle_draw_card';
  playerId: PlayerID;
  cardId: CardID;
}

export interface RollBattleDieAction {
  type: 'roll_battle_die';
  playerId: PlayerID;
  value?: number;
}

export interface ResolveBattleAction {
  type: 'resolve_battle';
  playerId: PlayerID;
}

export interface EndTurnAction {
  type: 'end_turn';
  playerId: PlayerID;
}

export interface ActionResult {
  drawnCards?: CardID[];
  battleDrawnCards?: CardID[];
}
