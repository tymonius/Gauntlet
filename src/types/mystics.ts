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

export type PendingMysticsChoice = PendingGuardiansOfTheCircleChoice | PendingInvocationChoice;
