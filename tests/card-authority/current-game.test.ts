import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  allComponents,
  expectedFaceIds,
  validateCurrentGameContract,
} from '../../scripts/card-authority/model.mjs';

const authority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

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
});
