import type { CardID } from './ids';

export type ZoneName =
  | 'deck'
  | 'hand'
  | 'discard'
  | 'graveyard'
  | 'asset_bank'
  | 'overlays'
  | 'battle_hand_commit'
  | 'battle_draw'
  | 'battle_play'
  | 'removed';

export interface HiddenZone {
  kind: 'hidden';
  count: number;
}

export interface VisibleZone {
  kind: 'visible';
  cards: CardID[];
}

export type PublicZoneView = HiddenZone | VisibleZone;

export interface PrivateZones {
  deck: CardID[];
  hand: CardID[];
  discard: CardID[];
  graveyard: CardID[];
  assetBank: CardID[];
  removed: CardID[];
}
