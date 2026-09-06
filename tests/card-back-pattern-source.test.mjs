import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildCardBackPattern,
  normalizeFactionSymbol,
} from '../scripts/generate-card-back-pattern.mjs';

const factions = [
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
];
const sources = Object.fromEntries(factions.map(name => [
  name,
  readFileSync(`images/faction-symbols/${name}.svg`, 'utf8'),
]));
const committedPattern = readFileSync('card-design/card-back-pattern.svg', 'utf8');

describe('card-back faction-symbol pattern', () => {
  it('generates the committed card-back pattern from canonical faction-symbol assets', () => {
    expect(buildCardBackPattern(sources)).toBe(committedPattern);
  });

  it('normalizes source paint before symbols enter the shared pattern surface', () => {
    for (const name of factions) {
      const normalized = normalizeFactionSymbol(name, sources[name]);
      expect(normalized).not.toMatch(/<style\b/i);
      expect(normalized).not.toMatch(/\bclass\s*=/i);
      expect(normalized).not.toMatch(/\bfill\s*=/i);
      expect(normalized).not.toMatch(/\bstroke\s*=/i);
    }

    expect(sources.diplomats).not.toMatch(/fill\s*:\s*#fff/i);
    expect(sources.diplomats).not.toContain('cls-1');
  });

  it('keeps the exact approved 36 by 36 six-faction lattice monochrome', () => {
    expect((committedPattern.match(/<use\b/g) || [])).toHaveLength(1296);
    for (const name of factions) {
      expect((committedPattern.match(new RegExp(`href="#${name}"`, 'g')) || [])).toHaveLength(216);
    }
    expect(committedPattern).toContain('rotate(78)');
    expect(committedPattern).toContain('opacity="0.42"');
    expect(committedPattern).toContain('fill="#000"');
    expect(committedPattern).not.toMatch(/#fff|#ffffff|fill\s*:\s*white/i);
  });
});
