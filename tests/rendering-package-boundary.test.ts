import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publication = JSON.parse(readFileSync('config/publication-boundary.json', 'utf8'));
const architecture = JSON.parse(readFileSync('config/repository-architecture.json', 'utf8'));
const materializer = readFileSync('scripts/materialize-public-route-compatibility.mjs', 'utf8');
const cardAuthorityWorkflow = readFileSync('.github/workflows/card-authority.yml', 'utf8');
const ttsWorkflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const mediaWorkflow = readFileSync('.github/workflows/generate-card-media-assets.yml', 'utf8');

describe('shared rendering package boundary', () => {
  it('owns the environment-neutral face catalog and production surface under packages/rendering', () => {
    expect(existsSync('packages/rendering/face-authority.mjs')).toBe(true);
    expect(existsSync('packages/rendering/production-surface.mjs')).toBe(true);

    const faceAuthority = readFileSync('packages/rendering/face-authority.mjs', 'utf8');
    expect(faceAuthority).toContain("from './production-surface.mjs'");
    expect(faceAuthority).toContain('export const FACE_TEMPLATES');
    expect(faceAuthority).toContain('export function buildFaceCatalog');
  });

  it('keeps the established card-design module paths as thin repository-root adapters', () => {
    expect(readFileSync('card-design/face-authority.mjs', 'utf8')).toBe(
      "export * from '../packages/rendering/face-authority.mjs';\n",
    );
    expect(readFileSync('card-design/production-surface.mjs', 'utf8')).toBe(
      "export * from '../packages/rendering/production-surface.mjs';\n",
    );
  });

  it('materializes package authority onto the stable public browser module URLs', () => {
    const files = new Map(publication.materializedFiles.map((entry: any) => [entry.publicPath, entry.source]));
    expect(files.get('/card-design/face-authority.mjs')).toBe('packages/rendering/face-authority.mjs');
    expect(files.get('/card-design/production-surface.mjs')).toBe('packages/rendering/production-surface.mjs');

    expect(materializer).toContain('if (!inPlace) return true;');
    expect(materializer).toContain('if (fs.existsSync(destination)) return false;');
  });

  it('includes packages/rendering in every rendering CI checkout or scope that needs it', () => {
    expect(cardAuthorityWorkflow).toContain("under('packages/rendering/')");
    expect(ttsWorkflow).toContain("'packages/rendering/**'");
    expect(ttsWorkflow).toContain('            packages/rendering\n');
    expect(mediaWorkflow).toContain('            packages/rendering\n');
  });

  it('records package ownership in the machine architecture contract', () => {
    expect(architecture.root_directories.packages.note).toContain('packages/rendering/');
    expect(architecture.root_directories['card-design'].note).toContain('packages/rendering/');
    expect(architecture.root_directories['card-design'].role).toBe('production_tooling');
    expect(architecture.root_directories.packages.role).toBe('authority');
  });
});
