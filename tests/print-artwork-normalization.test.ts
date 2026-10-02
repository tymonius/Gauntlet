import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const faceRuntime = readFileSync('card-design/face-render.mjs', 'utf8');
const faceSpec = readFileSync('card-design/face-spec.mjs', 'utf8');
const printTransform = readFileSync('apps/deckbuilder/production-print.js', 'utf8');
const deployPages = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

describe('printer-friendly playable artwork path', () => {
  it('prints canonical FaceSpec artwork instead of invoking a print-only renderer mode', () => {
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
