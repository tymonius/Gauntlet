import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  mergeArtDirectionDrafts,
  readArtDirectionDrafts,
} from '../card-design/art-direction-drafts.mjs';

const componentRender = readFileSync('card-design/component-render.js', 'utf8');
const playableRender = readFileSync('card-design/card-review-render.js', 'utf8');
const territoryRender = readFileSync('card-design/territory-review-render.js', 'utf8');
const compositor = readFileSync('card-design/artwork-compositor.js', 'utf8');

function storageFor(value: unknown) {
  return {
    getItem(key: string) {
      return key === STORAGE_KEY ? JSON.stringify(value) : null;
    },
  };
}

describe('Card Design artwork draft authority', () => {
  it('lets an explicit Card Design draft override the committed direction for the same face', () => {
    const merged = mergeArtDirectionDrafts(
      {
        'financiers-banker': { focusY: 0.16 },
        'military-general': { zoom: 1.05 },
      },
      storageFor({
        'financiers-banker': { focus: [0.41, 0.27], zoom: 1.08 },
      }),
    );

    expect(merged['financiers-banker']).toEqual({ focus: [0.41, 0.27], zoom: 1.08 });
    expect(merged['military-general']).toEqual({ zoom: 1.05 });
  });

  it('fails closed to committed authority when browser draft storage is unavailable or malformed', () => {
    const throwingStorage = { getItem() { throw new Error('blocked'); } };
    expect(readArtDirectionDrafts(throwingStorage)).toEqual({});
    expect(readArtDirectionDrafts(storageFor(['not', 'a', 'map']))).toEqual({});
    expect(mergeArtDirectionDrafts({ banker: { focusY: 0.2 } }, throwingStorage))
      .toEqual({ banker: { focusY: 0.2 } });
  });

  it('makes every canonical face renderer consume the same draft state before rendering', () => {
    expect(componentRender).toContain('mergeArtDirectionDrafts(currentGame.artDirection || {})');
    expect(playableRender).toContain('mergeArtDirectionDrafts(currentGame.artDirection || {})');
    expect(territoryRender).toContain('mergeArtDirectionDrafts(currentGame.artDirection || {})');
    expect(componentRender).toContain('artDirectionDraftsApplied');
    expect(playableRender).toContain('artDirectionDraftsApplied');
    expect(territoryRender).toContain('artDirectionDraftsApplied');
  });

  it('keeps the compositor and canonical renderers on the same browser-draft namespace', () => {
    expect(STORAGE_KEY).toBe('gauntlet.art-direction-drafts.v1');
    expect(compositor).toContain(`const STORAGE_KEY = '${STORAGE_KEY}'`);
  });
});
