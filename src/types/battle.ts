import type { CardID, PlayerID, SpaceID } from './ids';

export type BattleStage =
  | 'enter'
  | 'hand_commit'
  | 'battle_draw'
  | 'battle_play_selection'
  | 'special_reveal'
  | 'normal_reveal'
  | 'effects'
  | 'dice'
  | 'resolution'
  | 'cleanup';

export type CardOrigin = 'hand' | 'battle_draw' | 'replayed';

export interface BattlePlayedCard {
  cardId: CardID;
  owner: PlayerID;
  origin: CardOrigin;
  faceDown: boolean;
  canceled: boolean;
}

export interface BattleParticipantState {
  playerId: PlayerID;
  handCommit?: BattlePlayedCard;
  battleDraw: CardID[];
  battleDrawPlayed: BattlePlayedCard[];
  diceRoll?: number;
  rerollsRemaining: number;
  modifiers: number;
  retreated: boolean;
}

export interface BattleState {
  id: string;
  stage: BattleStage;
  location: SpaceID;
  attacker: BattleParticipantState;
  defender: BattleParticipantState;
  winner?: PlayerID;
  loser?: PlayerID;
  effectsResolved: string[];
}

export interface PublicBattleParticipantView {
  playerId: PlayerID;
  handCommit?: BattlePlayedCard | { faceDown: true };
  battleDrawCount: number;
  battleDrawPlayed: Array<BattlePlayedCard | { faceDown: true }>;
  diceRoll?: number;
  modifiers: number;
  retreated: boolean;
}

export interface PublicBattleView {
  id: string;
  stage: BattleStage;
  location: SpaceID;
  attacker: PublicBattleParticipantView;
  defender: PublicBattleParticipantView;
  winner?: PlayerID;
  loser?: PlayerID;
}
