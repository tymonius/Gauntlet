import type { CardID, PlayerID, SpaceID } from './ids';

export type MysticRiteId = 'rite_of_echoes' | 'rite_of_blood' | 'rite_of_crossing';

export interface RiteOfEchoesState {
  kind: 'rite_of_echoes';
  startedTurn: number;
  faceUpBoundCardId: CardID;
  faceDownBoundCardId: CardID;
}

export interface RiteOfBloodState {
  kind: 'rite_of_blood';
  startedTurn: number;
}

export interface RiteOfCrossingState {
  kind: 'rite_of_crossing';
  startedTurn: number;
  requiredSpaceId: SpaceID;
}

export type BegunMysticRiteState = RiteOfEchoesState | RiteOfBloodState | RiteOfCrossingState;

export type PublicBegunMysticRiteState =
  | Omit<RiteOfEchoesState, 'faceDownBoundCardId'> & { faceDownBoundCardCount: 1 }
  | RiteOfBloodState
  | RiteOfCrossingState;

export interface GraveWardEntryState {
  id: string;
  cardId: CardID;
  triggersRemaining: number;
  battleId?: string;
}

export interface GraveWardBattleEffectState {
  battleId: string;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
  handCommittedCardIds: CardID[];
}

export interface SoulForSoulBattleEffectState {
  battleId: string;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
  handCommittedCardIds: CardID[];
}

export interface PathsOfShadowBattleEffectState {
  battleId: string;
  normalRetreatSpaceId?: SpaceID;
  spaceOptions: SpaceID[];
}

export interface SpiritHollowChoiceState {
  battleId: string;
  spaceId: SpaceID;
  playerId: PlayerID;
}

export interface NecromancyBattleEffectState {
  battleId: string;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
}

export interface BlackCovenantBindingState {
  id: string;
  cardId: CardID;
  boundTurn: number;
}

export interface BlackCovenantBattleReleaseState {
  battleId: string;
  boundCardId: CardID;
  covenantFromAsset: boolean;
}

export interface MysticsState {
  completedRites: MysticRiteId[];
  begunRite?: BegunMysticRiteState;
  riteCompletedTurn?: number;
  invocationUsedTurn?: number;
  invocationDeferredSourceCardIds?: CardID[];
  transmutationUsedTurn?: number;
  materiaPrimaUsedTurn?: number;
  materiaPrimaDeferredBattleId?: string;
  guardiansOfTheCircleUsedTurn?: number;
  accursedWagerArmedTurn?: number;
  accursedWagerArmedCount?: number;
  accursedWagerBattleId?: string;
  accursedWagerBattleCount?: number;
  fatesTollMovementTurn?: number;
  fatesTollMovementRemaining?: number;
  graveWardEntrySequence?: number;
  graveWardEntries?: GraveWardEntryState[];
  graveWardBattleQueue?: GraveWardBattleEffectState[];
  soulForSoulBattleQueue?: SoulForSoulBattleEffectState[];
  pathsOfShadowBattleQueue?: PathsOfShadowBattleEffectState[];
  spiritHollowChoiceQueue?: SpiritHollowChoiceState[];
  necromancyBattleQueue?: NecromancyBattleEffectState[];
  blackCovenantBindingSequence?: number;
  blackCovenantBindings?: BlackCovenantBindingState[];
  blackCovenantBattleReleases?: BlackCovenantBattleReleaseState[];
  witchcraftAssetUseTurn?: number;
  witchcraftAssetUsesThisTurn?: number;
}

export interface PublicMysticsState {
  completedRites: MysticRiteId[];
  begunRite?: PublicBegunMysticRiteState;
  invocationUnlocked: boolean;
  transmutationUnlocked: boolean;
}

