import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const materializer = readFileSync('scripts/materialize-public-route-compatibility.mjs', 'utf8');
const stager = readFileSync('scripts/stage-pages-publication.mjs', 'utf8');
const localServer = readFileSync('scripts/card-design-server.mjs', 'utf8');

describe('card-design publication route boundary', () => {
  it('decouples the repository source directory from the stable public route', () => {
    expect(contract.pages.publishedDirectories).not.toContain('card-design');
    expect(contract.materializedRoutes).toContainEqual({
      source: 'card-design',
      publicPath: '/card-design/',
      kind: 'production-tooling',
      manageIndexRoutes: false,
    });
  });

  it('materializes extracted artwork authoring tools at their stable public card-design URLs', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(contract.pages.sourceOnlyRepositoryRoots).toContain('card-design');
    expect(contract.pages.sourceOnlyRepositoryRoots).toContain('tools');
    for (const name of [
      'artwork-authoring-client.js',
      'artwork-batch-publish-control.js',
      'artwork-compositor-targets.js',
      'artwork-compositor.css',
      'artwork-compositor.js',
      'artwork-crop.js',
      'artwork-publish-fetch-recovery.js',
    ]) {
      expect(files.get(`/card-design/${name}`)).toBe(`tools/card-design/artwork-authoring/${name}`);
      expect(existsSync(`tools/card-design/artwork-authoring/${name}`)).toBe(true);
      expect(existsSync(`card-design/${name}`)).toBe(false);
    }
  });

  it('materializes extracted review tooling at stable public card-design URLs', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    for (const name of [
      'card-review.js',
      'card-review.css',
      'card-inspector.js',
      'card-inspector.css',
      'catalog-filter.js',
      'current-card-catalog.js',
      'card-catalog-shell.css',
      'proposal-card.js',
      'card-back.js',
      'capital-ledger-preview.html',
      'ledger-print.css',
    ]) {
      expect(files.get(`/card-design/${name}`)).toBe(`tools/card-design/review/${name}`);
      expect(existsSync(`tools/card-design/review/${name}`)).toBe(true);
      expect(existsSync(`card-design/${name}`)).toBe(false);
    }
  });

  it('materializes archived design studies at their stable public card-design URLs', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/card-design/faction-specimens.html')).toBe('legacy/card-design-studies/faction-specimens-v0.6.1.html');
    expect(files.get('/card-design/territories/index.html')).toBe('legacy/v0.6.4-candidate/card-design/territories/index.html');
    expect(files.get('/card-design/typography/index.html')).toBe('legacy/card-design-studies/typography/index.html');
    expect(files.get('/card-design/typography/interface-comparison.html')).toBe('legacy/card-design-studies/typography/interface-comparison.html');
    expect(files.get('/card-design/typography/typography.css')).toBe('legacy/card-design-studies/typography/typography.css');
    expect(files.get('/card-design/typography/interface-comparison.css')).toBe('legacy/card-design-studies/typography/interface-comparison.css');
    expect(files.get('/card-design/typography/card-print-review.css')).toBe('legacy/card-design-studies/typography/card-print-review.css');
  });

  it('preserves the archived v0.6.3 playable renderer at its historical public URL', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/card-design/playable-card-renderer.js')).toBe('legacy/card-design-v0.6.3/playable-card-renderer.js');
    expect(existsSync('legacy/card-design-v0.6.3/playable-card-renderer.js')).toBe(true);
  });

  it('archives compatibility-only card-design routes behind stable public URLs', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    for (const name of [
      'card-back-render.html',
      'card-print-render.html',
      'card-review-render.html',
      'component-print-render.html',
      'component-render.html',
      'territory-print-render.html',
      'territory-review-render.html',
      'leaders.html',
      'legacy-face-redirect.mjs',
    ]) {
      expect(files.get(`/card-design/${name}`)).toBe(`legacy/public-compatibility/card-design/${name}`);
      expect(existsSync(`legacy/public-compatibility/card-design/${name}`)).toBe(true);
      expect(existsSync(`card-design/${name}`)).toBe(false);
    }
  });

  it('preserves package-owned rendering modules at their stable public card-design URLs', () => {
    const files = new Map(contract.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/card-design/face-authority.mjs')).toBe('packages/rendering/face-authority.mjs');
    expect(files.get('/card-design/production-surface.mjs')).toBe('packages/rendering/production-surface.mjs');
  });

  it('skips same-path route materialization only for in-place compatibility runs', () => {
    expect(materializer).toContain('if (!inPlace) return true;');
    expect(materializer).toContain('publicPathTarget(destinationRoot, route.publicPath)');
    expect(materializer).toContain('if (source === destination) return false;');
  });

  it('materializes whole routes before file overrides during off-tree Pages staging', () => {
    const routesIndex = stager.indexOf('materializePublicRoutes({');
    const filesIndex = stager.indexOf('materializePublicFiles({');
    expect(routesIndex).toBeGreaterThan(-1);
    expect(filesIndex).toBeGreaterThan(routesIndex);
  });

  it('serves local card-design URLs through the same publication contract', () => {
    expect(localServer).toContain("loadPublicationBoundary, sourcePathForPublicPath");
    expect(localServer).toContain('const PUBLICATION_CONTRACT = loadPublicationBoundary(ROOT);');
    expect(localServer).toContain("const publicPath = url.pathname === '/' ? '/card-design/' : url.pathname;");
    expect(localServer).toContain('sourcePathForPublicPath(PUBLICATION_CONTRACT, publicPath)');
    expect(localServer).toContain("join(ROOT, 'packages', 'game-data', 'current-game.json')");
    expect(localServer).toContain('packages/game-data/current-game.json#artDirection');
  });
});
