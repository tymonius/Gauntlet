import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const gAsset = readFileSync('images/Gauntlet-G.svg', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('uses a dedicated stylized G asset rather than relying on CSS clipping of the full wordmark', () => {
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem {');
    expect(universalStyles).toContain('-webkit-mask-image: url("../images/Gauntlet-G.svg")');
    expect(universalStyles).toContain('mask-image: url("../images/Gauntlet-G.svg")');
    expect(universalStyles).not.toContain('mask-image: url("../images/Gauntlet.svg")');
    expect(gAsset).toContain('viewBox="0 0 430 493.58"');
    expect(gAsset).toContain('href="Gauntlet.svg"');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
