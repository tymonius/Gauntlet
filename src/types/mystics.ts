import type { CardID, SpaceID } from './ids';

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
  invocationUsedTurn?: number;
  transmutationUsedBattleId?: string;
  materiaPrimaUsedTurn?: number;
  guardiansOfTheCircleUsedTurn?: number;
}

export interface PublicMysticsState {
  completedRites: MysticRiteId[];
  begunRite?: PublicBegunMysticRiteState;
  invocationUnlocked: boolean;
  transmutationUnlocked: boolean;
}
