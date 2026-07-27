import { describe, expect, it } from 'vitest';
import { checkWinConditions } from './win';
import { initializeV06Game, type V06GameSetupInput } from './v06-setup';

function deck(): string[] {
  return Array.from({ length: 30 }, () => 'neutral-rallying-cry');
}

function setup(): V06GameSetupInput {
  return {
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: deck(),
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: deck(),
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-field-hospital'],
      },
    ],
  };
}

describe('canonical v0.6 board topology', () => {
  it('creates six revealed Territories plus before and beyond positions at both ends', () => {
    const game = initializeV06Game(setup());

    expect(game.board.spaces).toHaveLength(10);
    expect(game.board.spaces.filter((space) => space.kind === 'territory')).toHaveLength(6);
    expect(game.board.spaces.filter((space) => space.kind === 'territory').every((space) => space.revealed)).toBe(true);
    expect(game.board.spaces[0]).toMatchObject({
      id: 'player_1-beyond-gauntlet',
      kind: 'endpoint',
      endpointOwner: 'player_1',
      endpointRole: 'beyond_gauntlet',
    });
    expect(game.board.spaces[1]).toMatchObject({
      id: 'player_1-before-gauntlet',
      occupant: 'player_1',
      endpointRole: 'before_gauntlet',
    });
    expect(game.board.spaces[8]).toMatchObject({
      id: 'player_2-before-gauntlet',
      occupant: 'player_2',
      endpointRole: 'before_gauntlet',
    });
    expect(game.board.spaces[9]).toMatchObject({
      id: 'player_2-beyond-gauntlet',
      endpointRole: 'beyond_gauntlet',
    });
    expect(game.players.player_1.occupiedSpaceId).toBe('player_1-before-gauntlet');
    expect(game.players.player_2.occupiedSpaceId).toBe('player_2-before-gauntlet');
  });

  it('does not award victory merely for occupying an endpoint position', () => {
    const game = initializeV06Game(setup());
    const destination = game.board.spaces.find((space) => space.id === 'player_2-beyond-gauntlet')!;
    const start = game.board.spaces.find((space) => space.id === 'player_1-before-gauntlet')!;
    start.occupant = undefined;
    destination.occupant = 'player_1';
    game.players.player_1.occupiedSpaceId = destination.id;

    expect(checkWinConditions(game)).toBeUndefined();
  });
});
