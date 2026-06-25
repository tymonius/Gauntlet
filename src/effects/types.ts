import type { BattleState, CardID, GameState, PlayerID, SpaceID } from '../types';

export type EffectTiming =
  | 'battle_started'
  | 'battle_cards_revealed'
  | 'before_battle_roll'
  | 'after_battle_roll'
  | 'before_battle_resolution'
  | 'after_battle_resolution'
  | 'card_destination';

export interface EffectContext {
  game: GameState;
  timing: EffectTiming;
  actor?: PlayerID;
  sourceCardId?: CardID;
  battle?: BattleState;
  location?: SpaceID;
}

export interface BattleModifier {
  playerId: PlayerID;
  source: CardID | SpaceID | string;
  amount: number;
  reason: string;
}

export interface CardCancellation {
  cardId: CardID;
  owner: PlayerID;
  source: CardID | SpaceID | string;
  reason: string;
}

export interface DestinationOverride {
  cardId: CardID;
  owner: PlayerID;
  destination: 'discard' | 'graveyard' | 'hand' | 'removed';
  reason: string;
}

export interface EffectResult {
  cancellations?: CardCancellation[];
  modifiers?: BattleModifier[];
  destinationOverrides?: DestinationOverride[];
  logMessages?: string[];
}

export interface EffectHandler {
  id: string;
  timing: EffectTiming[];
  applies(context: EffectContext): boolean;
  resolve(context: EffectContext): EffectResult;
}
