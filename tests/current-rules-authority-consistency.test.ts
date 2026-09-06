import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveRuleFacts,
  ruleNumberWord,
  synchronizeKnownRulebookClaims,
  validateAuthorityEmbeddedFacts,
  validateRuleFactMarkers,
} from '../rulebook/player-facing/rule-facts.js';
import {
  applyV070CanonicalCorrections,
  applyV070RulebookCorrections,
} from '../rulebook/player-facing/v070-corrections.js';

const read = (path: string) => readFileSync(path, 'utf8');

describe('current rules authority consistency', () => {
  it('derives current faction summaries from current-game records instead of fixed expectations', () => {
    const game = JSON.parse(read('game-data/current-game.json'));
    const rulebook = read('rulebook/player-facing/current-rulebook.md');
    const facts = validateAuthorityEmbeddedFacts(game);
    validateRuleFactMarkers(rulebook, game);

    const labels: Record<string, string> = {
      military: 'Military',
      diplomats: 'Diplomat',
      financiers: 'Financier',
      intelligence: 'Intelligence',
      mystics: 'Mystics',
      inquisition: 'Inquisition',
    };

    for (const [id, label] of Object.entries(labels)) {
      const count = facts[`cards.${id}.count`];
      expect(rulebook).toContain(
        `${count}<!-- RULE-FACT:cards.${id}.count:number --> ${label} card titles.`,
      );
    }

    const arcaneCount = facts['cards.mystics.arcane_count'];
    expect(rulebook).toContain(
      `All ${ruleNumberWord(arcaneCount)}<!-- RULE-FACT:cards.mystics.arcane_count:word --> Mystics cards have the Arcane trait.`,
    );

    for (const faction of game.gameplay.factions) {
      const uniqueCards = game.gameplay.cards.filter(
        (card: { allegiance?: string; unique?: boolean }) =>
          card.allegiance === faction.name && card.unique,
      );
      for (const card of uniqueCards) {
        expect(rulebook, `${faction.name}: ${card.name}`).toContain(
          `| Unique card | ${card.name}, cost ${card.cost}; maximum one copy per Deck. |`,
        );
      }
    }
  });

  it('uses the structured Mystics Ritual name across current authority', () => {
    const game = JSON.parse(read('game-data/current-game.json'));
    const rulebook = read('rulebook/player-facing/current-rulebook.md');
    const ritualName = game.mystics.ritual.name;

    expect(ritualName).toBeTruthy();
    expect(game.gameplay.factions.find((faction: { id?: string }) => faction.id === 'mystics').victory)
      .toContain(ritualName);
    expect(rulebook).toContain(ritualName);
  });

  it('derives maintained v0.7.0 publication summaries from its canonical records', () => {
    const sourceCanonical = JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'));
    const canonical = applyV070CanonicalCorrections(sourceCanonical);
    const sourceRulebook = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const semanticRulebook = applyV070RulebookCorrections(sourceRulebook);
    const rulebook = synchronizeKnownRulebookClaims(semanticRulebook, canonical).output;
    const facts = deriveRuleFacts(canonical);

    for (const [id, label] of Object.entries({
      military: 'Military',
      diplomats: 'Diplomat',
      financiers: 'Financier',
      intelligence: 'Intelligence',
      mystics: 'Mystics',
      inquisition: 'Inquisition',
    })) {
      expect(rulebook).toContain(`| Faction pool | ${facts[`cards.${id}.count`]} ${label} card titles. |`);
    }

    const treatyWord = ruleNumberWord(facts['diplomats.peace_treaty_threshold']);
    expect(rulebook).toContain(`Ratify ${treatyWord} different Proposals`);

    for (const faction of canonical.gameplay.factions) {
      expect(faction.card_count).toBe(facts[`cards.${faction.id}.count`]);
    }
    for (const [allegiance, summary] of Object.entries(canonical.gameplay.card_pool_summary) as Array<
      [string, { count: number; total_value: number }]
    >) {
      const cards = canonical.gameplay.cards.filter(
        (card: { allegiance?: string }) => card.allegiance === allegiance,
      );
      expect(summary.count).toBe(cards.length);
      expect(summary.total_value).toBe(
        cards.reduce((total: number, card: { cost?: number }) => total + Number(card.cost || 0), 0),
      );
    }
  });
});
