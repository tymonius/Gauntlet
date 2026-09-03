import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const rulebook = read('rulebook/player-facing/current-rulebook.md');
const currentGame = JSON.parse(read('game-data/current-game.json'));

describe('Faction Feature Rulebook terminology', () => {
  const chapterHeadings: Record<string, string> = {
    military: '# 13. Military',
    diplomats: '# 14. Diplomats',
    financiers: '# 15. Financiers',
    intelligence: '# 16. Intelligence',
    mystics: '# 17. Mystics',
    inquisition: '# 18. Inquisition',
  };

  function factionFeatureSection(faction: string) {
    const chapter = chapterHeadings[faction];
    const chapterStart = rulebook.indexOf(chapter);
    expect(chapterStart).toBeGreaterThanOrEqual(0);
    const featureStart = rulebook.indexOf('## Faction Features', chapterStart);
    const componentsStart = rulebook.indexOf('## Components and setup', featureStart);
    expect(featureStart).toBeGreaterThan(chapterStart);
    expect(componentsStart).toBeGreaterThan(featureStart);
    return rulebook.slice(featureStart, componentsStart);
  }

  it('lists every structured shared Faction Feature in its faction chapter using one consistent descriptor format', () => {
    expect(rulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(rulebook).toContain('A **Faction Feature** is a named faction-specific mechanic shared by a faction.');
    expect(rulebook).toContain('A Faction Feature may have several uses, modes, or procedures');
    expect(rulebook).toContain('A **Leader Ability** is supplied specifically by your chosen Leader.');
    expect(rulebook).toContain('**1 Action**, **No Action**, or **Automatic**');

    for (const [faction, features] of Object.entries(currentGame.factionFeatures) as [string, any[]][]) {
      const section = factionFeatureSection(faction);
      if (!features.length) {
        expect(section).toContain('- **None.**');
        continue;
      }

      for (const feature of features) {
        const details = [
          feature.profile,
          feature.timing,
          feature.cost,
          feature.limit,
        ].filter(Boolean).join(' · ');
        expect(section).toContain(`- **${feature.name} — ${details}.`);
      }
    }

    const military = factionFeatureSection('military');
    expect(military).toContain("**Orders — No Action · At each Order's stated timing · Listed Command.**");
    expect(military).toContain('**Orders** is the shared Military Faction Feature; each individual Order is a Leader Ability.');

    const financiers = factionFeatureSection('financiers');
    expect(financiers).toContain('**Deeds — 1 Action · Denouement · Current Deed cost.**');
    expect(financiers).toContain('**Subsidize — No Action · Before dice · Triangular Capital cost.** Spend Capital to increase your battle total.');
    expect(financiers).toContain('**Financial Capacity — No Action · After Capture.**');
    expect(financiers).toContain('**Income — Automatic · After Capture.**');
    expect(financiers).toContain('**Hostile Takeover** is the Executive\'s Leader Ability.');
    expect(financiers).toContain('**Line of Credit** is the Banker\'s Leader Ability.');

    const intelligence = factionFeatureSection('intelligence');
    expect(intelligence).toContain('**Missions — 1 Action · Denouement · Abort cost: Intel equal to Mission value.**');
    expect(intelligence).toContain('**Special Operations — 1 Action · Denouement · Completion cost: Territories in the Gauntlet minus card value, minimum 1 Intel.**');
    expect(intelligence).toContain('**Surveillance — No Action · After opposing Gambit or Tactic choice · 1 Intel per revealed card · Once per battle at each stage.**');
    expect(intelligence).toContain('The Gambit and Tactic opportunities are separate.');
    expect(intelligence).toContain('**Interference — No Action · Immediately after reveal or face-up opposing choice · 2 Intel per removed card.**');
    expect(intelligence).not.toContain('**Gambit Surveillance —');
    expect(intelligence).not.toContain('**Tactic Surveillance —');
    expect(intelligence).not.toContain('**Direct Interference —');

    const mystics = factionFeatureSection('mystics');
    expect(mystics).toContain('**Rites — 1 Action · Denouement · Printed Begin cost.**');
    expect(mystics).toContain('**Invocation — No Action · After applying an Arcane card effect · Once per turn.**');
    expect(mystics).toContain('**Transmutation — No Action · Before dice · Put 1 card from Hand in Graveyard · Once per turn.**');
    expect(mystics).toContain('**Ritual of Ascension — 1 Action · Denouement after 3 Rites · Bind 3 Arcane cards.**');
    expect(mystics).toContain('**Convergence — Automatic · During a Ritual battle you initiated.**');

    const inquisition = factionFeatureSection('inquisition');
    expect(inquisition).toContain('**Conviction — Automatic · First qualifying Aftermath each turn.**');
    expect(inquisition).toContain('**Condemnation — Automatic · Aftermath.**');
    expect(inquisition).toContain('**Blasphemy — Automatic · Opposing Arcane Action or reveal.**');
    expect(inquisition).toContain('**Purification — Automatic · Opponent\'s start-of-turn Draw.**');

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

    expect(currentGame.factionFeatures.military).toEqual([
      { name: 'Orders', profile: 'No Action', timing: "At each Order's stated timing", cost: 'Listed Command' },
    ]);
    expect(currentGame.factionFeatures.diplomats).toEqual([
      { name: 'Terms', profile: 'No Action', timing: 'During Onset' },
      { name: 'Leverage', profile: 'No Action', timing: 'Before dice after refused Terms', cost: 'Triangular Influence cost' },
    ]);
    expect(currentGame.factionFeatures.intelligence.map((feature: any) => feature.name)).toEqual([
      'Missions',
      'Special Operations',
      'Surveillance',
      'Interference',
    ]);
    expect(currentGame.factionFeatures.inquisition).toContainEqual({
      name: 'Purge',
      profile: '1 Action',
      timing: 'Opening or Denouement',
      cost: 'Listed Conviction',
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
      classification: 'Faction Feature',
      name: 'Orders',
    });
    expect(general.sections[1].items).toContainEqual(expect.objectContaining({
      classification: 'Leader Ability',
      name: 'Onward',
      cost: '1 Command',
      descriptor: 'No Action · During Movement',
    }));
  });
});
