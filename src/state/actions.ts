import type { CardID, PlayerID, SpaceID } from '../types';
import type { BattleCardTarget } from '../effects';

export type ActionCardTarget =
  | { kind: 'player'; playerId: PlayerID }
  | { kind: 'space'; spaceId: SpaceID }
  | { kind: 'card'; cardId: CardID; owner: PlayerID };

export type GameAction =
  | DrawCardAction
  | RevealSpaceAction
  | PlayActionCardAction
  | ResolveAssetBankDiscardAction
  | MovePlayerAction
  | CommitBattleHandCardAction
  | PassBattleHandCommitAction
  | DrawBattleCardsAction
  | PlayBattleDrawCardAction
  | PassBattleDrawPlayAction
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

export interface PlayActionCardAction {
  type: 'play_action_card';
  playerId: PlayerID;
  cardId: CardID;
  targets?: ActionCardTarget[];
}

export interface ResolveAssetBankDiscardAction {
  type: 'resolve_asset_bank_discard';
  playerId: PlayerID;
  cardIds: CardID[];
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

export interface PassBattleDrawPlayAction {
  type: 'pass_battle_draw_play';
  playerId: PlayerID;
}

export interface RollBattleDieAction {
  type: 'roll_battle_die';
  playerId: PlayerID;
  value?: number;
}

export interface ResolveBattleAction {
  type: 'resolve_battle';
  playerId: PlayerID;
  battleCardTargets?: BattleCardTarget[];
}

export interface EndTurnAction {
  type: 'end_turn';
  playerId: PlayerID;
}

export interface ActionResult {
  drawnCards?: CardID[];
  battleDrawnCards?: CardID[];
}