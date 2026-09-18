import { readFileSync } from 'node:fs';
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
