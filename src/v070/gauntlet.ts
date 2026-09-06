import {
  V070GameActionError,
  appendV070Event,
  type V070BoardTerritory,
  type V070GameState,
} from './engine';
import {
  nextV070FrontLineTarget,
  refreshV070ControlledTerritories,
} from './front-line';
import { ensureV070DeedForTerritory } from './financiers';
import type { PlayerId } from './rules';

export interface V070TerritoryInsertionInput {
  territoryInstanceId: string;
  territoryId: string;
  contributedBy: PlayerId;
  blank?: boolean;
}

export interface V070TerritoryInsertionResult {
  insertedPosition: number;
  territoryInstanceId: string;
  playerTokenMovementOccurred: false;
  enteredTerritory: false;
}

/**
 * Promote the validated v0.6.3 dynamic-Gauntlet invariant into the v0.7.0
 * board model.
 *
 * Inserting a Territory changes numeric Position labels at and beyond the
 * insertion point, but it does not move any token from the Territory it
 * already occupies. Existing Territory identity references remain stable.
 */
export function insertV070ControlledTerritory(
  state: V070GameState,
  playerId: PlayerId,
  insertionPosition: number,
  input: V070TerritoryInsertionInput,
  source = 'effect',
): V070TerritoryInsertionResult {
  assertContiguousV070Board(state);

  if (!Number.isInteger(insertionPosition)
    || insertionPosition < 0
    || insertionPosition > state.board.length) {
    throw new V070GameActionError(
      'A Territory insertion point must be between existing Gauntlet Positions.',
    );
  }
  if (!input.territoryInstanceId.trim()) {
    throw new V070GameActionError(
      'An inserted Territory requires a stable instance id.',
    );
  }
  if (!input.territoryId.trim()) {
    throw new V070GameActionError(
      'An inserted Territory requires a Territory identity.',
    );
  }
  if (state.board.some(
    territory => territory.territoryInstanceId === input.territoryInstanceId,
  )) {
    throw new V070GameActionError(
      `${input.territoryInstanceId} is already in the Gauntlet.`,
    );
  }

  const positionsBefore = {
    A: state.players.A.position,
    B: state.players.B.position,
  };

  for (const territory of state.board) {
    if (territory.position >= insertionPosition) {
      territory.position += 1;
    }
  }

  const inserted: V070BoardTerritory = {
    territoryInstanceId: input.territoryInstanceId,
    position: insertionPosition,
    territoryId: input.territoryId,
    contributedBy: input.contributedBy,
    controller: playerId,
    occupant: null,
    ...(input.blank ? { blank: true } : {}),
  };
  state.board.push(inserted);
  state.board.sort((a, b) => a.position - b.position);

  for (const current of ['A', 'B'] as const) {
    const position = state.players[current].position;
    if (position !== null && position >= insertionPosition) {
      state.players[current].position = position + 1;
    }
  }

  refreshV070ControlledTerritories(state);
  ensureV070DeedForTerritory(state, input.territoryInstanceId);

  appendV070Event(state, {
    type: 'territory_added_to_gauntlet',
    actor: playerId,
    visibility: 'public',
    payload: {
      territoryInstanceId: input.territoryInstanceId,
      territoryId: input.territoryId,
      position: insertionPosition,
      controller: playerId,
      contributedBy: input.contributedBy,
      blank: Boolean(input.blank),
      source,
      positionsBefore,
      positionsAfter: {
        A: state.players.A.position,
        B: state.players.B.position,
      },
      playerTokenMovementOccurred: false,
      enteredTerritory: false,
    },
  });

  assertContiguousV070Board(state);

  return {
    insertedPosition: insertionPosition,
    territoryInstanceId: input.territoryInstanceId,
    playerTokenMovementOccurred: false,
    enteredTerritory: false,
  };
}

export function insertV070TerritoryAtPlayerEnd(
  state: V070GameState,
  playerId: PlayerId,
  input: V070TerritoryInsertionInput,
  source = 'effect',
): V070TerritoryInsertionResult {
  return insertV070ControlledTerritory(
    state,
    playerId,
    playerId === 'A' ? 0 : state.board.length,
    input,
    source,
  );
}

export function v070FrontLineInsertionPosition(
  state: V070GameState,
  playerId: PlayerId,
): number {
  assertContiguousV070Board(state);
  const target = nextV070FrontLineTarget(state, playerId);
  if (!target) {
    return playerId === 'A' ? state.board.length : 0;
  }
  return playerId === 'A'
    ? target.position
    : target.position + 1;
}

export function insertV070TerritoryAtFrontLine(
  state: V070GameState,
  playerId: PlayerId,
  input: V070TerritoryInsertionInput,
  source = 'effect',
): V070TerritoryInsertionResult {
  return insertV070ControlledTerritory(
    state,
    playerId,
    v070FrontLineInsertionPosition(state, playerId),
    input,
    source,
  );
}

function assertContiguousV070Board(state: V070GameState): void {
  const ordered = [...state.board].sort((a, b) => a.position - b.position);
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index].position !== index) {
      throw new V070GameActionError(
        'The v0.7.0 Gauntlet board must have contiguous Position labels before Territory insertion.',
      );
    }
  }
  const instanceIds = new Set(
    ordered.map(territory => territory.territoryInstanceId),
  );
  if (instanceIds.size !== ordered.length) {
    throw new V070GameActionError(
      'The v0.7.0 Gauntlet cannot contain duplicate Territory instance ids.',
    );
  }
}
