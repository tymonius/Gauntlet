import { describe, expect, it } from 'vitest';
import type { PlayerState } from '../types';
import { drawFromDeck } from './draw';

function player(deck: string[], discard: string[] = [], graveyard: string[] = []): PlayerState {
  return {
    id: 'player_1',
    name: 'Player One',
    zones: {
      deck,
      hand: [],
      discard,
      graveyard,
      assetBank: [],
      removed: [],
    },
    controlledTerritories: [],
    actionsRemaining: 1,
    movementRemaining: 1,
    hasPlayedActionThisTurn: false,
    hasPlayedBattleThisTurn: false,
  };
}

describe('drawFromDeck', () => {
  it('draws from the deck first', () => {
    const p = player(['a', 'b', 'c']);
    const result = drawFromDeck(p, { count: 2 });

    expect(result.drawnCards).toEqual(['a', 'b']);
    expect(p.zones.deck).toEqual(['c']);
    expect(result.reshuffled).toBe(false);
    expect(result.exhausted).toBe(false);
  });

  it('reshuffles discard only after the deck runs out', () => {
    const p = player(['a', 'b'], ['c', 'd', 'e']);
    const result = drawFromDeck(p, { count: 3, random: () => 0 });

    expect(result.drawnCards).toEqual(['a', 'b', 'd']);
    expect(result.reshuffled).toBe(true);
    expect(result.exhausted).toBe(false);
    expect(p.zones.discard).toEqual([]);
    expect(p.zones.deck).toEqual(['e', 'c']);
  });

  it('does not shuffle already drawn cards back in', () => {
    const p = player(['a'], ['b']);
    const result = drawFromDeck(p, { count: 2 });

    expect(result.drawnCards).toEqual(['a', 'b']);
    expect(p.zones.deck).toEqual([]);
    expect(p.zones.discard).toEqual([]);
  });

  it('never draws from the graveyard', () => {
    const p = player([], [], ['dead-card']);
    const result = drawFromDeck(p, { count: 1 });

    expect(result.drawnCards).toEqual([]);
    expect(result.exhausted).toBe(true);
    expect(p.zones.graveyard).toEqual(['dead-card']);
  });

  it('allows partial draws when deck and discard are insufficient', () => {
    const p = player(['a'], []);
    const result = drawFromDeck(p, { count: 3 });

    expect(result.drawnCards).toEqual(['a']);
    expect(result.exhausted).toBe(true);
  });
});
