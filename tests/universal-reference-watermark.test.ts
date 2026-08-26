import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('paints the stylized G directly from the canonical wordmark instead of relying on an SVG mask', () => {
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem {');
    expect(universalStyles).toContain('background-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('background-position: left center');
    expect(universalStyles).toContain('background-size: auto 100%');
    expect(universalStyles).toContain('-webkit-mask-image: none');
    expect(universalStyles).toContain('mask-image: none');
    expect(universalStyles).not.toContain('background-image: url("../images/Gauntlet-G.svg")');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
