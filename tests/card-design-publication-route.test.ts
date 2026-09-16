import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const materializer = readFileSync('scripts/materialize-public-route-compatibility.mjs', 'utf8');
const stager = readFileSync('scripts/stage-pages-publication.mjs', 'utf8');

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
    expect(materializer).toContain('return source !== destination;');
  });

  it('materializes whole routes before file overrides during off-tree Pages staging', () => {
    const routesIndex = stager.indexOf('materializePublicRoutes');
    const filesIndex = stager.indexOf('materializePublicFiles');
    expect(routesIndex).toBeGreaterThan(-1);
    expect(filesIndex).toBeGreaterThan(routesIndex);
  });
});
