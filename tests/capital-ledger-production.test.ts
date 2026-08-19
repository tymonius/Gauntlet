import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');

describe('Capital Ledger rollback regression guard', () => {
  it('keeps the shared supplemental catalog decoupled from the Capital Ledger renderer', () => {
    expect(supplemental).not.toContain("from './capital-ledger.js'");
    expect(supplemental).not.toContain('capitalLedgerMarkup');
    expect(supplemental).not.toContain('component.ledger');
  });
});
