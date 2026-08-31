import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveRuleFacts,
  synchronizeKnownRulebookClaims,
  synchronizeRuleFactMarkers,
  validateRuleFactMarkers,
} from '../rulebook/player-facing/rule-facts.js';
import {
  applyV070CanonicalCorrections,
  applyV070RulebookCorrections,
} from '../rulebook/player-facing/v070-corrections.js';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rulebook fact registry', () => {
  it('keeps tracked current Rulebook facts synchronized with current-game authority', () => {
    const authority = JSON.parse(read('game-data/current-game.json'));
    const rulebook = read('rulebook/player-facing/current-rulebook.md');
    const facts = validateRuleFactMarkers(rulebook, authority);

    expect(facts['diplomats.peace_treaty_threshold']).toBe(6);
    expect(facts['cards.military.count']).toBe(15);
    expect(facts['cards.diplomats.count']).toBe(15);
    expect(facts['cards.financiers.count']).toBe(15);
    expect(facts['cards.intelligence.count']).toBe(15);
    expect(facts['cards.mystics.count']).toBe(15);
    expect(facts['cards.inquisition.count']).toBe(15);
    expect(facts['cards.mystics.arcane_count']).toBe(15);
    expect(facts['proposals.count']).toBe(9);

    const semantic = synchronizeKnownRulebookClaims(rulebook, authority);
    expect(semantic.changes).toEqual([]);
    expect(semantic.output).toContain(
      'Action, Gambit, or Tactic effect of an Arcane card'
    );
    expect(semantic.output).toContain('RULE-FACT:mystics.invocation.text');
  });

  it('produces an exact repair instead of relying on search-and-replace memory', () => {
    const authority = JSON.parse(read('game-data/current-game.json'));
    const rulebook = read('rulebook/player-facing/current-rulebook.md')
      .replace(
        '15<!-- RULE-FACT:cards.military.count:number --> Military card titles.',
        '13<!-- RULE-FACT:cards.military.count:number --> Military card titles.',
      )
      .replace(
        'six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals',
        'five<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals',
      );

    const result = synchronizeRuleFactMarkers(rulebook, authority);
    expect(result.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'cards.military.count', current: '13', expected: '15' }),
      expect.objectContaining({
        id: 'diplomats.peace_treaty_threshold',
        current: 'five',
        expected: 'six',
      }),
    ]));
    expect(result.output).toContain(
      '15<!-- RULE-FACT:cards.military.count:number --> Military card titles.',
    );
    expect(result.output).toContain(
      'six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals',
    );
  });

  it('derives maintained release repairs from canonical card records and rule fields', () => {
    const sourceCanonical = JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'));
    const canonical = applyV070CanonicalCorrections(sourceCanonical);
    const sourceRulebook = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const semanticRulebook = applyV070RulebookCorrections(sourceRulebook);
    const result = synchronizeKnownRulebookClaims(semanticRulebook, canonical);
    const facts = deriveRuleFacts(canonical);

    expect(facts['cards.military.count']).toBe(15);
    expect(facts['cards.diplomats.count']).toBe(15);
    expect(facts['diplomats.peace_treaty_threshold']).toBe(6);
    expect(result.output).toContain('| Faction pool | 15 Military card titles. |');
    expect(result.output).toContain('| Faction pool | 15 Diplomat card titles. |');
    expect(result.output).toContain('Ratify six different Proposals');
    expect(result.output).not.toMatch(/\| Faction pool \| 13 /);
    expect(result.output).not.toContain('Ratify five different Proposals');
  });
});
