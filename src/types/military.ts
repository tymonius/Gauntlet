import type { CardID, PlayerID, SpaceID } from './ids';

export interface TerritoryOverlayState {
  cardId: CardID;
  owner: PlayerID;
  faceUp: boolean;
}

export interface MilitaryCardState {
  storedCards: Partial<Record<CardID, CardID>>;
  freeOrderAbilityIds: string[];
  pursuitBattleCount: number;
  victoryRestrictions?: {
    noMovement?: boolean;
    noCapture?: boolean;
    noOrders?: boolean;
  };
}

export type PendingMilitaryChoice =
  | { kind: 'battlefield_promotion'; playerId: PlayerID; sourceCardId: CardID; options: CardID[] }
  | { kind: 'countercharge'; playerId: PlayerID; sourceCardId: CardID; options: Array<'use' | 'pass'> }
  | { kind: 'war_crimes'; playerId: PlayerID; sourceCardId: CardID; defeatedPlayer: PlayerID; affectedCards: CardID[]; options: Array<'use' | 'pass'> }
  | { kind: 'shock_and_awe'; playerId: PlayerID; sourceCardId: CardID; location: SpaceID; defeatedPlayer: PlayerID; options: Array<'breakthrough' | 'consolidate'> };

export type PendingMilitaryTimingChoice =
  | { kind: 'brothers_in_arms_precommit'; playerId: PlayerID; sourceCardId: 'military-brothers-in-arms'; options: Array<'use' | 'pass'> }
  | { kind: 'military_asset_precommit'; playerId: PlayerID; sourceCardId: 'military-hold-the-line' | 'military-shock-and-awe'; options: Array<'use' | 'pass'> }
  | { kind: 'brothers_in_arms_selection'; playerId: PlayerID; sourceCardId: 'military-brothers-in-arms'; handOptions: CardID[]; battleHandOptions: CardID[]; mayChooseNeither: true }
  | { kind: 'reserve_force_after_reveal'; playerId: PlayerID; sourceCardId: 'military-reserve-force'; storedCard?: CardID; handOptions: CardID[]; options: Array<'deploy_stored' | 'replace_from_hand' | 'pass'> }
  | { kind: 'hold_the_line_after_reveal'; playerId: PlayerID; sourceCardId: 'military-hold-the-line'; drawnCards: CardID[]; options: CardID[]; mayPass: true }
  | { kind: 'shock_and_awe_after_reveal'; playerId: PlayerID; sourceCardId: 'military-shock-and-awe'; handOptions: CardID[]; mayPass: true };

export interface QueuedMilitaryChoice {
  choice: PendingMilitaryChoice;
}
