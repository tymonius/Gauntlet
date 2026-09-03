import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const redirectRuntime = readFileSync('card-design/legacy-face-redirect.mjs', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const docs = readFileSync('docs/rendering/unified-face-authority.md', 'utf8');

const legacyEntrypoints = [
  ['card-design/card-review-render.html', 'card'],
  ['card-design/territory-review-render.html', 'territory'],
  ['card-design/component-render.html', 'component'],
  ['card-design/card-back-render.html', 'back'],
];

const retiredImplementations = [
  'card-design/card-review-render.js',
  'card-design/territory-review-render.js',
  'card-design/component-render.js',
  'scripts/validate-unified-face-parity.mjs',
  '.github/workflows/validate-unified-face-parity.yml',
  'tests/unified-face-parity-stage4.test.ts',
];

describe('Stage 6 unified face renderer deletion', () => {
  it('removes the historical renderer implementations and migration-only parity harness', () => {
    for (const path of retiredImplementations) {
      expect(existsSync(path), path).toBe(false);
    }
  });

  it('keeps legacy public URLs only as thin redirects to canonical face identity', () => {
    for (const [path, route] of legacyEntrypoints) {
      const html = readFileSync(path, 'utf8');
      expect(html).toContain(`data-legacy-face-route="${route}"`);
      expect(html).toContain('/card-design/legacy-face-redirect.mjs');
      expect(html).not.toContain('card-review-render.js');
      expect(html).not.toContain('territory-review-render.js');
      expect(html).not.toContain('component-render.js');
      expect(html).not.toContain('card-back.js');
      expect(html).not.toContain('playable-card-renderer.css');
      expect(html).not.toContain('territory-card-renderer.css');
    }
  });

  it('translates old route parameters only at the compatibility edge', () => {
    expect(redirectRuntime).toContain("params.get('card')");
    expect(redirectRuntime).toContain("params.get('territory')");
    expect(redirectRuntime).toContain("params.get('kind')");
    expect(redirectRuntime).toContain("params.get('side')");
    expect(redirectRuntime).toContain("params.get('faction')");
    expect(redirectRuntime).toContain('resolveFace(game, faceId)');
    expect(redirectRuntime).toContain('/card-design/face-render.html?id=');
    expect(redirectRuntime).toContain('window.location.replace');
  });

  it('leaves renderer behavior behind the canonical face route only', () => {
    expect(faceRuntime).toContain("query.get('id')");
    expect(faceRuntime).not.toContain("query.get('kind')");
    expect(faceRuntime).not.toContain("query.get('side')");
    expect(faceRuntime).not.toContain("query.get('orientation')");
    expect(faceRuntime).not.toContain('legacy-face-redirect');
    expect(docs).toContain('Status: Stage 6 complete');
    expect(docs).toContain('No legacy rendering code');
  });
});
