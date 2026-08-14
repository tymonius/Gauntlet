import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artworkCandidates, slugify, unicodeSlugify } from '../card-design/card-artwork-resolver.js';

describe('card artwork resolution', () => {
  it('resolves Détente through both its stable ASCII id and the uploaded accented filename', () => {
    const card = { id: 'diplomats-detente', name: 'Détente' };
    expect(slugify(card.name)).toBe('detente');
    expect(unicodeSlugify(card.name)).toBe('détente');

    const candidates = artworkCandidates(card, 'diplomats', ['png']);
    expect(candidates).toEqual([
      '/images/artwork/cards/diplomats/detente.png',
      '/images/artwork/cards/diplomats/détente.png',
    ]);
    expect(existsSync(`.${candidates[1]}`)).toBe(true);
  });

  it('keeps ordinary punctuation-based artwork slugs stable', () => {
    const card = { id: 'mystics-fate-s-toll', name: "Fate's Toll" };
    const candidates = artworkCandidates(card, 'mystics', ['png']);
    expect(candidates).toEqual(['/images/artwork/cards/mystics/fate-s-toll.png']);
    expect(existsSync(`.${candidates[0]}`)).toBe(true);
  });
});
