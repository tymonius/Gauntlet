import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const materializer = readFileSync('scripts/materialize-public-route-compatibility.mjs', 'utf8');
const pagesStager = readFileSync('scripts/stage-pages-publication.mjs', 'utf8');
const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
const publicationWorkflow = readFileSync('.github/workflows/current-publication-contract.yml', 'utf8');

describe('public route and Pages publication boundary', () => {
  it('keeps source ownership independent from stable public routes', () => {
    const mappings = new Map(contract.materializedRoutes.map((entry: any) => [entry.source, entry.publicPath]));
    expect(mappings.get('apps/card-reference')).toBe('/card-reference/');
    expect(mappings.get('apps/deckbuilder')).toBe('/deckbuilder/');
    expect(mappings.get('apps/factions')).toBe('/factions/');
    expect(mappings.get('apps/rules')).toBe('/rules/');
    expect(mappings.get('apps/start')).toBe('/start/');
    expect(mappings.get('apps/playtest')).toBe('/playtest/');
    expect(mappings.get('packages/game-data')).toBe('/game-data/');
  });

  it('keeps repository source boundaries non-public by default', () => {
    for (const root of ['.github', 'apps', 'docs', 'governance', 'legacy', 'media', 'packages', 'scripts', 'src', 'tests', 'workers']) {
      expect(contract.pages.sourceOnlyRepositoryRoots).toContain(root);
      expect(contract.pages.publishedDirectories).not.toContain(root);
    }
    expect(contract.pages.publishedDirectories).toContain('config');
  });

  it('makes materialization and Pages staging consume the contract', () => {
    expect(materializer).toContain("from './publication-boundary.mjs'");
    expect(pagesStager).toContain('loadPublicationBoundary');
    expect(pagesStager).toContain('materializePublicRoutes');
    expect(publicationWorkflow).toContain('/config/publication-boundary.json');
    expect(publicationWorkflow).toContain('node scripts/validate-publication-boundary.mjs');
    expect(pagesWorkflow).toContain("'config/publication-boundary.json'");
    expect(pagesWorkflow).toContain('node scripts/stage-pages-publication.mjs "$site"');
    expect(pagesWorkflow).toContain('node scripts/validate-publication-boundary.mjs --site "$SITE_DIR"');
  });
});
