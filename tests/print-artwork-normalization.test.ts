import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  JPEG_QUALITY,
  LONG_EDGE,
  SHORT_EDGE,
  targetDimensions,
} from '../scripts/generate-print-artwork.mjs';

const renderer = readFileSync('card-design/card-review-render.js', 'utf8');
const printTransform = readFileSync('deckbuilder/production-print.js', 'utf8');
const deployPages = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

describe('printer-friendly playable artwork derivatives', () => {
  it('targets roughly a 400 dpi card-art window without upscaling sources', () => {
    expect(SHORT_EDGE).toBe(960);
    expect(LONG_EDGE).toBe(1800);
    expect(JPEG_QUALITY).toBe(95);
    expect(targetDimensions(2048, 3072)).toEqual({ width: 960, height: 1440 });
    expect(targetDimensions(3072, 2048)).toEqual({ width: 1440, height: 960 });
    expect(targetDimensions(800, 1200)).toEqual({ width: 800, height: 1200 });
    expect(targetDimensions(4000, 1000)).toEqual({ width: 1800, height: 450 });
  });

  it('changes only the artwork source for Deckbuilder print renders', () => {
    expect(printTransform).toContain('printArtwork=normalized');
    expect(renderer).toContain("normalizedPrintArtwork");
    expect(renderer).toContain("/images/print-artwork/cards/");
    expect(renderer).toContain("artwork = normalizedArtwork");
    expect(renderer).toContain("artwork = await resolveFirstArtwork(card, faction, imageExists)");
    expect(renderer).not.toContain('canvas');
    expect(renderer).not.toContain('toBlob');
  });

  it('publishes generated derivatives as Pages build outputs rather than tracked design sources', () => {
    expect(deployPages).toContain('npm run print:artwork -- --output="$SITE_DIR/images/print-artwork"');
    expect(deployPages).toContain('PRINT_ART_MANIFEST="$SITE_DIR/images/print-artwork/manifest.json"');
  });
});
