import { expect, test } from 'vitest';
import { acceptTerms, createPendingBattle } from './rules';

test('ordinary accepted Terms withdraw the attacker while the defender remains', () => {
  const pending = createPendingBattle({
    territoryCount: 6,
    attacker: 'A',
    defender: 'B',
    attackerOrigin: 2,
    contestedPosition: 3,
    positions: { A: 3, B: 3 },
    defenderControlsContested: true,
  });

  const result = acceptTerms(pending);

  expect(result.stage).toBe('withdrawn');
  expect(result.termsAccepted).toBe(true);
  expect(result.positions).toEqual({ A: 2, B: 3 });
  expect(result.winner).toBeNull();
  expect(result.loser).toBeNull();
  expect(result.occupier).toBeNull();
  expect(result.completeNonResultAftermath).toBe(false);
  expect(result.clearCommittedCards).toBe(false);
});
