import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import {
  FactionResourceError,
  gainFactionResource,
  hasFactionResource,
  setFactionResource,
  spendFactionResource,
} from './resources';
import { createValidSetup } from './test-helpers';

function gameFor(factionId: string) {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId,
        deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-card-4'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
}

describe('faction resource framework', () => {
  it('initializes canonical starting values and limits', () => {
    expect(gameFor('military').players.player_1.resources!.command).toMatchObject({ value: 0, maximum: 2 });
    expect(gameFor('diplomats').players.player_1.resources!.influence).toMatchObject({ value: 1, maximum: 10 });
    expect(gameFor('financiers').players.player_1.resources!.capital).toMatchObject({ value: 0, limitKind: 'dynamic' });
    expect(gameFor('intelligence').players.player_1.resources).toMatchObject({
      intel: { value: 0, limitKind: 'none' },
      operation_progress: { value: 0, limitKind: 'none' },
    });
    expect(gameFor('mystics').players.player_1.resources).toEqual({});
    expect(gameFor('inquisition').players.player_1.resources!.conviction).toMatchObject({ value: 0, maximum: 4 });
  });

  it('gains, spends, checks, caps, and logs resources', () => {
    const game = gameFor('military');

    expect(gainFactionResource(game, 'player_1', 'command', 3, 'test gain')).toBe(2);
    expect(hasFactionResource(game.players.player_1, 'command', 2)).toBe(true);
    expect(spendFactionResource(game, 'player_1', 'command', 1, 'test spend')).toBe(1);
    expect(setFactionResource(game, 'player_1', 'command', -5, 'test floor')).toBe(0);
    expect(game.log.filter((event) => event.type === 'faction_resource_changed')).toHaveLength(3);
  });

  it('rejects overspending and resources a faction does not track', () => {
    const game = gameFor('inquisition');

    expect(() => spendFactionResource(game, 'player_1', 'conviction', 1)).toThrow(FactionResourceError);
    expect(() => gainFactionResource(game, 'player_1', 'command', 1)).toThrow(FactionResourceError);
  });
});
