import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  allComponents,
  expectedFaceIds,
  validateCurrentGameContract,
} from '../../scripts/card-authority/model.mjs';

const authority = JSON.parse(readFileSync('packages/game-data/current-game.json', 'utf8'));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('current card authority contract', () => {
  it('accepts the complete current-game authority as the sole live card authority', () => {
    const summary = validateCurrentGameContract(authority);
    expect(summary.version).toBe(authority.version);
    expect(summary.status).toBe(authority.status);
    expect(summary.cards).toBe(authority.gameplay.cards.length);
    expect(summary.territories).toBe(authority.gameplay.territories.length);
    expect(summary.leaders).toBe(authority.leaders.length);
    expect(summary.cardLikeComponents).toBe(allComponents(authority).filter(component => component.cardLike).length);
    expect(summary.expectedFaces).toBe(expectedFaceIds(authority).length);
  });

  it('fails closed on duplicate physical-component identity', () => {
    const broken = clone(authority);
    broken.componentContract.components.push(clone(broken.componentContract.components[0]));
    expect(() => validateCurrentGameContract(broken)).toThrow(/Component IDs mismatch/);
  });

  it('fails closed when a card-like component no longer resolves to gameplay authority', () => {
    const broken = clone(authority);
    const proposal = broken.componentContract.components.find((component: any) => component.family === 'proposal-treaty-card');
    proposal.renderSource = { ...(proposal.renderSource || {}), componentId: 'missing-proposal' };
    expect(() => validateCurrentGameContract(broken)).toThrow(/does not resolve to current Proposal authority/);
  });
  it('locks the v0.7.2 New Recruits liquidity rebalance and legal starter values', () => {
    const card = authority.gameplay.cards.find((candidate: any) => candidate.id === 'neutral-new-recruits');
    expect(card).toBeDefined();
    expect(card.cost).toBe(2);
    expect(card.action).toBe('Discard one other card from your Hand if able, then +3 Cards.');
    expect(card.effects.find((effect: any) => effect.label === 'Action')?.text)
      .toBe('Discard one other card from your Hand if able, then +3 Cards.');
    expect(authority.provenance.currentDevelopmentInputs.v072NewRecruitsLiquidity)
      .toBe('/docs/v0.7.2-new-recruits-liquidity.json');
    expect(authority.gameplay.card_pool_summary.Neutral.total_value).toBe(126);
    expect(authority.gameplay.card_pool_summary.Neutral.cost_curve).toMatchObject({
      '1': 10,
      '2': 21,
    });

    const byName = new Map(authority.gameplay.cards.map((candidate: any) => [candidate.name, candidate]));
    for (const deck of authority.starterDecks.decks) {
      const count = deck.cards.reduce((total: number, entry: any) => total + entry.quantity, 0);
      const value = deck.cards.reduce(
        (total: number, entry: any) => total + entry.quantity * Number(byName.get(entry.name)?.cost || 0),
        0,
      );
      expect(count).toBe(30);
      expect(value).toBe(60);
      expect(deck.cardCount).toBe(30);
      expect(deck.deckbuildingValue).toBe(60);
    }
  });

});
