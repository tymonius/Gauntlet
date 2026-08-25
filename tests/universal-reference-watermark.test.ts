import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('crops the stylized G directly from the self-contained canonical wordmark', () => {
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-faction-emblem {');
    expect(universalStyles).toContain('-webkit-mask-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('mask-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('-webkit-mask-position: left center');
    expect(universalStyles).toContain('-webkit-mask-size: auto 100%');
    expect(universalStyles).not.toContain('mask-image: url("../images/Gauntlet-G.svg")');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
