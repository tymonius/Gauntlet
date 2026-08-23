import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyV064CardOverride,
  applyV064SharedRulesOverride,
  buildV064RuleDocuments,
  validateV064RulesSource,
} from '../rules-assistant/v064-candidate-corpus.js';

const source = JSON.parse(readFileSync('docs/v0.6.4-rules.json', 'utf8'));

describe('v0.6.4 candidate Rules Arbiter Onset corpus', () => {
  it('accepts the current Onset migration source', () => {
    expect(validateV064RulesSource(source)).toBe(true);
    expect(source.battle.sequence[0]).toBe('onset');
    expect(source.battle.remove_fields).toContain('pending_sequence');
    expect(source.battle.terms).toContain('during Onset');
    expect(source.battle.terms).toContain('attacker has the first opportunity');
  });

  it('replaces stale rulebook sections that describe a pending battle', () => {
    const baseCorpus = {
      version: 'v0.6.3',
      versionLabel: 'Gauntlet v0.6.3',
      published: true,
      currentPublicRelease: 'v0.6.3',
      data: {
        battle: {
          pending_sequence: ['pending_battle', 'terms', 'onset', 'gambits'],
          withdrawal: 'Old pending-battle withdrawal rule.',
        },
      },
      documents: [
        {
          id: 'rulebook:pending',
          kind: 'rulebook',
          title: 'Pending Battles, Terms, and Onset',
          heading: 'Pending Battles, Terms, and Onset',
          body: 'A pending battle exists before Onset.',
        },
        {
          id: 'rulebook:old-terms',
          kind: 'rulebook',
          title: 'Diplomats › Offering Terms',
          heading: 'Offering Terms',
          body: 'Terms occur during a pending battle before Onset.',
        },
        {
          id: 'rulebook:unrelated',
          kind: 'rulebook',
          title: 'Assets',
          heading: 'Assets',
          body: 'Unrelated rule remains unchanged.',
        },
      ],
    };

    const result = applyV064SharedRulesOverride(
      baseCorpus,
      source,
      'https://example.invalid/game-data/current-game.json',
    );

    expect(result.documents.some(document => document.id === 'rulebook:pending')).toBe(false);
    expect(result.documents.some(document => document.id === 'rulebook:old-terms')).toBe(false);
    expect(result.documents.find(document => document.id === 'rulebook:unrelated')?.body)
      .toBe('Unrelated rule remains unchanged.');
    expect(result.byId.get('rulebook:v064-battle-onset')?.body).toContain('first phase of the battle sequence');
    expect(result.byId.get('rulebook:v064-battle-terms')?.body).toContain('resolved during Onset');
    expect(result.data.battle).not.toHaveProperty('pending_sequence');
  });

  it('builds current card documents from the resolved current card pool', () => {
    const baseCorpus = {
      documents: [
        { id: 'card:neutral-advance-guard', kind: 'card', heading: 'Advance Guard', body: 'Old pending battle wording.' },
        { id: 'rulebook:keep', kind: 'rulebook', heading: 'Keep', body: 'Keep me.' },
      ],
    };
    const cards = [
      {
        id: 'neutral-advance-guard',
        name: 'Advance Guard',
        allegiance: 'Neutral',
        cost: 2,
        effects: [
          { label: 'Action', text: 'During Opening, during your Movement this turn, you may move one additional Position. If that additional movement initiates a battle, you cannot set a Gambit in that battle.' },
        ],
      },
    ];

    const result = applyV064CardOverride(
      baseCorpus,
      cards,
      'https://example.invalid/game-data/current-game.json',
    );

    expect(result.byId.get('card:neutral-advance-guard')?.body).toContain('initiates a battle');
    expect(result.byId.get('card:neutral-advance-guard')?.body).not.toContain('pending battle');
    expect(result.byId.get('rulebook:keep')?.body).toBe('Keep me.');
  });

  it('builds complete current Terms and Onset replacement documents', () => {
    const documents = buildV064RuleDocuments(source, 'https://example.invalid/game-data/current-game.json');
    expect(documents.length).toBeGreaterThanOrEqual(6);
    expect(documents.find(document => document.heading === 'Onset')?.body).toContain('Resolve Terms first');
    expect(documents.find(document => document.heading === 'Offering Terms during Onset')?.body)
      .toContain('attacker has the first opportunity');
    expect(documents.find(document => document.heading === 'Accepted Terms')?.body)
      .toContain('battle sequence ends during Onset');
    expect(documents.find(document => document.heading === 'Accepted Terms')?.body)
      .toContain('no winner, loser, or Aftermath');
    expect(documents.find(document => document.heading === 'Refused Terms')?.body)
      .toContain('continue Onset');
    expect(documents.find(document => document.heading === 'Refused Terms')?.body)
      .toContain('Leverage');
    expect(documents.find(document => document.heading === 'Withdrawal')?.body).toContain('during Onset');
  });
});
