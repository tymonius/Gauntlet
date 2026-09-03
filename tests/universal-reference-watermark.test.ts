import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');
const legacyTtsAlias = readFileSync('tts/supplemental-renderer/index.html', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('uses the same canonical Gauntlet wordmark asset in every rendered surface', () => {
    expect(universalStyles).toContain('background-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('background-position: left center');
    expect(universalStyles).toContain('background-size: auto 100%');
    expect(universalStyles).toContain('mask-image: url("../images/Gauntlet.svg")');
    expect(componentRenderer).toContain('validateReferenceVisualContract(card)');
    expect(legacyTtsAlias).toContain('/card-design/component-render.html');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
