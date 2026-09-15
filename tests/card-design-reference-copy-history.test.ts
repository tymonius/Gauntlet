import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const currentGame = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));
const maintainedReadme = readFileSync('card-design/reference-copy/v0.7.0/README.md', 'utf8');

const historicalFiles = [
  'README.md',
  'diplomat-reference.md',
  'financier-reference.md',
  'inquisition-doctrine-reference.md',
  'inquisition-purge-reference.md',
  'intelligence-mission-reference.md',
  'intelligence-operations-reference.md',
  'mystics-reference.md',
  'universal-reference.md',
];

describe('card-design reference-copy history boundary', () => {
  it('keeps current reference-card copy on the maintained v0.7.0 source set', () => {
    const components = [
      ...(currentGame.componentContract?.sharedComponents || []),
      ...(currentGame.componentContract?.components || []),
    ];
    const referenceCards = components.filter((component: any) => component.family === 'reference-card');

    expect(referenceCards).toHaveLength(8);
    expect(referenceCards.every((component: any) => String(component.source).startsWith('card-design/reference-copy/v0.7.0/'))).toBe(true);
    expect(referenceCards.some((component: any) => String(component.source).includes('/v0.6.3/'))).toBe(false);
    expect(maintainedReadme).toContain('Historical reference-copy directories remain provenance only.');
  });

  it('archives the superseded v0.6.3 copy while preserving its public directory', () => {
    for (const file of historicalFiles) {
      expect(existsSync(`legacy/card-design-v0.6.3/reference-copy/${file}`)).toBe(true);
      expect(existsSync(`card-design/reference-copy/v0.6.3/${file}`)).toBe(false);
    }

    const mapping = contract.materializedRoutes.find(
      (entry: any) => entry.publicPath === '/card-design/reference-copy/v0.6.3/',
    );
    expect(mapping).toMatchObject({
      source: 'legacy/card-design-v0.6.3/reference-copy',
      kind: 'historical-card-review',
      manageIndexRoutes: false,
    });
  });
});
