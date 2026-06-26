import { describe, expect, it } from 'vitest';
import { cardCanBePlayedAt, getCardPlayRule } from './playability';

describe('card playability rules', () => {
  it('describes Embargo timing, origin, targets, and destinations', () => {
    expect(getCardPlayRule('card-embargo')).toMatchObject({
      cardId: 'card-embargo',
      timings: ['battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: {
        hand: 'graveyard',
        battle_draw: 'discard',
      },
      requiresTarget: true,
    });
  });

  it('allows Valor as a battle card from hand or battle draw', () => {
    expect(cardCanBePlayedAt('card-valor', 'battle_hand_commit', 'hand')).toBe(true);
    expect(cardCanBePlayedAt('card-valor', 'battle_draw_play', 'battle_draw')).toBe(true);
  });

  it('does not allow Valor as an Action', () => {
    expect(cardCanBePlayedAt('card-valor', 'action', 'hand')).toBe(false);
  });

  it('permits unknown cards until their rules are encoded', () => {
    expect(cardCanBePlayedAt('card-not-yet-modeled', 'battle_hand_commit', 'hand')).toBe(true);
  });
});
