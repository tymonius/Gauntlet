import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import { gainV070Capital, isV070FinancierPlayer } from './financiers';
import type { PlayerId } from './rules';

export function v070SpeculationTargetPositions(
  state: V070GameState,
  playerId: PlayerId,
): number[] {
  if (!isV070FinancierPlayer(state, playerId)) return [];
  return state.board
    .filter(territory =>
      territory.controller !== playerId
      && territory.occupant !== playerId
    )
    .map(territory => territory.position)
    .sort((a, b) => a - b);
}

export function placeV070Speculation(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  territoryPosition: number,
): void {
  if (!isV070FinancierPlayer(state, playerId)) {
    throw new V070GameActionError(
      'Speculation requires the Financiers faction economy.',
    );
  }
  if (state.speculations.some(item => item.instanceId === instanceId)) {
    throw new V070GameActionError(
      'That Speculation card is already tracking a Territory.',
    );
  }

  const territory = state.board.find(
    candidate => candidate.position === territoryPosition,
  );
  if (!territory
    || territory.controller === playerId
    || territory.occupant === playerId) {
    throw new V070GameActionError(
      'Speculation must target a Territory you neither control nor occupy.',
    );
  }

  state.speculations.push({
    instanceId,
    owner: playerId,
    territoryInstanceId: territory.territoryInstanceId,
    placedTurn: state.turnNumber,
  });
  appendV070Event(state, {
    type: 'speculation_placed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
      placedTurn: state.turnNumber,
    },
  });
}

export function resolveV070SpeculationsAtTurnStart(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const due = state.speculations.filter(
    item => item.owner === playerId && item.placedTurn < state.turnNumber,
  );
  if (due.length === 0) return;

  for (const speculation of due) {
    const territory = state.board.find(
      candidate =>
        candidate.territoryInstanceId === speculation.territoryInstanceId,
    );
    const succeeded = Boolean(
      territory
      && (
        territory.controller === playerId
        || territory.occupant === playerId
      ),
    );

    if (succeeded) {
      gainV070Capital(
        state,
        playerId,
        2,
        'Speculation at start of next turn',
      );
      state.players[playerId].zones.discardPile.push(speculation.instanceId);
    } else {
      state.players[playerId].zones.graveyard.push(speculation.instanceId);
    }

    appendV070Event(state, {
      type: 'speculation_resolved',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: speculation.instanceId,
        cardId: state.cardInstances[speculation.instanceId]?.cardId,
        territoryInstanceId: speculation.territoryInstanceId,
        territoryPosition: territory?.position ?? null,
        succeeded,
        capitalGained: succeeded ? 2 : 0,
        destination: succeeded ? 'discard' : 'graveyard',
      },
    });
  }

  const dueIds = new Set(due.map(item => item.instanceId));
  state.speculations = state.speculations.filter(
    item => !dueIds.has(item.instanceId),
  );
}
