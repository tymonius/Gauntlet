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
  | PendingPathsOfShadowChoice;
