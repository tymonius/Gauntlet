import { describe, expect, it } from 'vitest';

import {
  requestedProfile,
  selectedProfiles,
  validateCompositionConfig,
} from './generate-card-media-compositions.mjs';

const catalog = {
  playableCards: [
    { id: 'neutral-a', artwork: 'images/a.png' },
    { id: 'financiers-b', artwork: 'images/b.png' },
  ],
};

const config = {
  schemaVersion: 1,
  gameVersion: 'v0.6.2',
  compositions: [
    {
      id: 'test-fan',
      canvas: { width: 1000, height: 600 },
      profiles: {
        website: { width: 500, height: 300, formats: ['png', 'webp'], webpQuality: 90 },
        publication: { width: 1000, height: 600, formats: ['png'] },
      },
      cards: [
        { id: 'neutral-a', x: 0, y: 0, width: 200, rotation: -8, z: 1 },
        { id: 'financiers-b', x: 200, y: 0, width: 200, rotation: 8, z: 2 },
      ],
    },
  ],
};

describe('card-media compositions', () => {
  it('parses the requested output profile', () => {
    expect(requestedProfile([])).toBe('all');
    expect(requestedProfile(['--profile=website'])).toBe('website');
  });

  it('selects either every profile or one requested profile', () => {
    const composition = config.compositions[0];
    expect(selectedProfiles(composition, 'all').map(([id]) => id)).toEqual(['website', 'publication']);
    expect(selectedProfiles(composition, 'website').map(([id]) => id)).toEqual(['website']);
  });

  it('accepts canonical cards with approved artwork', () => {
    expect(validateCompositionConfig(structuredClone(config), catalog)).toEqual(config);
  });

  it('rejects unknown cards and cards without artwork', () => {
    const invalidCatalog = {
      playableCards: [
        { id: 'neutral-a', artwork: null },
      ],
    };
    expect(() => validateCompositionConfig(structuredClone(config), invalidCatalog)).toThrow(/without approved artwork/);
    expect(() => validateCompositionConfig(structuredClone(config), invalidCatalog)).toThrow(/unknown card financiers-b/);
  });
});
