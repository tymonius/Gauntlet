import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const taxonomy = readFileSync('card-design/faction-feature-taxonomy.md', 'utf8');
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const leaderRenderer = readFileSync('card-design/leader-card-copy.js', 'utf8');
const leaderStyles = readFileSync('card-design/leader-card-copy.css', 'utf8');
const catalogOverlay = readFileSync('card-design/current-card-catalog.js', 'utf8');
const diplomatReference = readFileSync('card-design/reference-copy/v0.6.3/diplomat-reference.md', 'utf8');
const financierReference = readFileSync('card-design/reference-copy/v0.6.3/financier-reference.md', 'utf8');

const leaderIds = [
  'general',
  'commandant',
  'ambassador',
  'senator',
  'banker',
  'executive',
  'ranger',
  'spymaster',
  'alchemist',
  'spirit-walker',
  'grand-inquisitor',
  'witch-hunter',
];

const leaderById = Object.fromEntries(currentGame.leaders.map((leader: any) => [leader.id, leader]));

describe('Faction Feature and Leader Ability component taxonomy', () => {
  it('defines Faction Feature as the umbrella term without implying Action use', () => {
    expect(taxonomy).toContain('**Faction Feature** is the umbrella term');
    expect(taxonomy).toContain('The term does not imply that the feature uses an Action.');
    expect(taxonomy).toContain('Faction Reference cards are the primary table surface');
    expect(taxonomy).toContain('classified as a **LEADER ABILITY**');
    expect(currentGame.factionFeatureTaxonomy.factionFeature).toContain('shared by the faction');
    expect(Object.keys(currentGame.factionFeatureTaxonomy.actionProfiles).sort()).toEqual(['1 Action', 'Automatic', 'No Action']);
  });

  it('keeps the agreed Leader section order in current-game authority', () => {
    expect(currentGame.leaders.map((leader: any) => leader.id).sort()).toEqual([...leaderIds].sort());

    for (const id of leaderIds) {
      const sections = leaderById[id].sections;
      expect(sections[0].classification).toBe('Faction Victory');
      expect(sections[1].classification).toBe('Leader Ability');
      expect(sections.slice(2).every((section: any) => ['Resource', 'Progression'].includes(section.classification))).toBe(true);
      expect(sections.some((section: any) => section.classification === 'Tracked Value')).toBe(false);
      expect(sections.every((section: any) => typeof section.name === 'string' && section.name.length > 0)).toBe(true);
    }

    expect(leaderById.ambassador.sections[0]).toMatchObject({
      classification: 'Faction Victory',
      name: 'Peace Treaty',
      text: 'At the start of your turn, if 6 different Proposals are ratified, you win.',
    });
    expect(leaderById.ambassador.sections[1]).toMatchObject({
      classification: 'Leader Ability',
      name: 'Cordiality',
      descriptor: 'No Action · Once per turn · After accepted Terms',
    });
    expect(leaderById.ambassador.sections[2]).toMatchObject({
      classification: 'Resource',
      name: 'Influence',
      descriptor: 'Begin with 1 · Maximum 10',
    });
  });

  it('renders the General in the approved Run the Gauntlet / Orders / Command hierarchy', () => {
    const sections = leaderById.general.sections;
    expect(sections.map((section: any) => [section.name, section.classification])).toEqual([
      ['Run the Gauntlet', 'Faction Victory'],
      ['Orders', 'Leader Ability'],
      ['Command', 'Resource'],
    ]);

    expect(sections[1].items).toEqual([
      {
        name: 'Onward',
        cost: '1 Command',
        descriptor: 'No Action · During Movement',
        text: 'During your Movement, move one additional Position. This may start a Battle.',
      },
      {
        name: 'Rally',
        cost: '1 Command',
        descriptor: 'No Action · Before dice · Attacking',
        text: 'Add +1 to your battle total in a battle you initiated.',
      },
      {
        name: 'Rout',
        cost: '2 Command',
        descriptor: 'No Action · End of Aftermath · Win as attacker',
        text: 'Advance one Position. This movement may initiate a battle.',
      },
    ]);
    expect(sections[2]).toMatchObject({
      name: 'Command',
      classification: 'Resource',
      descriptor: 'Begin with 0 · Maximum 2',
      text: 'The first time each turn you win a battle, gain 1 Command.',
    });
  });

  it('separates resource costs from italic timing descriptors', () => {
    for (const id of ['general', 'commandant']) {
      const orders = leaderById[id].sections[1].items;
      expect(orders).toHaveLength(3);
      expect(orders.every((item: any) => /^\d Command$/.test(item.cost))).toBe(true);
      expect(orders.every((item: any) => item.descriptor.startsWith('No Action'))).toBe(true);
      expect(orders.every((item: any) => !item.descriptor.includes('Command'))).toBe(true);
    }

    expect(leaderById.ranger.sections[1]).toMatchObject({
      name: 'Fieldcraft',
      cost: '1 Intel',
      descriptor: 'No Action · Once per turn · Territory effect',
    });
    expect(leaderById['witch-hunter'].sections[1]).toMatchObject({
      name: 'Relentless Pursuit',
      cost: '2 Conviction',
      descriptor: 'No Action · Once per turn · After defeating an attacking opponent',
    });
    expect(leaderById.ambassador.sections[1].cost).toBeUndefined();
  });

  it('keeps Intel as the Intelligence resource and Operation Progress as progression', () => {
    for (const id of ['ranger', 'spymaster']) {
      const sections = leaderById[id].sections;
      const resource = sections.find((section: any) => section.classification === 'Resource');
      const progression = sections.find((section: any) => section.classification === 'Progression');
      expect(resource).toMatchObject({ name: 'Intel', descriptor: 'Begin at 0 · No maximum' });
      expect(progression).toMatchObject({
        name: 'Operation Progress',
        descriptor: 'Begin at 0',
        text: 'Increment by 1 each time you complete a normal Mission.',
      });
    }
    const intelligence = currentGame.gameplay.factions.find((faction: any) => faction.id === 'intelligence');
    expect(intelligence.resource).toBe('Intel (no maximum)');
    expect(intelligence.progression).toBe('Operation Progress');
    expect(taxonomy).toContain('**Operation Progress is not a Resource.**');
  });

  it('omits meaningless Resource classifications for Mystics and uses Progression for Rites', () => {
    for (const id of ['alchemist', 'spirit-walker']) {
      const sections = leaderById[id].sections;
      expect(sections.some((section: any) => section.classification === 'Resource')).toBe(false);
      expect(sections.find((section: any) => section.classification === 'Progression')).toMatchObject({
        name: 'Rites',
        descriptor: '1st — Invocation · 2nd — Transmutation · 3rd — Convergence + Ritual',
      });
    }
    const mystics = currentGame.gameplay.factions.find((faction: any) => faction.id === 'mystics');
    expect(mystics.resource).toBeNull();
    expect(mystics.progression).toBe('Rites');
  });

  it('renders named concepts from current-game instead of a second Leader copy file', () => {
    expect(catalogOverlay).toContain("import './leader-card-copy.js';");
    expect(leaderRenderer).toContain("import('../game-data/current-game.mjs')");
    expect(leaderRenderer).toContain('currentGame.leaders');
    expect(leaderRenderer).not.toContain('leader-card-copy.json');
    expect(leaderRenderer).toContain('leader-section-name');
    expect(leaderRenderer).toContain('leader-section-kind');
    expect(leaderRenderer).toContain('leader-feature-item-name');
    expect(leaderRenderer).toContain('leader-feature-cost');
    expect(leaderRenderer).toContain('leader-feature-descriptor');
    expect(leaderRenderer).toContain('leader-feature-text');
    expect(leaderRenderer).toContain('if (showName && feature.cost)');
    expect(leaderRenderer).not.toContain('leader-feature-group-name');
    expect(leaderRenderer).not.toContain('leader-feature-divider');
    expect(leaderRenderer).toContain("leaderCard.dataset.artMin = '0.98'");
    expect(leaderRenderer).toContain("root.dataset.leaderCopyReady = 'true'");

    expect(leaderStyles).toContain('.leader-section-name');
    expect(leaderStyles).toContain('.leader-section-kind');
    expect(leaderStyles).toContain('.leader-feature-item-name');
    expect(leaderStyles).toContain('.leader-feature-cost');
    expect(leaderStyles).toContain('font-family: var(--font-interface)');
    expect(leaderStyles).toContain('font-style: italic');
    expect(leaderStyles).toContain('.leader-card--standardized[data-faction="military"] .card-rules');

    expect(taxonomy).toContain('The **named game concept is the primary heading**');
    expect(taxonomy).toContain('Do not repeat the left-column name');
    expect(taxonomy).toContain('A bold/accent right-column subheading is reserved for a distinct resource-costed subfeature');
  });

  it('keeps shared Faction Feature inventories aligned between authority and references', () => {
    expect(currentGame.factionFeatures.military).toEqual([]);
    expect(currentGame.factionFeatures.diplomats).toEqual([
      { name: 'Terms', profile: 'No Action', timing: 'During Onset' },
      { name: 'Leverage', profile: 'No Action', timing: 'Before dice after refused Terms' },
    ]);
    expect(diplomatReference).toContain('### Faction Features');
    expect(diplomatReference).toContain('| Terms | No Action · During Onset |');
    expect(diplomatReference).toContain('| Leverage | No Action · Before dice after refused Terms |');

    expect(currentGame.factionFeatures.financiers.map((feature: any) => feature.name)).toEqual([
      'Treasury',
      'Buy / Buy Out Deed',
      'Play the Market',
      'Subsidize',
      'Financial Capacity',
      'Income',
    ]);
    expect(financierReference).toContain('### Faction Features');
    expect(financierReference).toContain('| Treasury | 1 Action · Denouement |');
    expect(financierReference).toContain('| Buy / Buy Out Deed | 1 Action · Denouement |');
    expect(financierReference).toContain('| Play the Market | 1 Action · Denouement |');
    expect(financierReference).toContain('| Subsidize | No Action · Before dice |');
    expect(financierReference).toContain('| Financial Capacity | No Action · After Capture |');
    expect(financierReference).toContain('At least one Action must be spent on a **Faction Feature marked 1 Action**.');
    expect(financierReference).not.toContain('Financier Faction Action');
  });

  it('contains no retired current terminology in the current authority payload', () => {
    const currentPayload = JSON.stringify({
      leaders: currentGame.leaders,
      factions: currentGame.gameplay.factions,
      factionRules: currentGame.gameplay.faction_rules,
      factionFeatures: currentGame.factionFeatures,
      mystics: currentGame.mystics,
    });
    expect(currentPayload).not.toMatch(/Faction Actions?|Faction Abilit(?:y|ies)|faction procedure/i);
  });
});
