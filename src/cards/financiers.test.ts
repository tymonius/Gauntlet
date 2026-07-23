import { describe, expect, it } from 'vitest';
import { financierCardDefinitions, financierCardsById } from './financiers';

const expected = [
  ['financiers-speculation', 1],
  ['financiers-monetary-crisis', 2],
  ['financiers-liquidation', 2],
  ['financiers-underwriting', 2],
  ['financiers-capital-gains', 3],
  ['financiers-tariffs', 3],
  ['financiers-divestment', 3],
  ['financiers-margin-loan', 3],
  ['financiers-leveraged-buyout', 4],
  ['financiers-foreclosure', 4],
  ['financiers-property-dues', 4],
  ['financiers-corner-the-market', 5],
] as const;

describe('canonical Financier cards', () => {
  it('contains the approved twelve-card 1/3/4/3/1 package', () => {
    expect(financierCardDefinitions).toHaveLength(12);
    expect(financierCardDefinitions.map((card) => [card.id, card.cost])).toEqual(expected);
    expect(financierCardDefinitions.reduce((sum, card) => sum + card.cost, 0)).toBe(36);
  });

  it('marks only Corner the Market Unique and preserves both modes', () => {
    expect(financierCardDefinitions.filter((card) => card.unique).map((card) => card.id)).toEqual(['financiers-corner-the-market']);
    for (const [id] of expected) {
      const card = financierCardsById.get(id)!;
      expect(card.action.length).toBeGreaterThan(0);
      expect(card.battle.length).toBeGreaterThan(0);
    }
  });
});
