import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from '../cards';
import { DECOYS } from './neutral-decoys-battle';

describe('Neutral Decoys audit containment', () => {
  it('quarantines the incorrect Action implementation while retaining the Battle form', () => {
    expect(getCardPlayRule(DECOYS)).toMatchObject({
      timings: ['battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
    });
    expect(cardCanBePlayedAt(DECOYS, 'action', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(DECOYS, 'battle_hand_commit', 'hand')).toBe(true);
    expect(cardCanBePlayedAt(DECOYS, 'battle_draw_play', 'battle_draw')).toBe(true);
  });
});
