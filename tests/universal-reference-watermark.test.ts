import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');

describe('Universal Reference watermark', () => {
  it('uses the stylized Gauntlet G instead of an unmasked square', () => {
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"] .reference-watermark {');
    expect(universalStyles).toContain('-webkit-mask-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('mask-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('-webkit-mask-position: left center');
    expect(universalStyles).toContain('mask-position: left center');
    expect(universalStyles).toContain('-webkit-mask-size: auto 100%');
    expect(universalStyles).toContain('mask-size: auto 100%');
  });
});
