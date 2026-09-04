import { describe, expect, it } from 'vitest';
import { EffectRegistry, totalModifiersFor } from './registry';
import type { EffectHandler } from './types';

const testHandler: EffectHandler = {
  id: 'test_modifier',
  timing: ['before_battle_resolution'],
  applies(context) {
    return context.actor === 'player_1';
  },
  resolve() {
    return {
      modifiers: [
        {
          playerId: 'player_1',
          source: 'test_modifier',
          amount: 2,
          reason: 'Test modifier.',
        },
      ],
      logMessages: ['Applied test modifier.'],
    };
  },
};

describe('EffectRegistry', () => {
  it('resolves matching handlers for a timing window', () => {
    const registry = new EffectRegistry([testHandler]);
    const result = registry.resolve({
      timing: 'before_battle_resolution',
      actor: 'player_1',
      game: {
        id: 'test-game',
        version: '0.5.6',
        phase: 'battle',
        turn: 1,
        activePlayer: 'player_1',
        players: {},
        board: { layout: 'standard_1x6', spaces: [] },
        log: [],
      },
    });

    expect(result.modifiers).toHaveLength(1);
    expect(totalModifiersFor(result.modifiers, 'player_1')).toBe(2);
    expect(result.logMessages).toEqual(['Applied test modifier.']);
  });

  it('ignores handlers for other timing windows', () => {
    const registry = new EffectRegistry([testHandler]);
    const result = registry.resolve({
      timing: 'after_battle_resolution',
      actor: 'player_1',
      game: {
        id: 'test-game',
        version: '0.5.6',
        phase: 'battle',
        turn: 1,
        activePlayer: 'player_1',
        players: {},
        board: { layout: 'standard_1x6', spaces: [] },
        log: [],
      },
    });

    expect(result.modifiers).toEqual([]);
    expect(result.logMessages).toEqual([]);
  });
});
