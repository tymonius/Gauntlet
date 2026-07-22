import type { FactionResourceKey } from './resources';
import type { GamePhase } from './game';

export type LeaderAbilityTiming =
  | 'action_opportunity'
  | 'before_battle_dice'
  | 'after_battle'
  | 'turn_start'
  | 'turn_end';

export type LeaderAbilityUsageLimit = 'none' | 'once_per_turn' | 'once_per_battle';

export interface LeaderAbilityCost {
  resource: FactionResourceKey;
  amount: number;
}

export interface LeaderAbilityUsageState {
  turn: Record<string, number>;
  battle: Record<string, string>;
}

export interface LegalLeaderAbilityOption {
  abilityId: string;
  name: string;
  text: string;
  timing: LeaderAbilityTiming;
  cost?: LeaderAbilityCost;
  usageLimit: LeaderAbilityUsageLimit;
  phase: GamePhase;
}
