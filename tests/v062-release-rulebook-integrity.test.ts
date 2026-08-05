import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const rulebook = () => read(
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
);
const returningGuide = () => read(
  'releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md',
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

  test('states the retained Peace Treaty threshold without presenting a later change as adopted', () => {
    const text = returningGuide();
    expect(text).toContain('The Peace Treaty still requires five different ratified Proposals in v0.6.2.');
    expect(text).toContain('Any later threshold change remains unresolved.');
    expect(text).not.toContain('The Peace Treaty threshold remains unresolved unless separately adopted before publication.');
  });
});
