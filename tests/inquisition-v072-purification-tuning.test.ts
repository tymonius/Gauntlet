import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const authority = JSON.parse(read('packages/game-data/current-game.json'));
const design = JSON.parse(read('docs/v0.7.2-inquisition-purification-tuning.json'));

describe('v0.7.2 Inquisition Purification tuning', () => {
  it('encodes the approved Conviction scaling and Purge value ceiling in current authority', () => {
    expect(authority.provenance.currentDevelopmentInputs.v072InquisitionPurificationTuning)
      .toBe('/docs/v0.7.2-inquisition-purification-tuning.json');

    expect(design).toMatchObject({
      targetVersion: 'v0.7.2',
      status: 'approved-design',
      gameplayBehaviorChanged: true,
      conviction: {
        oneOpposingCard: 1,
        twoOrMoreOpposingCards: 2,
        maximum: 4,
        oncePerTurnUnchanged: true,
      },
      purge: {
        oneConvictionMode: {
          previousCombinedValueMaximum: 2,
          newCombinedValueMaximum: 3,
        },
      },
    });

    const rules = authority.gameplay.faction_rules.inquisition;
    expect(rules.conviction).toMatchObject({
      starting: 0,
      maximum: 4,
      once_per_turn: true,
      gain_by_opposing_card_count: {
        exactly_one: 1,
        two_or_more: 2,
      },
    });
    expect(rules.conviction.text).toContain('gain 1 Conviction if exactly one opposing card entered, or 2 Conviction if two or more entered');
    expect(rules.purge).toMatchObject({
      one_conviction_combined_card_count_max: 2,
      one_conviction_combined_value_max: 3,
    });
    expect(rules.purge.options['1']).toContain('combined value 3 or less');

    for (const leader of authority.gameplay.factions
      .find((faction: any) => faction.id === 'inquisition').leaders) {
      expect(leader.sections.find((section: any) => section.name === 'Conviction')?.text)
        .toContain('or 2 Conviction if two or more entered');
    }
    for (const leader of authority.leaders.filter((leader: any) => leader.faction === 'inquisition')) {
      expect(leader.sections.find((section: any) => section.name === 'Conviction')?.text)
        .toContain('or 2 Conviction if two or more entered');
    }
  });

  it('keeps maintained player-facing Inquisition surfaces synchronized', () => {
    const factionGuide = read('packages/rules/faction-guides/inquisition.md');
    const completeRules = read('packages/rules/comprehensive/comprehensive-rules.md');
    const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
    const doctrineReference = read('card-design/reference-copy/v0.7.0/inquisition-doctrine-reference.md');
    const purgeReference = read('card-design/reference-copy/v0.7.0/inquisition-purge-reference.md');

    for (const surface of [factionGuide, completeRules, currentRulebook, doctrineReference]) {
      expect(surface).toContain('2 Conviction');
    }
    for (const surface of [factionGuide, completeRules, currentRulebook, purgeReference]) {
      expect(surface).toContain('combined value 3 or less');
      expect(surface).not.toContain('combined value 2 or less');
    }

    expect(factionGuide).toContain('two or more give **2 Conviction total**');
    expect(doctrineReference).toContain('two or more give **2 Conviction total**');
    expect(currentRulebook).toContain('two or more produce 2 total');
  });
});
