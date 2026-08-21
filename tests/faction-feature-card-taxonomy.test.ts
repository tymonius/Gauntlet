import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const taxonomy = readFileSync('card-design/faction-feature-taxonomy.md', 'utf8');
const leaderCopy = JSON.parse(readFileSync('card-design/leader-copy/v0.6.4/leader-card-copy.json', 'utf8'));
const leaderRenderer = readFileSync('card-design/leader-card-copy.js', 'utf8');
const leaderStyles = readFileSync('card-design/leader-card-copy.css', 'utf8');
const catalogOverlay = readFileSync('card-design/v064-card-candidates.js', 'utf8');
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

describe('Faction Feature and Leader Ability component taxonomy', () => {
  it('defines Faction Feature as the umbrella term without implying Action use', () => {
    expect(taxonomy).toContain('**Faction Feature** is the umbrella term');
    expect(taxonomy).toContain('The term does not imply that the feature uses an Action.');
    expect(taxonomy).toContain('Faction Reference cards are the primary table surface');
    expect(taxonomy).toContain('A mechanic supplied specifically by the chosen Leader is printed under **LEADER ABILITY**');
  });

  it('standardizes every Leader card as victory, Leader Ability, then applicable resource/progression sections', () => {
    expect(Object.keys(leaderCopy.leaders).sort()).toEqual([...leaderIds].sort());

    for (const id of leaderIds) {
      const sections = leaderCopy.leaders[id].sections;
      expect(sections[0].heading).toBe('Faction Victory');
      expect(sections[1].heading).toBe('Leader Ability');
      expect(sections.slice(2).every((section: any) => ['Resource', 'Progression'].includes(section.heading))).toBe(true);
      expect(sections.some((section: any) => section.heading === 'Tracked Value')).toBe(false);
    }

    expect(leaderCopy.leaders.ambassador.sections[0]).toMatchObject({
      heading: 'Faction Victory',
      name: 'Peace Treaty',
      text: 'At the start of your turn, if 6 different Proposals are ratified, you win.',
    });
    expect(leaderCopy.leaders.ambassador.sections[1]).toMatchObject({
      heading: 'Leader Ability',
      name: 'Cordiality',
      descriptor: 'No Action · Once per turn · After accepted Terms',
    });
    expect(leaderCopy.leaders.ambassador.sections[2]).toMatchObject({
      heading: 'Resource',
      name: 'Influence',
      descriptor: 'Begin with 1 · Maximum 10',
    });
  });

  it('treats Military Orders as the named Leader Ability rather than separate top-level sections', () => {
    for (const id of ['general', 'commandant']) {
      const ability = leaderCopy.leaders[id].sections[1];
      expect(ability.heading).toBe('Leader Ability');
      expect(ability.name).toBe('Orders');
      expect(ability.items).toHaveLength(3);
      expect(ability.items.every((item: any) => item.descriptor.includes('Command · No Action'))).toBe(true);
    }
    expect(leaderCopy.leaders.general.sections[1].items.map((item: any) => item.name)).toEqual(['Onward', 'Rally', 'Rout']);
    expect(leaderCopy.leaders.commandant.sections[1].items.map((item: any) => item.name)).toEqual(['Entrench', 'Repel', 'Fortify']);
  });

  it('keeps Intel as the Intelligence resource and Operation Progress as progression', () => {
    for (const id of ['ranger', 'spymaster']) {
      const sections = leaderCopy.leaders[id].sections;
      const resource = sections.find((section: any) => section.heading === 'Resource');
      const progression = sections.find((section: any) => section.heading === 'Progression');
      expect(resource).toMatchObject({ name: 'Intel', descriptor: 'Begin at 0 · No maximum' });
      expect(progression).toMatchObject({
        name: 'Operation Progress',
        descriptor: 'Begin at 0',
        text: 'Increment by 1 each time you complete a normal Mission.',
      });
    }
    expect(taxonomy).toContain('**Operation Progress is not a Resource.**');
    expect(taxonomy).toContain('Increment by 1 each time you complete a normal Mission.');
  });

  it('omits meaningless Resource headings for Mystics and uses Progression for Rites', () => {
    for (const id of ['alchemist', 'spirit-walker']) {
      const sections = leaderCopy.leaders[id].sections;
      expect(sections.some((section: any) => section.heading === 'Resource')).toBe(false);
      expect(sections.find((section: any) => section.heading === 'Progression')).toMatchObject({
        name: 'Rites',
        descriptor: '1st — Invocation · 2nd — Transmutation · 3rd — Convergence + Ritual',
      });
    }
  });

  it('renders the standardized section/name/descriptor/text hierarchy on production Leader cards', () => {
    expect(catalogOverlay).toContain("import './leader-card-copy.js';");
    expect(leaderRenderer).toContain("const COPY_URL = './leader-copy/v0.6.4/leader-card-copy.json';");
    expect(leaderRenderer).toContain('leader-rule-section--${slugify(section.heading)}');
    expect(leaderRenderer).toContain('leader-feature-descriptor');
    expect(leaderRenderer).toContain('leader-feature-divider');
    expect(leaderRenderer).toContain('leader-feature-group-name');
    expect(leaderRenderer).toContain("root.dataset.leaderCopyReady = 'true'");
    expect(leaderStyles).toContain('.leader-card--standardized .leader-rule-section');
    expect(leaderStyles).toContain('.leader-feature-descriptor');
    expect(leaderStyles).toContain('font-style: italic');
  });

  it('adds compact Faction Features inventories to the approved Diplomat and Financier references', () => {
    expect(diplomatReference).toContain('### Faction Features');
    expect(diplomatReference).toContain('| Terms | No Action · Before Onset |');
    expect(diplomatReference).toContain('| Leverage | No Action · Before dice after refused Terms |');

    expect(financierReference).toContain('### Faction Features');
    expect(financierReference).toContain('| Treasury | 1 Action · Denouement |');
    expect(financierReference).toContain('| Buy / Buy Out Deed | 1 Action · Denouement |');
    expect(financierReference).toContain('| Play the Market | 1 Action · Denouement |');
    expect(financierReference).toContain('| Subsidize | No Action · Before dice |');
    expect(financierReference).toContain('| Financial Capacity | No Action · After Capture |');
    expect(financierReference).toContain('At least one Action must be spent on a **Faction Feature marked 1 Action**.');
    expect(financierReference).not.toContain('Financier Faction Action');
  });
});
