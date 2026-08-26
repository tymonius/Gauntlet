import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const renderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const emblem = readFileSync('tts/supplemental-renderer/gauntlet-emblem.js', 'utf8');
const emblemStyles = readFileSync('tts/supplemental-renderer/gauntlet-emblem.css', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('extracts the canonical G vector layer instead of cropping the complete wordmark image', () => {
    expect(renderer).toContain("import { materializeGauntletEmblem } from './gauntlet-emblem.js'");
    expect(renderer).toContain('await materializeGauntletEmblem(slot)');
    expect(emblem).not.toContain("document.createElement('img')");
    expect(emblem).toContain("const GAUNTLET_WORDMARK_SOURCE = '/images/Gauntlet.svg'");
    expect(emblem).toContain("sourceSvg.querySelectorAll(':scope > path')");
    expect(emblem).toContain("document.importNode(paths[0], true)");
    expect(emblem).toContain("svg.setAttribute('viewBox', GAUNTLET_G_VIEWBOX)");
    expect(emblem).not.toContain('drawImage');
    expect(emblem).not.toContain('<image');
  });

  it('lets the inline vector own the emblem slot without mask or background tricks', () => {
    expect(emblemStyles).toContain('background: none !important');
    expect(emblemStyles).toContain('-webkit-mask: none !important');
    expect(emblemStyles).toContain('mask: none !important');
    expect(emblemStyles).toContain('.reference-gauntlet-g');
    expect(emblemStyles).toContain('fill: currentColor');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
