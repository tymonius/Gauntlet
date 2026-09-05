import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { createValidSetup } from './test-helpers';
import { toPrivateGameView, toPublicGameView } from './views';


describe('game views', () => {
  it('redacts player hands and decks in the public view', () => {
    const game = initializeGame(createValidSetup());
    const view = toPublicGameView(game);

    expect(view.players.player_1.zones.hand).toEqual({ kind: 'hidden', count: 3 });
    expect(view.players.player_1.zones.deck).toEqual({ kind: 'hidden', count: 1 });
    expect(view.players.player_2.zones.hand).toEqual({ kind: 'hidden', count: 3 });
  });

  it('shows only the viewer their own hand', () => {
    const game = initializeGame(createValidSetup());
    const view = toPrivateGameView(game, 'player_1');

    expect(view.players.player_1.zones.hand).toEqual({ kind: 'visible', cards: ['p1-card-1', 'p1-card-2', 'p1-card-3'] });
    expect(view.players.player_2.zones.hand).toEqual({ kind: 'hidden', count: 3 });
  });

  it('redacts unrevealed territory identities', () => {
    const game = initializeGame(createValidSetup());
    const view = toPublicGameView(game);

    expect(view.board.spaces[1].territoryId).toBeUndefined();
    expect(view.board.spaces[0].kind).toBe('heartland');
  });
});
