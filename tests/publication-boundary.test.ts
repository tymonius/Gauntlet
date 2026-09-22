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
    expect(mappings.get('legacy/rulebook-browser')).toBe('/rulebook/');
    expect(mappings.has('apps/rulebook')).toBe(false);
    expect(mappings.get('apps/rules')).toBe('/rules/');
    expect(mappings.get('apps/start')).toBe('/start/');
    expect(mappings.get('apps/playtest')).toBe('/playtest/');
    expect(mappings.get('packages/game-data')).toBe('/game-data/');
  });

  it('keeps repository source boundaries non-public by default', () => {
    for (const root of ['.github', 'apps', 'docs', 'governance', 'legacy', 'media', 'packages', 'releases', 'rulebook', 'scripts', 'src', 'tests', 'workers']) {
      expect(contract.pages.sourceOnlyRepositoryRoots).toContain(root);
      expect(contract.pages.publishedDirectories).not.toContain(root);
    }
    expect(contract.pages.publishedDirectories).toContain('config');
  });

  it('keeps historical release binaries out of Pages while publishing current faction woodcuts', () => {
    expect(contract.pages.publishedDirectories).not.toContain('releases');
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json')).toBe('releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json');
    expect(files.get('/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md')).toBe('releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md');
    expect(files.get('/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf')).toBe('releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf');
    expect(contract.materializedFiles.some((entry: any) => /^\/releases\/(?!v0\.7\.1\/)/.test(entry.publicPath))).toBe(false);
    expect(pagesWorkflow).toContain("'images/woodcuts/factions/**'");
    expect(pagesWorkflow).not.toContain('"$site/images/woodcuts/factions"');
    expect(pagesWorkflow).toContain('test -s "$SITE_DIR/images/woodcuts/factions/$faction.png"');
  });

  it('archives the v0.6.3 long-card review source without changing its public URLs', () => {
    const activeCardDesignRoot = ['card', 'design'].join('-');
    const publicCardDesignRoot = `/${activeCardDesignRoot}`;
    expect(existsSync('legacy/card-design-v0.6.3/long-card-render.html')).toBe(true);
    expect(existsSync('legacy/card-design-v0.6.3/long-card-render.js')).toBe(true);
    expect(existsSync('legacy/card-design-v0.6.3/generated/long-card-review-catalog.js')).toBe(true);
    expect(existsSync(`${activeCardDesignRoot}/long-card-render.html`)).toBe(false);
    expect(existsSync(`${activeCardDesignRoot}/long-card-render.js`)).toBe(false);
    expect(existsSync(`${activeCardDesignRoot}/generated/v0.6.3/long-card-review-catalog.js`)).toBe(false);

    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get(`${publicCardDesignRoot}/long-card-render.html`)).toBe('legacy/card-design-v0.6.3/long-card-render.html');
    expect(files.get(`${publicCardDesignRoot}/long-card-render.js`)).toBe('legacy/card-design-v0.6.3/long-card-render.js');
    expect(files.get(`${publicCardDesignRoot}/generated/v0.6.3/long-card-review-catalog.js`)).toBe('legacy/card-design-v0.6.3/generated/long-card-review-catalog.js');
  });

  it('archives superseded card-design studies without changing their public URLs', () => {
    const activeCardDesignRoot = ['card', 'design'].join('-');
    const publicCardDesignRoot = `/${activeCardDesignRoot}`;
    const studies = [
      'deed-ornament-study.html',
      'deed-rule-font-study.html',
      'military-symbols.html',
      'capital-ledger-review.md',
      'tracker-card-design-notes.md',
    ];
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));

    for (const study of studies) {
      expect(existsSync(`legacy/card-design-studies/${study}`)).toBe(true);
      expect(existsSync(`${activeCardDesignRoot}/${study}`)).toBe(false);
      expect(files.get(`${publicCardDesignRoot}/${study}`)).toBe(`legacy/card-design-studies/${study}`);
    }
  });

  it('keeps the archived Browser Rulebook live as the v0.7.1 release bridge until v0.7.2 cutover', () => {
    expect(existsSync('apps/rulebook')).toBe(false);
    expect(existsSync('legacy/rulebook-browser/index.html')).toBe(true);
    expect(existsSync('legacy/public-compatibility/rulebook/index.html')).toBe(false);
    expect(existsSync('rulebook/index.html')).toBe(false);
    expect(existsSync('rulebook/player-facing/current-rulebook.md')).toBe(true);
    expect(existsSync('packages/rules/player-guide/player-guide.md')).toBe(true);
    expect(existsSync('packages/rules/comprehensive/comprehensive-rules.md')).toBe(true);

    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/rulebook/player-facing/current-rulebook.md')).toBe('rulebook/player-facing/current-rulebook.md');
    expect(files.get('/rulebook/player-guide/player-guide.md')).toBe('packages/rules/player-guide/player-guide.md');
    expect(files.get('/rulebook/sources/player-guide.md')).toBe('packages/rules/player-guide/player-guide.md');
    expect(files.get('/rulebook/sources/complete-rules.md')).toBe('packages/rules/comprehensive/comprehensive-rules.md');
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
    expect(pagesValidator).toContain('...(contract.materializedFiles || [])');
    expect(publicationWorkflow).toContain('/config/publication-boundary.json');
    expect(publicationWorkflow).toContain('/rulebook/player-facing/current-rulebook.md');
    expect(publicationWorkflow).toContain('/legacy/rulebook-browser/');
    expect(publicationWorkflow).toContain('/packages/rules/**');
    expect(publicationWorkflow).not.toContain('/rulebook/index.html');
    expect(publicationWorkflow).toContain('node scripts/validate-publication-boundary.mjs');
    expect(pagesWorkflow).toContain("'config/publication-boundary.json'");
    expect(pagesWorkflow).toContain("'legacy/rulebook-browser/**'");
    expect(pagesWorkflow).toContain('node scripts/stage-pages-publication.mjs "$site"');
    expect(pagesWorkflow).toContain('Stage current modular Rulebook booklets');
    expect(pagesWorkflow).toContain('$SITE_DIR/rulebook/booklets/v0.7.2');
    expect(pagesWorkflow).toContain('node scripts/validate-publication-boundary.mjs --site "$SITE_DIR"');
  });
});
