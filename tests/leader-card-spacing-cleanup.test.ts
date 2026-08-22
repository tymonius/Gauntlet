import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const leaderStyles = readFileSync('card-design/leader-card-copy.css', 'utf8');
const ruleColumnStyles = readFileSync('card-design/card-rule-columns.css', 'utf8');
const taxonomy = readFileSync('card-design/faction-feature-taxonomy.md', 'utf8');

describe('Leader card spacing cleanup', () => {
  it('reclaims rules width with the compact content-aware Leader label track', () => {
    expect(ruleColumnStyles).toContain('.leader-card {');
    expect(ruleColumnStyles).toContain('--rule-label-max: 0.54in');
    expect(ruleColumnStyles).toContain('--rule-column-gap: 0.018in');
    expect(leaderStyles).toContain('grid-template-columns: 0.54in minmax(0, 1fr)');
    expect(leaderStyles).toContain('column-gap: 0.018in');
    expect(leaderStyles).not.toContain('grid-template-columns: 0.76in minmax(0, 1fr)');
    expect(leaderStyles).not.toContain('grid-template-columns: 0.66in minmax(0, 1fr)');
  });

  it('uses whitespace instead of horizontal divider rules on Leader cards', () => {
    expect(leaderStyles).not.toContain('border-top:');
    expect(leaderStyles).not.toContain('border-bottom:');
    expect(taxonomy).toContain('Use whitespace, not horizontal divider rules');
    expect(taxonomy).toContain('content-aware and deliberately compact');
  });
});
