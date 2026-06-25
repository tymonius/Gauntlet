import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { createValidSetup } from './test-helpers';


describe('initializeGame', () => {
  it('creates an authoritative game state with opening hands', () => {
    const game = initializeGame(createValidSetup());

    expect(game.id).toBe('test-game');
    expect(game.version).toBe('0.5.6');
    expect(game.turn).toBe(1);
    expect(game.activePlayer).toBe('player_1');
    expect(game.players.player_1.zones.hand).toEqual(['p1-card-1', 'p1-card-2', 'p1-card-3']);
    expect(game.players.player_1.zones.deck).toEqual(['p1-card-4']);
  });

  it('creates a standard board with heartlands and territories', () => {
    const game = initializeGame(createValidSetup());

    expect(game.board.layout).toBe('standard_1x6');
    expect(game.board.spaces).toHaveLength(8);
    expect(game.board.spaces[0]).toMatchObject({ kind: 'heartland', occupant: 'player_1', revealed: true });
    expect(game.board.spaces[7]).toMatchObject({ kind: 'heartland', occupant: 'player_2', revealed: true });
    expect(game.board.spaces[1]).toMatchObject({ territoryId: 'p1-territory-1', controller: 'player_1', revealed: false });
    expect(game.board.spaces[6]).toMatchObject({ territoryId: 'p2-territory-1', controller: 'player_2', revealed: false });
  });

  it('respects explicit starting player', () => {
    const game = initializeGame(createValidSetup({ startingPlayer: 'player_2' }));

    expect(game.activePlayer).toBe('player_2');
    expect(game.priorityPlayer).toBe('player_2');
  });
});
