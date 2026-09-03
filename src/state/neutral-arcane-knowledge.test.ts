import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from '../cards/playability';
import { ARCANE_KNOWLEDGE } from './neutral-arcane-knowledge';

describe('Neutral Arcane Knowledge audit containment', () => {
  it('retains the canonical Action while quarantining incomplete Battle replay support', () => {
    expect(getCardPlayRule(ARCANE_KNOWLEDGE)).toMatchObject({
      timings: ['action'],
      allowedOrigins: ['hand'],
      requiresTarget: true,
    });
    expect(cardCanBePlayedAt(ARCANE_KNOWLEDGE, 'action', 'hand')).toBe(true);
    expect(cardCanBePlayedAt(ARCANE_KNOWLEDGE, 'battle_hand_commit', 'hand')).toBe(false);
    expect(cardCanBePlayedAt(ARCANE_KNOWLEDGE, 'battle_draw_play', 'battle_draw')).toBe(false);
  });
});
