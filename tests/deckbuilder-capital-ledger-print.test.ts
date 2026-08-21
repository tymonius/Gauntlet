import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const printer = readFileSync('deckbuilder/print-capital-ledger.js', 'utf8');

describe('Deckbuilder Capital Ledger printing', () => {
  it('uses the finalized production Capital Ledger instead of duplicating placeholder markup', () => {
    expect(printer).toContain('PRODUCTION_LEDGER_COMPONENT_ID = "financiers-capital-ledger"');
    expect(printer).toContain('import { capitalLedgerMarkup } from "/card-design/capital-ledger.js";');
    expect(printer).toContain('capitalLedgerMarkup(currentGame.displayVersion || "Current")');
    expect(printer).toContain('/card-design/capital-ledger.css');

    expect(printer).not.toContain('Current Capital limit');
    expect(printer).not.toContain('Reusable supplemental ledger — no marker required');
    expect(printer).not.toContain('capital-limit-field');
    expect(printer).not.toContain('capital-ledger-instructions');
  });

  it('renders finalized Ledger faces in the normal deck print package', () => {
    expect(printer).toContain('formatCapitalLedgerForProduction');
    expect(printer).toContain('productionLedgerFrame(documentNode, "front")');
    expect(printer).toContain('productionLedgerFrame(documentNode, "reverse")');
    expect(printer).toContain('component-print-render.html?kind=');
    expect(printer).toContain('wrapper.dataset.productionBackPolicy = "ledgerDuplex"');
  });

  it('keeps the bulk Ledger sheets paired for long-edge duplex printing', () => {
    expect(printer).toContain('LEDGERS_PER_SHEET = 9');
    expect(printer).toContain('mirrorIndexForLongEdge');
    expect(printer).toContain('side === "back" ? mirrorIndexForLongEdge(position) : position');
    expect(printer).toContain('Enable two-sided printing and flip on the long edge.');
  });
});
