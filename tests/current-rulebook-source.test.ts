import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const releasedChapter11 = read('rulebook/player-facing/chapter-11.md');
const browserApp = read('rulebook/app.js');

describe('Maintained current Rulebook source', () => {
  it('is the direct current-development player-facing authority', () => {
    expect(currentRulebook).toMatch(/\*\*Version 0\.7\.1(?: Candidate)?\*\*/);
    expect(currentRulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(currentRulebook).toContain('## Card anatomy');
    expect(currentRulebook).toContain('Onset is the first phase of the battle sequence.');
    expect(currentRulebook).toContain('choose exactly three different Rites from the six-Rite pool');
    expect(currentRulebook).toContain('### Rite of Shattering');
    expect(currentRulebook).toContain('### Rite of Consecration');
    expect(currentRulebook).toContain('### Rite of Equivalence');
    expect(currentRulebook).toContain('Ratify six different Proposals');
    expect(currentRulebook).toContain('if six different Proposals are ratified');
    expect(currentRulebook).toContain("spend Influence for Leverage to increase the Diplomat's battle total");
    expect(currentRulebook).toContain('| Battle Total bonus | Total Influence cost |');
    expect(currentRulebook).not.toContain('Ratify five different Proposals');
    expect(currentRulebook).not.toContain('if five different Proposals are ratified');
    expect(browserApp).toContain("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';");
    expect(browserApp).not.toContain("import { applyReleaseCandidateRulebook } from './release-candidate.js';");
    expect(browserApp).not.toContain('applyReleaseCandidateRulebook(releasedMarkdown, currentGame)');
  });

  it('contains no retired current-development terminology', () => {
    expect(currentRulebook).not.toMatch(/\bpending\b/i);
    expect(currentRulebook).not.toMatch(/\bFaction Actions?\b/i);
    expect(currentRulebook).not.toMatch(/\bFaction Abilit(?:y|ies)\b/i);
    expect(currentRulebook).not.toMatch(/\bfaction procedure\b/i);
  });

  it('does not describe the maintained source as a runtime layer over v0.6.3', () => {
    expect(currentRulebook).not.toContain('This view layers the current-development rules over the published v0.6.3 Rulebook.');
  });

  it('does not retain one-time authority-migration tooling as production source', () => {
    expect(existsSync('.github/workflows/patch-current-rulebook-source.yml')).toBe(false);
    expect(existsSync('scripts/render-current-card-anatomy.mjs')).toBe(false);
  });

  it('leaves the immutable v0.6.3 player-facing Chapter 11 on its released terminology', () => {
    expect(releasedChapter11).toContain('Effect-granted movement may create a pending battle and may force the opponent to make a Last Stand');
    expect(releasedChapter11).toContain('neither player wins or loses that battle; withdrawal is not a loss;');
  });
});
