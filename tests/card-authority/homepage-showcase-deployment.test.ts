import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_SHOWCASE_ID,
  HOMEPAGE_SHOWCASE_SCHEMA_VERSION,
  buildHomepageShowcaseManifest,
} from '../../scripts/build-homepage-showcase-manifest.mjs';

const source = JSON.parse(readFileSync('media/compositions.json', 'utf8'));
const publicManifest = JSON.parse(readFileSync('assets/homepage-card-showcase.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const homepage = readFileSync('homepage-card-showcase.js', 'utf8');
const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

describe('homepage showcase deployment boundary', () => {
  it('publishes an exact minimal projection of the source-only promotional composition', () => {
    const expected = buildHomepageShowcaseManifest(source);
    expect(publicManifest).toEqual(expected);
    expect(publicManifest).toMatchObject({
      schemaVersion: HOMEPAGE_SHOWCASE_SCHEMA_VERSION,
      id: HOMEPAGE_SHOWCASE_ID,
    });
    expect(publicManifest.cards).toHaveLength(7);

    for (const card of publicManifest.cards) {
      expect(Object.keys(card).sort()).toEqual(['id', 'rotation', 'width', 'x', 'y', 'z']);
    }
  });

  it('keeps every showcased card on current playable-card authority', () => {
    const currentIds = new Set(currentGame.gameplay.cards.map((card: any) => card.id));
    expect(publicManifest.cards.every((card: any) => currentIds.has(card.id))).toBe(true);
  });

  it('uses only the public manifest at runtime while keeping media source-only', () => {
    expect(homepage).toContain("const SHOWCASE_MANIFEST = '/assets/homepage-card-showcase.json'");
    expect(homepage).not.toContain('/media/');
    expect(pagesWorkflow).toMatch(/\n\s+assets\n/);
    expect(pagesWorkflow).toMatch(/\.github artifacts docs governance legacy media rulebook-design/);
  });
});
