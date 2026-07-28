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
export type BattleTiePolicy = 'reroll' | 'defender';

export interface BattlePlayedCard {
  cardId: CardID;
  owner: PlayerID;
  origin: CardOrigin;
  faceDown: boolean;
  canceled: boolean;
  negated?: boolean;
  earlyEffectResolved?: boolean;
  postRevealEffectResolved?: boolean;
  visibleTo?: PlayerID[];
  /** A card-specific replacement for this physical card's battle-cleanup destination. */
  cleanupDestination?: 'discard' | 'graveyard' | 'hand' | 'removed';
  /** A repeated effect with no additional physical card or cleanup destination. */
  virtual?: boolean;
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
  advantage?: number;
  disadvantage?: number;
  diceRolls?: number[];
  diceRoll?: number;
  rerollsRemaining: number;
  modifiers: number;
  retreated: boolean;
}

export interface BattleCardTargetOption {
  sourceCardId: CardID;
  sourceOwner: PlayerID;
  sourceOrigin: CardOrigin;
  targetCardId: CardID;
  targetOwner: PlayerID;
  targetOrigin: CardOrigin;
}

export interface BattlePlayOption {
  action: 'commit_battle_hand_card' | 'play_battle_draw_card' | 'pass_battle_hand_commit' | 'pass_battle_draw_play';
  cardId?: CardID;
  origin?: 'hand' | 'battle_draw';
}

export interface ResolvedBattleModifier {
  playerId: PlayerID;
  source: string;
  amount: number;
  reason: string;
}

export interface ResolvedBattleCancellation {
  cardId: CardID;
  owner: PlayerID;
  source: string;
  reason: string;
}

export interface BattleState {
  id: string;
  stage: BattleStage;
  location: SpaceID;
  attackerOrigin: SpaceID;
  attacker: BattleParticipantState;
  defender: BattleParticipantState;
  tiePolicy: BattleTiePolicy;
  lastStand?: boolean;
  attackerHandCommitVisibleTo?: PlayerID[];
  /** Players who may only pass during the hand-commit step. */
  handCommitProhibitedFor?: PlayerID[];
  blockedBattleDrawCards?: Partial<Record<PlayerID, CardID[]>>;
  observedBeforeNormalReveal?: Partial<Record<PlayerID, CardID[]>>;
  bankedAssetUseProhibited?: PlayerID[];
  /** Physical face-up Asset copies made inactive by Sedition for this battle. */
  seditionInactiveAssets?: Partial<Record<PlayerID, CardID[]>>;
  /** Deferred +1 fallbacks applied after the remaining reveal effects resolve. */
  seditionBonusByPlayer?: Partial<Record<PlayerID, number>>;
  fogOfWarOverlayOwner?: PlayerID;
  noMartyrsAssetInitialCounts?: Partial<Record<PlayerID, number>>;
  noMartyrsAssetProcessedCounts?: Partial<Record<PlayerID, number>>;
  noMartyrsAssetActivatedCounts?: Partial<Record<PlayerID, number>>;
  lossRetreatEffectsSuppressedFor?: PlayerID[];
  additionalRetreatPositions?: Partial<Record<PlayerID, number>>;
  standGroundNoMartyrsInitialCounts?: Partial<Record<PlayerID, number>>;
  standGroundNoMartyrsProcessedCounts?: Partial<Record<PlayerID, number>>;
  winner?: PlayerID;
  loser?: PlayerID;
  effectsResolved: string[];
  resolvedModifiers?: ResolvedBattleModifier[];
  resolvedCancellations?: ResolvedBattleCancellation[];
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
  advantage: number;
  disadvantage: number;
  diceRolls?: number[];
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
  tiePolicy: BattleTiePolicy;
  lastStand?: boolean;
  handCommitProhibitedFor?: PlayerID[];
  seditionInactiveAssets?: Partial<Record<PlayerID, CardID[]>>;
  fogOfWarOverlayOwner?: PlayerID;
  noMartyrsAssetInitialCounts?: Partial<Record<PlayerID, number>>;
  noMartyrsAssetProcessedCounts?: Partial<Record<PlayerID, number>>;
  noMartyrsAssetActivatedCounts?: Partial<Record<PlayerID, number>>;
  lossRetreatEffectsSuppressedFor?: PlayerID[];
  additionalRetreatPositions?: Partial<Record<PlayerID, number>>;
  validBattleCardTargets?: BattleCardTargetOption[];
  legalBattlePlays?: BattlePlayOption[];
  winner?: PlayerID;
  loser?: PlayerID;
}
