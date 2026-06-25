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
  passedHandCommit: boolean;
  passedBattleDrawPlay: boolean;
  hasDrawnBattleCards: boolean;
  handCommit?: BattlePlayedCard;
  battleDraw: CardID[];
  battleDrawPlayed: BattlePlayedCard[];
  battleDrawCount: number;
  battleDrawPlayLimit: number;
  diceRoll?: number;
  rerollsRemaining: number;
  modifiers: number;
  retreated: boolean;
}

export interface BattleState {
  id: string;
  stage: BattleStage;
  location: SpaceID;
  attackerOrigin: SpaceID;
  attacker: BattleParticipantState;
  defender: BattleParticipantState;
  tieWinner: 'attacker' | 'defender';
  winner?: PlayerID;
  loser?: PlayerID;
  effectsResolved: string[];
}

export interface PublicBattleParticipantView {
  playerId: PlayerID;
  passedHandCommit: boolean;
  passedBattleDrawPlay: boolean;
  handCommit?: BattlePlayedCard | { faceDown: true };
  battleDrawCount: number;
  battleDrawPlayed: Array<BattlePlayedCard | { faceDown: true }>;
  battleDrawLimit: number;
  battleDrawPlayLimit: number;
  diceRoll?: number;
  modifiers: number;
  retreated: boolean;
}

export interface PublicBattleView {
  id: string;
  stage: BattleStage;
  location: SpaceID;
  attackerOrigin: SpaceID;
  attacker: PublicBattleParticipantView;
  defender: PublicBattleParticipantView;
  tieWinner: 'attacker' | 'defender';
  winner?: PlayerID;
  loser?: PlayerID;
}
