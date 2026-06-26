import type { BoardState, PublicBoardView } from './board';
import type { BattleState, PublicBattleView } from './battle';
import type { CardID, GameID, PlayerID } from './ids';
import type { PlayerState, PrivatePlayerView, PublicPlayerView } from './player';

export type GamePhase =
  | 'setup'
  | 'turn_start'
  | 'action_before_movement'
  | 'movement'
  | 'battle'
  | 'action_after_movement'
  | 'cleanup'
  | 'game_over';

export interface GameEvent {
  id: string;
  turn: number;
  actor?: PlayerID;
  type: string;
  message: string;
  payload?: unknown;
  visibility: 'public' | 'private' | 'system';
  visibleTo?: PlayerID[];
}

export interface PendingAssetBankDiscard {
  playerId: PlayerID;
  limit: number;
  discardCount: number;
  options: CardID[];
}

export interface GameState {
  id: GameID;
  version: string;
  phase: GamePhase;
  turn: number;
  activePlayer: PlayerID;
  priorityPlayer?: PlayerID;
  players: Record<PlayerID, PlayerState>;
  board: BoardState;
  battle?: BattleState;
  pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[];
  winner?: PlayerID;
}

export interface LegalActionPlayOption {
  action: 'play_action_card';
  cardId: CardID;
  origin: 'hand';
  destination: 'discard' | 'graveyard' | 'hand' | 'removed' | 'condition' | 'asset_bank';
  requiresTarget: boolean;
}

export interface PublicGameView {
  id: GameID;
  version: string;
  phase: GamePhase;
  turn: number;
  activePlayer: PlayerID;
  priorityPlayer?: PlayerID;
  players: Record<PlayerID, PublicPlayerView>;
  board: PublicBoardView;
  battle?: PublicBattleView;
  legalActionPlays?: LegalActionPlayOption[];
  pendingAssetBankDiscards?: Record<PlayerID, PendingAssetBankDiscard>;
  log: GameEvent[];
  winner?: PlayerID;
}

export interface PrivateGameView extends PublicGameView {
  viewer: PlayerID;
  players: Record<PlayerID, PublicPlayerView | PrivatePlayerView>;
}
