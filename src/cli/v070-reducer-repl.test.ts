import { describe, expect, test } from 'vitest';
import { createV070StarterGame } from '../v070/engine';
import {
  applyV070CliReducerCommand,
  parseV070CliReducerCommand,
} from './v070-reducer-repl';

describe('v0.7.0 developer CLI reducer adapter', () => {
  test('parses a typed setup reducer command', () => {
    expect(parseV070CliReducerCommand(
      'setup {"type":"roll_first_player","playerId":"A","value":6}',
    )).toEqual({
      domain: 'setup',
      action: {
        type: 'roll_first_player',
        playerId: 'A',
        value: 6,
      },
    });
  });

  test('rejects invalid domains and invalid JSON', () => {
    expect(() => parseV070CliReducerCommand(
      'legacy {"type":"noop"}',
    )).toThrow(/setup, turn, or battle/i);
    expect(() => parseV070CliReducerCommand(
      'turn {not-json}',
    )).toThrow(/valid JSON/i);
  });

  test('routes setup actions through the promoted v0.7.0 reducer', () => {
    let state = createV070StarterGame({
      gameId: 'cli-adapter-test',
      seed: 'cli-adapter-seed',
      players: {
        A: {
          name: 'Alpha',
          starterDeckId: 'military-general-forward-doctrine',
        },
        B: {
          name: 'Bravo',
          starterDeckId: 'military-commandant-holdfast',
        },
      },
    });
    const discard = state.players.A.openingSelection[0];

    state = applyV070CliReducerCommand(
      state,
      parseV070CliReducerCommand(
        `setup ${JSON.stringify({
          type: 'choose_opening_discard',
          playerId: 'A',
          cardInstanceId: discard,
        })}`,
      ),
    );

    expect(state.players.A.openingSelection).toEqual([]);
    expect(state.players.A.zones.hand).toHaveLength(3);
    expect(state.players.A.zones.discardPile).toContain(discard);
  });
});
