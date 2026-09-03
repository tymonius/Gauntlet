import type { BattleCardTarget, BattleState } from '../types/battle';
import type { GameState } from '../types/game';
import type { CardID, PlayerID, SpaceID } from '../types/ids';

export type { BattleCardTarget } from '../types/battle';

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
  battleCardTargets?: BattleCardTarget[];
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
  destination?: 'discard' | 'graveyard' | 'hand' | 'removed';
  immediate?: boolean;
}

export interface DestinationOverride {
  cardId: CardID;
  owner: PlayerID;
  destination: 'discard' | 'graveyard' | 'hand' | 'removed';
  reason: string;
  /** Target one physical cleanup slot instead of every matching card ID. */
  target?: { zone: 'battle_draw_played' | 'battle_draw'; index: number };
  /** Resolve before card-specific cleanup replacements such as return-to-hand effects. */
  force?: boolean;
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
