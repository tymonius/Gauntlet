import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const ttsRenderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const ttsRendererStyles = readFileSync('tts/supplemental-renderer/supplemental-renderer.css', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('materializes the TTS emblem as a literal image and validates its rendered source pixels', () => {
    expect(ttsRenderer).toContain("'universal-reference': '/images/Gauntlet.svg'");
    expect(ttsRenderer).toContain("const image = document.createElement('img')");
    expect(ttsRenderer).toContain("image.className = 'reference-faction-emblem-image'");
    expect(ttsRenderer).toContain('await waitForImage(image, `${record.id} emblem`)');
    expect(ttsRenderer).toContain('assertLeftCropHasPixels(image, `${record.id} emblem`)');
    expect(ttsRenderer).toContain('context.getImageData(0, 0, canvas.width, canvas.height).data');
    expect(ttsRenderer).toContain('await materializeReferenceEmblem(card, record)');
  });

  it('removes the competing TTS-only Universal mask override and lets the image slot own its presentation', () => {
    expect(ttsRendererStyles).not.toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem,\n.reference-card[data-component-id="universal-reference"] .reference-watermark');
    expect(ttsRendererStyles).not.toContain('mask-image: url("/images/Gauntlet-G.svg")');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem--image {');
    expect(universalStyles).toContain('background: none !important');
    expect(universalStyles).toContain('-webkit-mask: none !important');
    expect(universalStyles).toContain('mask: none !important');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem-image {');
    expect(universalStyles).toContain('max-width: none');
    expect(universalStyles).toContain('height: 100%');
  });

  it('keeps the browser-preview fallback and approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('background-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('background-position: left center');
    expect(universalStyles).toContain('background-size: auto 100%');
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
