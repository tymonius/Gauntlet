import type { BoardSpaceState, BoardState, PlayerID, TerritoryID } from '../types';
import type { V06PlayerSetupInput } from './v06-setup';

function endpoint(
  id: string,
  index: number,
  endpointOwner: PlayerID,
  endpointRole: 'before_gauntlet' | 'beyond_gauntlet',
  occupant?: PlayerID,
): BoardSpaceState {
  return {
    id,
    index,
    kind: 'endpoint',
    endpointOwner,
    endpointRole,
    occupant,
    revealed: true,
  };
}

function territory(
  index: number,
  territoryId: TerritoryID,
  controller: PlayerID,
): BoardSpaceState {
  return {
    id: `space-${index}`,
    index,
    kind: 'territory',
    territoryId,
    controller,
    revealed: true,
  };
}

export interface V06BoardTopology {
  board: BoardState;
  startingSpaces: Record<PlayerID, string>;
}

export function createV06StandardBoard(players: [V06PlayerSetupInput, V06PlayerSetupInput]): V06BoardTopology {
  const [playerOne, playerTwo] = players;
  const spaces: BoardSpaceState[] = [];

  spaces.push(endpoint(`${playerOne.id}-beyond-gauntlet`, spaces.length, playerOne.id, 'beyond_gauntlet'));
  spaces.push(endpoint(`${playerOne.id}-before-gauntlet`, spaces.length, playerOne.id, 'before_gauntlet', playerOne.id));

  for (const territoryId of playerOne.territories) {
    spaces.push(territory(spaces.length, territoryId, playerOne.id));
  }

  for (const territoryId of [...playerTwo.territories].reverse()) {
    spaces.push(territory(spaces.length, territoryId, playerTwo.id));
  }

  spaces.push(endpoint(`${playerTwo.id}-before-gauntlet`, spaces.length, playerTwo.id, 'before_gauntlet', playerTwo.id));
  spaces.push(endpoint(`${playerTwo.id}-beyond-gauntlet`, spaces.length, playerTwo.id, 'beyond_gauntlet'));

  return {
    board: {
      layout: 'standard_1x6',
      spaces,
    },
    startingSpaces: {
      [playerOne.id]: `${playerOne.id}-before-gauntlet`,
      [playerTwo.id]: `${playerTwo.id}-before-gauntlet`,
    },
  };
}

export function isOwnBeyondGauntletSpace(space: BoardSpaceState, playerId: PlayerID): boolean {
  return space.kind === 'endpoint'
    && space.endpointOwner === playerId
    && space.endpointRole === 'beyond_gauntlet';
}

export function isOpponentBeyondGauntletSpace(space: BoardSpaceState, playerId: PlayerID): boolean {
  return space.kind === 'endpoint'
    && space.endpointOwner !== undefined
    && space.endpointOwner !== playerId
    && space.endpointRole === 'beyond_gauntlet';
}
