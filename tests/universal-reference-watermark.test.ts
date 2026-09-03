import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const referenceTemplate = readFileSync('card-design/face-templates/reference.mjs', 'utf8');
const legacyTtsAlias = readFileSync('tts/supplemental-renderer/index.html', 'utf8');

describe('Universal Reference neutral emblem', () => {
  it('uses the same canonical Gauntlet wordmark asset in the unified reference face', () => {
    expect(universalStyles).toContain('background-image: url("../images/Gauntlet.svg")');
    expect(universalStyles).toContain('background-position: left center');
    expect(universalStyles).toContain('background-size: auto 100%');
    expect(universalStyles).toContain('mask-image: url("../images/Gauntlet.svg")');
    expect(referenceRenderer).toContain('validateReferenceVisualContract');
    expect(referenceTemplate).toContain('referenceCardMarkup(record, spec.side');
    expect(legacyTtsAlias).toContain('/card-design/face-render.html');
  });

  it('keeps the approved neutral ivory border treatment', () => {
    expect(universalStyles).toContain('--reference-border: #eee7d5');
  });
});
