import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from '../cards';
import { ARMISTICE } from './neutral-armistice';

describe('Neutral Armistice audit containment', () => {
  it('retains the Battle form while quarantining the incorrect temporary Condition Action', () => {
    expect(getCardPlayRule(ARMISTICE)).toMatchObject({
      timings: ['battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
    });
    expect(cardCanBePlayedAt(ARMISTICE, 'action', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(ARMISTICE, 'battle_hand_commit', 'hand')).toBe(true);
    expect(cardCanBePlayedAt(ARMISTICE, 'battle_draw_play', 'battle_draw')).toBe(true);
  });
});
