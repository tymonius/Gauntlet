export type InquisitionPurgeMode =
  | 'remove_discard_top'
  | 'random_hand_to_graveyard'
  | 'graveyard_to_deck_draw';

export interface InquisitionState {
  /** Turn on which normal after-battle Conviction was last gained. */
  convictionBattleGainTurn?: number;
  purgeUseTurn?: number;
  purgesUsedThisTurn?: number;
}

export type PublicInquisitionState = InquisitionState;
