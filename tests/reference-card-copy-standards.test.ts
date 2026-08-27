import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;
const standards = readFileSync('card-design/reference-copy/v0.7.0/README.md', 'utf8');
const references = [
  ...(contract.sharedComponents || []),
  ...(contract.components || []),
].filter((component: any) => component.family === 'reference-card' && component.copyMode === 'bespoke');

const copies = new Map(references.map((component: any) => [component.id, readFileSync(component.source, 'utf8')]));

describe('reference-card copy standards', () => {
  it('documents one copy standard for universal and faction references', () => {
    expect(standards).toContain('These standards apply to **every** bespoke reference card, faction-specific and universal');
    expect(standards).toContain('Do not hedge it with `normal`, `normally`, or similar wording');
    expect(standards).toContain('Prefer telling the player what happens over listing things that do not happen.');
    expect(standards).toContain('Include a negative restriction or exclusion only when it resolves a plausible rules ambiguity');
    expect(standards).toContain('Do not repeat unchanged baseline behavior merely to say a faction feature leaves it unchanged.');
  });

  it('does not hedge any current bespoke reference rule as normal or normally', () => {
    expect(references).toHaveLength(8);
    for (const [id, copy] of copies) {
      expect(copy, id).not.toMatch(/\bnormal(?:ly)?\b/i);
    }
  });

  it('keeps removed negative-restatement anti-patterns out of current reference copy', () => {
    const antiPatterns = [
      'Opposing Gambits already go to the Graveyard',
      'This uses **no Action**.',
      'This never permits two Actions in one phase.',
      '**no more than once per turn**',
      'does not consume the once-per-turn Action-Purge',
      'does not activate the two-phase Action permission',
      'Satisfying the requirement does not complete it automatically.',
      'Aborting is not failure.',
      '**not a normal Mission**',
      'grants **no Mission reward**',
      'Revision creates no new information window.',
      'Direct Interference does not use Surveillance',
      'none of its printed effects apply.',
      'neither completes nor interrupts the Ritual',
      'without another instruction',
    ];

    for (const [id, copy] of copies) {
      for (const phrase of antiPatterns) expect(copy, `${id}: ${phrase}`).not.toContain(phrase);
    }
  });

  it('retains negative wording where it prevents a real interaction mistake', () => {
    expect(copies.get('diplomats-reference')).toContain('Staked Influence cannot be spent as Leverage.');
    expect(copies.get('universal-reference')).toContain('**Occupation** alone does not change control.');
    expect(copies.get('intelligence-operations-reference')).toContain('without another Surveillance, Interference, reveal, or response window.');
    expect(copies.get('inquisition-purge-reference')).toContain('**Purge is a Faction Feature, not a card play.**');
  });
});
