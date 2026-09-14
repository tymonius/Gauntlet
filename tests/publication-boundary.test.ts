import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const materializer = readFileSync('scripts/materialize-public-route-compatibility.mjs', 'utf8');
const pagesStager = readFileSync('scripts/stage-pages-publication.mjs', 'utf8');
const pagesValidator = readFileSync('scripts/validate-publication-boundary.mjs', 'utf8');
const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
const publicationWorkflow = readFileSync('.github/workflows/current-publication-contract.yml', 'utf8');

describe('public route and Pages publication boundary', () => {
  it('keeps source ownership independent from stable public routes', () => {
    const mappings = new Map(contract.materializedRoutes.map((entry: any) => [entry.source, entry.publicPath]));
    expect(mappings.get('apps/about')).toBe('/about/');
    expect(mappings.get('apps/accessibility')).toBe('/accessibility/');
    expect(mappings.get('apps/card-reference')).toBe('/card-reference/');
    expect(mappings.get('apps/changelog')).toBe('/changelog/');
    expect(mappings.get('apps/contact')).toBe('/contact/');
    expect(mappings.get('apps/deckbuilder')).toBe('/deckbuilder/');
    expect(mappings.get('apps/faq')).toBe('/faq/');
    expect(mappings.get('apps/factions')).toBe('/factions/');
    expect(mappings.get('apps/press')).toBe('/press/');
    expect(mappings.get('apps/privacy')).toBe('/privacy/');
    expect(mappings.get('apps/rulebook')).toBe('/rulebook/');
    expect(mappings.get('apps/rules')).toBe('/rules/');
    expect(mappings.get('apps/start')).toBe('/start/');
    expect(mappings.get('apps/playtest')).toBe('/playtest/');
    expect(mappings.get('packages/game-data')).toBe('/game-data/');
  });

  it('keeps repository source boundaries non-public by default', () => {
    for (const root of ['.github', 'apps', 'docs', 'governance', 'legacy', 'media', 'packages', 'rulebook', 'scripts', 'src', 'tests', 'workers']) {
      expect(contract.pages.sourceOnlyRepositoryRoots).toContain(root);
      expect(contract.pages.publishedDirectories).not.toContain(root);
    }
    expect(contract.pages.publishedDirectories).toContain('config');
  });

  it('publishes only declared legacy Rulebook and active rules source files', () => {
    expect(existsSync('apps/rulebook/index.html')).toBe(true);
    expect(existsSync('apps/rulebook/app.js')).toBe(true);
    expect(existsSync('apps/rulebook/player-guide-review/index.html')).toBe(true);
    expect(existsSync('rulebook/index.html')).toBe(false);
    expect(existsSync('rulebook/player-facing/current-rulebook.md')).toBe(true);
    expect(existsSync('packages/rules/player-guide/player-guide.md')).toBe(true);
    expect(existsSync('packages/rules/comprehensive/comprehensive-rules.md')).toBe(true);
    expect(existsSync('rulebook/publication/editorial-policy.md')).toBe(true);

    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/rulebook/player-facing/current-rulebook.md')).toBe('rulebook/player-facing/current-rulebook.md');
    expect(files.get('/rulebook/player-guide/player-guide.md')).toBe('packages/rules/player-guide/player-guide.md');
    expect(files.get('/rules/sources/player-guide.md')).toBe('packages/rules/player-guide/player-guide.md');
    expect(files.get('/rules/sources/comprehensive-rules.md')).toBe('packages/rules/comprehensive/comprehensive-rules.md');
    expect(contract.managedRoutes).toContain('/rulebook/');
    expect(contract.managedRoutes).toContain('/rulebook/player-guide-review/');
    expect(contract.managedRoutes).toContain('/rules/player-guide/');
    expect(contract.managedRoutes).toContain('/rules/comprehensive/');
  });

  it('keeps in-place compatibility materialization from overwriting source-only roots', () => {
    expect(materializer).toContain('const sourceOnlyRoots = new Set');
    expect(materializer).toContain('return !sourceOnlyRoots.has(topLevel);');
    expect(materializer).toContain('return source !== destination;');
  });

  it('makes materialization and Pages staging consume the contract', () => {
    expect(materializer).toContain("from './publication-boundary.mjs'");
    expect(pagesStager).toContain('loadPublicationBoundary');
    expect(pagesStager).toContain('materializePublicRoutes');
    expect(pagesValidator).toContain('materializedTopLevelDirectories');
    expect(publicationWorkflow).toContain('/config/publication-boundary.json');
    expect(publicationWorkflow).toContain('/rulebook/player-facing/current-rulebook.md');
    expect(publicationWorkflow).toContain('/packages/rules/**');
    expect(publicationWorkflow).not.toContain('/rulebook/player-guide/player-guide.md');
    expect(publicationWorkflow).not.toContain('/rulebook/index.html');
    expect(publicationWorkflow).toContain('node scripts/validate-publication-boundary.mjs');
    expect(pagesWorkflow).toContain("'config/publication-boundary.json'");
    expect(pagesWorkflow).toContain('node scripts/stage-pages-publication.mjs "$site"');
    expect(pagesWorkflow).toContain('node scripts/validate-publication-boundary.mjs --site "$SITE_DIR"');
  });
});
