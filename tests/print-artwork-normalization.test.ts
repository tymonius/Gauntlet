import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LONG_EDGE,
  SHORT_EDGE,
  targetDimensions,
} from '../card-design/print-artwork-normalizer.js';

const normalizer = readFileSync('card-design/print-artwork-normalizer.js', 'utf8');
const cardSurface = readFileSync('card-design/card-review-render.js', 'utf8');
const renderer = readFileSync('tts/renderer/renderer.js', 'utf8');
const printTransform = readFileSync('deckbuilder/production-print.js', 'utf8');
const deployPages = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

describe('printer-friendly playable artwork normalization', () => {
  it('targets roughly a 400 dpi art payload without upscaling sources', () => {
    expect(SHORT_EDGE).toBe(960);
    expect(LONG_EDGE).toBe(1800);
    expect(targetDimensions(2048, 3072)).toEqual({ width: 960, height: 1440 });
    expect(targetDimensions(3072, 2048)).toEqual({ width: 1440, height: 960 });
    expect(targetDimensions(800, 1200)).toEqual({ width: 800, height: 1200 });
    expect(targetDimensions(4000, 1000)).toEqual({ width: 1800, height: 450 });
  });

  it('resolves canonical crop first, then swaps only the raster payload to lossless sRGB PNG', () => {
    expect(printTransform).toContain('printArtwork=normalized');
    expect(cardSurface).toContain('installPrintArtworkFinalizer()');
    expect(cardSurface).toContain('await resolveFirstArtwork(card, faction, imageExists)');
    expect(renderer).toContain("GauntletArtworkCrop?.apply");
    expect(renderer).toContain('window.GAUNTLET_RENDER_FINALIZE');
    expect(normalizer).toContain('cropSnapshot(artImage)');
    expect(normalizer).toContain('restoreCrop(artImage, snapshot)');
    expect(normalizer).toContain("'image/png'");
    expect(normalizer).toContain("colorSpace: 'srgb'");
    expect(normalizer).toContain('image.src = source');
    expect(normalizer).toContain('__gauntletPrintArtworkCache');
  });

  it('does not add a second tracked or Pages-hosted card-art source', () => {
    expect(deployPages).not.toContain('images/print-artwork');
    expect(deployPages).not.toContain('print:artwork');
    expect(cardSurface).not.toContain('/images/print-artwork/cards/');
  });
});