export interface PendingGuardiansOfTheCircleChoice {
  kind: 'guardians_of_the_circle';
  playerId: PlayerID;
  battleId: string;
  riteId: Exclude<MysticRiteId, 'rite_of_crossing'>;
  arcaneCardOptions: CardID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingInvocationChoice {
  kind: 'invocation';
  playerId: PlayerID;
  sourceCardIds: CardID[];
  graveyardOptions: CardID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingDarkOmensActionChoice {
  kind: 'dark_omens_action';
  playerId: PlayerID;
  drawnCardIds: CardID[];
  sourceCardId: CardID;
  restoreSourceToDiscard: boolean;
  options: ['select'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingDarkOmensBattleChoice {
  kind: 'dark_omens_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  drawnCardId: CardID;
  options: ['keep', 'sacrifice'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingAccursedWagerChoice {
  kind: 'accursed_wager_after_battle';
  playerId: PlayerID;
  battleId: string;
  handOptions: CardID[];
  remaining: number;
  options: ['select'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingAccursedWagerAftermath {
  kind: 'accursed_wager';
  battleId: string;
  loserId: PlayerID;
  remaining: number;
}

export interface PendingFatesTollChoice {
  kind: 'fates_toll_reroll';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  oldRoll: number;
  handOptions: CardID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingGraveWardAssetChoice {
  kind: 'grave_ward_asset';
  playerId: PlayerID;
  entryId: string;
  cardId: CardID;
  battleId?: string;
  triggersRemaining: number;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingGraveWardBattleChoice {
  kind: 'grave_ward_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  handOptions: CardID[];
  options: ['select'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSoulForSoulBattleChoice {
  kind: 'soul_for_soul_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  handOptions: CardID[];
  graveyardOptions: CardID[];
  options: ['pass', 'exchange'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingPathsOfShadowChoice {
  kind: 'paths_of_shadow_battle';
  playerId: PlayerID;
  battleId: string;
  normalRetreatSpaceId?: SpaceID;
  spaceOptions: SpaceID[];
  options: ['pass', 'move'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingSpiritHollowChoice {
  kind: 'spirit_hollow_after_cleanup';
  playerId: PlayerID;
  battleId: string;
  spaceId: SpaceID;
  handOptions: CardID[];
  graveyardOptions: CardID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingCircleOfBonesChoice {
  kind: 'circle_of_bones_reroll';
  playerId: PlayerID;
  battleId: string;
  spaceId: SpaceID;
  handOptions: CardID[];
  targetPlayerOptions: PlayerID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingRendTheVeilChoice {
  kind: 'rend_the_veil';
  playerId: PlayerID;
  battleId: string;
  sourceSlot: 'hand_commit' | 'battle_draw_played' | 'asset';
  sourceIndex?: number;
  graveyardOptions: CardID[];
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingBlackCovenantBattleChoice {
  kind: 'black_covenant_battle';
  playerId: PlayerID;
  battleId: string;
  sourceSlot: 'hand_commit' | 'battle_draw_played';
  sourceIndex?: number;
  handOptions: CardID[];
  options: ['pass', 'bind'];
  resumePriorityPlayer?: PlayerID;
}

export interface WitchcraftTargetOption {
  targetKey: string;
  cardId: CardID;
  sourceSlot: 'hand_commit' | 'battle_draw_played';
  sourceIndex?: number;
}

export interface PendingWitchcraftChoice {
  kind: 'witchcraft_repeat';
  playerId: PlayerID;
  battleId: string;
  sourceKind: 'battle_card' | 'asset';
  sourceSlot?: 'hand_commit' | 'battle_draw_played' | 'asset';
  sourceIndex?: number;
  handOptions: CardID[];
  targetOptions: WitchcraftTargetOption[];
  options: Array<'pass' | 'repeat'>;
  resumePriorityPlayer?: PlayerID;
}

export interface PendingNecromancyActionChoice {
  kind: 'necromancy_action';
  playerId: PlayerID;
  sourceCardId: CardID;
  graveyardOptions: CardID[];
  options: ['bury', 'recover'];
  resumePriorityPlayer?: PlayerID;
}

export interface PendingNecromancyBattleChoice {
  kind: 'necromancy_battle';
  playerId: PlayerID;
  battleId: string;
  sourceKey: string;
  sourceOrigin: 'hand' | 'battle_draw';
  graveyardOptions: CardID[];
  options: ['resolve'];
  resumePriorityPlayer?: PlayerID;
}

export type PendingMysticsChoice =
  | PendingGuardiansOfTheCircleChoice
  | PendingInvocationChoice
  | PendingDarkOmensActionChoice
  | PendingDarkOmensBattleChoice
  | PendingAccursedWagerChoice
  | PendingFatesTollChoice
  | PendingGraveWardAssetChoice
  | PendingGraveWardBattleChoice
  | PendingSoulForSoulBattleChoice
  | PendingPathsOfShadowChoice
  | PendingSpiritHollowChoice
  | PendingCircleOfBonesChoice
  | PendingRendTheVeilChoice
  | PendingBlackCovenantBattleChoice
  | PendingWitchcraftChoice
  | PendingNecromancyActionChoice
  | PendingNecromancyBattleChoice;
