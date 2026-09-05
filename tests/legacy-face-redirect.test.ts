import { describe, expect, it } from 'vitest';
import { legacyFaceId } from '../card-design/legacy-face-redirect.mjs';

const params = (query: string) => new URLSearchParams(query);

describe('legacy physical-face redirects', () => {
  it('preserves playable-card and Territory query aliases', () => {
    expect(legacyFaceId({}, 'card', params('card=military-unbroken-ranks'))).toBe(
      'card:military-unbroken-ranks',
    );
    expect(legacyFaceId({}, 'card', params('id=mystics-witchcraft'))).toBe(
      'card:mystics-witchcraft',
    );
    expect(legacyFaceId({}, 'territory', params('territory=the-gauntlet'))).toBe(
      'territory:the-gauntlet',
    );
    expect(legacyFaceId({}, 'territory', params('id=the-outlands'))).toBe(
      'territory:the-outlands',
    );
  });

  it('maps standard backs and direct component aliases to canonical identity', () => {
    expect(legacyFaceId({}, 'back', params('faction=Mystics'))).toBe('back:mystics');
    expect(legacyFaceId({}, 'back', params(''))).toBe('back:intelligence');
    expect(legacyFaceId({}, 'canonical-component', params('component=universal-reference'))).toBe(
      'component:universal-reference:front',
    );
    expect(legacyFaceId({}, 'canonical-component', params('id=capital-ledger&side=back'))).toBe(
      'component:capital-ledger:reverse',
    );
  });
});
