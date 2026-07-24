import type { CardID, PlayerID, SpaceID } from './ids';

export type IntelligenceMissionKind = 'normal' | 'special_operation';
export type IntelligenceBattleSource = 'hand' | 'battle_draw';

export interface TreasonTargetOption {
  targetKey: string;
  cardId: CardID;
  targetOwner: PlayerID;
  targetOrigin: 'hand' | 'battle_draw' | 'replayed';
}

export interface PublicIntelligenceMissionView {
  faceDown?: true;
  kind: IntelligenceMissionKind;
  startedTurn: number;
}

export interface IntelligenceMissionState extends PublicIntelligenceMissionView {
  cardId: CardID;
  requirementSatisfied: boolean;
  evidence: string[];
  startedLogIndex?: number;
}

export interface IgnoredTerritoryEffectsState {
  turn: number;
  effectKeys: string[];
}

export interface SleeperNetworkActivationState {
  mode: 'activate' | 'compromised';
  removalDestination?: 'discard' | 'graveyard' | 'removed';
  opposingActorId?: PlayerID;
  resumePriorityPlayer?: PlayerID;
}

export interface SleeperNetworkState {
  cards: CardID[];
  bankedTurn: number;
  startOfferTurn?: number;
  endOfferTurn?: number;
  activation?: SleeperNetworkActivationState;
}

export interface PublicSleeperNetworkState {
  cardCount: number;
  activating: boolean;
}

export interface IntelligenceState {
  activeMission?: IntelligenceMissionState;
  specialOperation?: IntelligenceMissionState;
  surveillanceUsedBattleId?: string;
  ignoredTerritoryEffects?: IgnoredTerritoryEffectsState;
  sleeperNetwork?: SleeperNetworkState;
}

export interface PublicIntelligenceState {
  activeMission?: PublicIntelligenceMissionView;
  specialOperation?: PublicIntelligenceMissionView;
  sleeperNetwork?: PublicSleeperNetworkState;
}

interface PendingIntelligenceBattleCard {
  battleId: string;
  targetOwner: PlayerID;
  targetCardId: CardID;
  targetSource: IntelligenceBattleSource;
  resumePriorityPlayer?: PlayerID;
}

export type PendingIntelligenceChoice =
  | (PendingIntelligenceBattleCard & {
      kind: 'surveillance';
      playerId: PlayerID;
      options: ['pass', 'surveil'];
    })
  | (PendingIntelligenceBattleCard & {
      kind: 'interference';
      playerId: PlayerID;
      options: ['pass', 'interfere'];
    })
  | {
      kind: 'interference_replacement';
      playerId: PlayerID;
      intelligencePlayerId: PlayerID;
      battleId: string;
      source: IntelligenceBattleSource;
      removedCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'spies_battle_reselect';
      playerId: PlayerID;
      battleId: string;
      currentSelectedCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'fog_of_war_return';
      playerId: PlayerID;
      fogOwnerId: PlayerID;
      battleId: string;
      handCardId: CardID;
      battleHandCardIds: CardID[];
      options: ['return_hand', 'return_battle_hand'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'intercepted_orders_battle_select';
      playerId: PlayerID;
      opponentId: PlayerID;
      battleId: string;
      selectedCardIds: CardID[];
      unselectedCardIds: CardID[];
      options: ['select_selected', 'select_unselected'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'intercepted_orders_battle_replacement';
      playerId: PlayerID;
      intelligencePlayerId: PlayerID;
      battleId: string;
      prohibitedCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'reconnaissance_battle_withdraw';
      playerId: PlayerID;
      battleId: string;
      sourceSlot: 'hand_commit' | 'battle_draw_played';
      sourceIndex?: number;
      canWithdraw: boolean;
      options: ['stay'] | ['stay', 'withdraw'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'exfiltration_battle_withdraw';
      playerId: PlayerID;
      battleId: string;
      destinationId: SpaceID;
      remainingUses: number;
      options: ['pass', 'withdraw'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'operational_reassessment_battle';
      playerId: PlayerID;
      battleId: string;
      sourceSlot: 'hand_commit' | 'battle_draw_played';
      sourceIndex?: number;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'treason_battle_target';
      playerId: PlayerID;
      battleId: string;
      sourceKind: 'battle_card' | 'asset';
      sourceSlot?: 'hand_commit' | 'battle_draw_played';
      sourceIndex?: number;
      targetOptions: TreasonTargetOption[];
      options: ['select'] | ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'treason_reconnaissance_withdraw';
      playerId: PlayerID;
      battleId: string;
      sourceSlot?: 'hand_commit' | 'battle_draw_played';
      sourceIndex?: number;
      canWithdraw: boolean;
      options: ['stay'] | ['stay', 'withdraw'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'sleeper_network_initial_card';
      playerId: PlayerID;
      eligibleCardIds: CardID[];
      options: ['select'];
    }
  | {
      kind: 'sleeper_network_add_card';
      playerId: PlayerID;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
    }
  | {
      kind: 'sleeper_network_capacity';
      playerId: PlayerID;
      discardCount: number;
      cardOptions: CardID[];
      options: ['select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'sleeper_network_activate';
      playerId: PlayerID;
      options: ['pass', 'activate'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'sleeper_network_play_card';
      playerId: PlayerID;
      eligibleCardIds: CardID[];
      options: ['select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'sleeper_network_compromised';
      playerId: PlayerID;
      opposingActorId: PlayerID;
      eligibleCardIds: CardID[];
      removalDestination: 'discard' | 'graveyard' | 'removed';
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'mission_control';
      playerId: PlayerID;
      battleId?: never;
      eligibleCardIds: CardID[];
      options: ['pass', 'select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'fieldcraft';
      playerId: PlayerID;
      battleId?: never;
      spaceId: SpaceID;
      effectId: string;
      options: ['pass', 'ignore'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'spies_discard';
      playerId: PlayerID;
      battleId?: never;
      opponentId: PlayerID;
      inspectedHand: CardID[];
      handOptions: CardID[];
      options: ['select'];
    }
  | {
      kind: 'assassins_discard';
      playerId: PlayerID;
      battleId?: never;
      opponentId: PlayerID;
      opponentHandOptions: CardID[];
      options: ['select'];
    }
  | {
      kind: 'operational_reassessment';
      playerId: PlayerID;
      battleId?: never;
      returnedMissionCardId: CardID;
      eligibleCardIds: CardID[];
      options: ['select'];
    }
  | {
      kind: 'exfiltration';
      playerId: PlayerID;
      battleId?: never;
      after: 'complete' | 'abort';
      options: ['pass', 'use'];
    }
  | {
      kind: 'reconnaissance';
      playerId: PlayerID;
      battleId: string;
      opponentId: PlayerID;
      options: ['pass', 'use'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'reconnaissance_withdraw';
      playerId: PlayerID;
      battleId: string;
      opponentId: PlayerID;
      inspectedHand: CardID[];
      options: ['stay', 'withdraw'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'intercepted_orders';
      playerId: PlayerID;
      battleId: string;
      targetOwner: PlayerID;
      battleHand: CardID[];
      options: ['pass', 'use'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'intercepted_orders_select';
      playerId: PlayerID;
      battleId: string;
      targetOwner: PlayerID;
      battleHandOptions: CardID[];
      options: ['select'];
      resumePriorityPlayer?: PlayerID;
    }
  | {
      kind: 'deep_cover';
      playerId: PlayerID;
      battleId?: never;
      missionCardId: CardID;
      reason: string;
      options: ['pass', 'use'];
    };
