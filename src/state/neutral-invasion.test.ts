import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from '../cards';
import { INVASION } from './neutral-invasion';

describe('Neutral Invasion audit containment', () => {
  it('retains the canonical Action while quarantining the mistimed Battle form', () => {
    expect(getCardPlayRule(INVASION)).toMatchObject({
      timings: ['action'],
      allowedOrigins: ['hand'],
    });
    expect(cardCanBePlayedAt(INVASION, 'action', 'hand')).toBe(true);
    expect(cardCanBePlayedAt(INVASION, 'battle_hand_commit', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(INVASION, 'battle_draw_play', 'battle_draw')).toBe(false);
  });
});
