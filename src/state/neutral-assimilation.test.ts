import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from '../cards';
import { ASSIMILATION } from './neutral-assimilation';

describe('Neutral Assimilation audit containment', () => {
  it('quarantines both forms until the Asset and aftermath implementation is rewritten', () => {
    expect(getCardPlayRule(ASSIMILATION)).toMatchObject({
      timings: [],
      allowedOrigins: [],
    });
    expect(cardCanBePlayedAt(ASSIMILATION, 'action', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(ASSIMILATION, 'battle_hand_commit', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(ASSIMILATION, 'battle_draw_play', 'battle_draw')).toBe(false);
  });
});
