import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const rulebook = () => read(
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md',
);
const factionGuide = () => read(
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
);
const firstGameGuide = () => read(
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_First_Game_Guide.md',
);
const returningGuide = () => read(
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Returning_Player_Changes.md',
);

describe('published v0.6.2 rulebook integrity', () => {
  test('uses the integrated chapter and Part references', () => {
    const text = rulebook();
    expect(text).toContain('construction requirements for a custom Deck appear in Chapter 11');
    expect(text).toContain('Faction packages and their starting states appear in Part IV');
    expect(text).toContain("Part IV explains each faction's exact arrangement");
    expect(text).toContain('Chapter 9 explains how control changes');

    expect(text).not.toContain('construction requirements for a custom Deck appear in Chapter 10');
    expect(text).not.toContain('Faction packages and their starting states appear in Part III');
    expect(text).not.toContain("Part III explains each faction's exact arrangement");
    expect(text).not.toContain('Chapter 8 explains how control changes');
  });

  test('retains the published shared-rule spine', () => {
    const text = rulebook();
    for (const marker of [
      'Capture → Draw → Opening → Movement → Denouement → Cleanup',
      'Pending battle → Terms → Onset → Gambits',
      'Defensive Edge',
      'Tiebreak Roll',
      'Front Line',
      'Begin a Rite — Denouement',
    ]) {
      expect(text).toContain(marker);
    }
  });

  test('removes candidate, implementation-wave, and historical dependency language from player documents', () => {
    for (const text of [rulebook(), factionGuide(), firstGameGuide()]) {
      expect(text).not.toContain('under the shared candidate');
      expect(text).not.toContain('fixed for later executable implementation');
      expect(text).not.toContain('Source-level interaction requirements');
      expect(text).not.toContain('Compatibility Audit');
      expect(text).not.toContain('Wave C test matrix');
      expect(text).not.toContain('until Wave D propagates');
      expect(text).not.toContain('current play until v0.6.2 is released');
    }

    expect(rulebook()).toContain('under the positioning rules in this rulebook');
    expect(factionGuide()).toContain('# 24. Consolidated interaction rules');
    expect(firstGameGuide()).toContain('The published Deckbuilder and `/start/` flow use this release');
    expect(firstGameGuide()).toContain('The Official Rulebook and specific component text govern play.');
  });

  test('states the retained Peace Treaty threshold without presenting a later change as adopted', () => {
    const text = returningGuide();
    expect(text).toContain('The Peace Treaty still requires five different ratified Proposals in v0.6.2.');
    expect(text).toContain('Any later threshold change remains unresolved.');
    expect(text).not.toContain('The Peace Treaty threshold remains unresolved unless separately adopted before publication.');
  });
});
