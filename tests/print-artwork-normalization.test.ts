import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LONG_EDGE,
  SHORT_EDGE,
  targetDimensions,
} from '../card-design/print-artwork-normalizer.js';

const normalizer = readFileSync('card-design/print-artwork-normalizer.js', 'utf8');
const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const printTransform = readFileSync('deckbuilder/production-print.js', 'utf8');
const deployPages = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

describe('printer-friendly playable artwork normalization', () => {
  it('retains the lossless raster helper without upscaling sources', () => {
    expect(SHORT_EDGE).toBe(960);
    expect(LONG_EDGE).toBe(1800);
    expect(targetDimensions(2048, 3072)).toEqual({ width: 960, height: 1440 });
    expect(targetDimensions(3072, 2048)).toEqual({ width: 1440, height: 960 });
    expect(targetDimensions(800, 1200)).toEqual({ width: 800, height: 1200 });
    expect(targetDimensions(4000, 1000)).toEqual({ width: 1800, height: 450 });
    expect(normalizer).toContain("'image/png'");
    expect(normalizer).toContain("colorSpace: 'srgb'");
  });

  it('prints the canonical FaceSpec artwork instead of invoking a print-only renderer mode', () => {
    expect(printTransform).toContain('/card-design/face-render.html?id=');
    expect(printTransform).not.toContain('printArtwork=normalized');
    expect(printTransform).not.toContain('fit=production');
    expect(faceRuntime).toContain('await applyCanonicalArtwork(spec, result)');
    expect(faceRuntime).toContain('window.GauntletArtworkCrop.apply');
    expect(faceSpec).toContain('composition: artDirectionSpec(game, card.id)');
  });

  it('does not add a second tracked or Pages-hosted card-art source', () => {
    expect(deployPages).not.toContain('images/print-artwork');
    expect(deployPages).not.toContain('print:artwork');
    expect(faceRuntime).not.toContain('/images/print-artwork/cards/');
  });
});
