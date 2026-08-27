import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const rulebook = read('rulebook/player-facing/current-rulebook.md');
const currentGame = JSON.parse(read('game-data/current-game.json'));

describe('Faction Feature Rulebook terminology', () => {
  it('keeps the maintained Rulebook aligned with the current component taxonomy', () => {
    expect(rulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(rulebook).toContain('A **Faction Feature** is a named rule, option, procedure, passive effect, or special mechanic shared by a faction.');
    expect(rulebook).toContain('A **Leader Ability** is supplied specifically by your chosen Leader.');
    expect(rulebook).toContain('**1 Action**, **No Action**, or **Automatic**');

    expect(rulebook).toContain('Names such as **Terms**, **Purge**, **Mission**, **Rite**, and **Surveillance**');
    expect(rulebook).toContain('Terms are a Diplomat Faction Feature used during Onset');

    expect(rulebook).toContain('Military **Orders** are the named Leader Ability for the General and Commandant.');
    expect(rulebook).toContain('**Terms** and **Leverage** are Diplomat Faction Features marked **No Action**.');
    expect(rulebook).toContain('at least one Action spent that turn must be spent on a Financier Faction Feature marked **1 Action**');
    expect(rulebook).toContain('**Hostile Takeover — Executive Leader Ability:**');
    expect(rulebook).toContain("**Line of Credit** is the Banker's Leader Ability.");

    expect(rulebook).toContain('**Surveillance** and **Interference** are shared Faction Features marked **No Action**.');
    expect(rulebook).toContain('**Fieldcraft** and **Mission Control** are Leader Abilities.');

    expect(rulebook).toContain('Mystics have the following Faction Features marked **1 Action · Denouement**:');
    expect(rulebook).toContain('**Invocation** and **Transmutation** are Faction Features marked **No Action**; **Convergence** is **Automatic**.');

    expect(rulebook).toContain('**Purge is an Inquisition Faction Feature marked 1 Action · Opening or Denouement · Once per turn.**');
    expect(rulebook).toContain("Final Judgment is the Grand Inquisitor's Leader Ability.");

    expect(rulebook).not.toMatch(/\bFaction Actions?\b/u);
    expect(rulebook).not.toMatch(/\bFaction Abilit(?:y|ies)\b/u);
    expect(rulebook).not.toMatch(/\bfaction procedure\b/iu);
    expect(rulebook).not.toMatch(/\bpending(?:-|\s+)battles?\b/iu);
  });

  it('takes Faction Feature profiles and structured Leader mechanics from current-game authority', () => {
    expect(currentGame.factionFeatureTaxonomy.factionFeature).toContain('shared by the faction');
    expect(currentGame.factionFeatureTaxonomy.leaderAbility).toContain('chosen Leader');
    expect(Object.keys(currentGame.factionFeatureTaxonomy.actionProfiles).sort()).toEqual([
      '1 Action',
      'Automatic',
      'No Action',
    ]);

    expect(currentGame.factionFeatures.diplomats).toEqual([
      { name: 'Terms', profile: 'No Action', timing: 'During Onset' },
      { name: 'Leverage', profile: 'No Action', timing: 'Before dice after refused Terms' },
    ]);
    expect(currentGame.factionFeatures.inquisition).toContainEqual({
      name: 'Purge',
      profile: '1 Action',
      timing: 'Opening or Denouement',
      limit: 'Once per turn',
    });

    expect(currentGame.leaders).toHaveLength(12);
    for (const leader of currentGame.leaders) {
      expect(leader.sections.length).toBeGreaterThan(0);
      expect(leader.sections.every((section: any) =>
        !Array.isArray(section)
        && typeof section.classification === 'string'
        && typeof section.name === 'string'
      )).toBe(true);
    }

    const general = currentGame.leaders.find((leader: any) => leader.id === 'general');
    expect(general.sections[1]).toMatchObject({
      classification: 'Leader Ability',
      name: 'Orders',
    });
    expect(general.sections[1].items).toContainEqual(expect.objectContaining({
      name: 'Onward',
      cost: '1 Command',
      descriptor: 'No Action · During Movement',
    }));
  });
});
