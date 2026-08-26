import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const renderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const emblem = readFileSync('tts/supplemental-renderer/gauntlet-emblem.js', 'utf8');
const emblemStyles = readFileSync('tts/supplemental-renderer/gauntlet-emblem.css', 'utf8');
const canonicalLayer = readFileSync('assets/wordmark/gauntlet-wordmark-layer-1.svg', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('renders the canonical isolated G vector instead of cropping the complete wordmark', () => {
    expect(renderer).toContain("import { materializeGauntletEmblem } from './gauntlet-emblem.js'");
    expect(renderer).toContain('await materializeGauntletEmblem(slot)');
    expect(renderer).not.toContain('/images/Gauntlet.svg');
    expect(emblem).toContain("'/assets/wordmark/gauntlet-wordmark-layer-1.svg'");
    expect(emblem).toContain("sourceSvg.setAttribute('viewBox', GAUNTLET_G_VIEWBOX)");
    expect(emblem).toContain("paths.length !== 1");
    expect(emblem).not.toContain("Gauntlet.svg");
    expect(canonicalLayer.match(/<path\b/g)).toHaveLength(1);
    expect(canonicalLayer).not.toMatch(/<(?:image|use)\b/);
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
