import { describe, expect, it } from 'vitest';
import { createValidSetup } from './test-helpers';
import { GameSetupValidationError, assertValidGameSetup, validateGameSetup } from './validation';


describe('validateGameSetup', () => {
  it('accepts a valid two-player setup', () => {
    const result = validateGameSetup(createValidSetup());

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects duplicate player ids', () => {
    const setup = createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['a', 'b', 'c'],
          territories: ['t1', 't2', 't3'],
        },
        {
          id: 'player_1',
          name: 'Player Two',
          deck: ['d', 'e', 'f'],
          territories: ['t4', 't5', 't6'],
        },
      ],
    });

    const result = validateGameSetup(setup);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'duplicate_player_id')).toBe(true);
  });

  it('rejects missing or duplicate territories', () => {
    const setup = createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['a', 'b', 'c'],
          territories: ['t1', 't1', 't2'],
        },
        {
          id: 'player_2',
          name: 'Player Two',
          deck: ['d', 'e', 'f'],
          territories: ['t4', 't5'],
        },
      ],
    });

    const result = validateGameSetup(setup);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'duplicate_territory_selection')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'invalid_territory_count')).toBe(true);
  });

  it('throws a structured setup error from assertValidGameSetup', () => {
    const setup = createValidSetup({ version: '' });

    expect(() => assertValidGameSetup(setup)).toThrow(GameSetupValidationError);
  });
});
