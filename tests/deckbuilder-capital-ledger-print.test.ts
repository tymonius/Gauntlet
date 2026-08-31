import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const printer = readFileSync('deckbuilder/print-capital-ledger.js', 'utf8');
const deckPrint = readFileSync('deckbuilder/print.js', 'utf8');
const productionPrint = readFileSync('deckbuilder/print-duplex-sheet-pairing.js', 'utf8');

describe('Deckbuilder Capital Ledger printing', () => {
  it('uses the canonical production renderer for bulk Ledger sheets', () => {
    expect(printer).toContain('PRODUCTION_LEDGER_COMPONENT_ID = "financiers-capital-ledger"');
    expect(printer).toContain('capitalLedgerSheetFrameHtml(side)');
    expect(printer).toContain('data-capital-ledger-sheet-frame');
    expect(printer).toContain('productionLedgerFrameSource(side)');
    expect(printer).toContain('/card-design/component-print-render.html?kind=');
    expect(printer).toContain('waitForProductionLedgerFrames');
    expect(printer).toContain('preloadProductionLedgerFrameAssets');

    expect(printer).not.toContain('import { capitalLedgerMarkup } from "/card-design/capital-ledger.js";');
    expect(printer).not.toContain('Current Capital limit');
    expect(printer).not.toContain('Reusable supplemental ledger — no marker required');
    expect(printer).not.toContain('capital-limit-field');
    expect(printer).not.toContain('capital-ledger-instructions');
  });

  it('describes Capital Ledgers as consumable', () => {
    expect(printer).toContain('consumable Capital Ledgers');
    expect(printer).not.toContain('reusable Capital Ledgers');
  });

  it('aligns the Ledger sheet count and print button on one control row', () => {
    expect(printer).toContain('class="capital-ledger-print-controls"');
    expect(printer).toContain('grid-template-columns:minmax(0,11rem) max-content');
    expect(printer).toContain('for="capitalLedgerSheetCount"');
    expect(printer).toContain('style="grid-column:1;grid-row:2;margin:0;width:100%"');
    expect(printer).toContain('style="grid-column:2;grid-row:2;margin:0;align-self:stretch;height:auto"');
  });

  it('renders finalized Ledger faces in the normal deck print package through shared production authority', () => {
    expect(deckPrint).toContain('productionPrint().component(component.contractId, "front")');
    expect(productionPrint).toContain('if (component.family === "ledger") return { kind: "supplemental", id: component.id };');
    expect(productionPrint).toContain('component.backPolicy');
    expect(productionPrint).toContain('ensureIntrinsicReversePages(documentNode, currentGame)');
    expect(printer).not.toContain('formatCapitalLedgerForProduction');
  });

  it('keeps the bulk Ledger sheets paired for long-edge duplex printing', () => {
    expect(printer).toContain('LEDGERS_PER_SHEET = 9');
    expect(printer).toContain('mirrorIndexForLongEdge');
    expect(printer).toContain('side === "back" ? mirrorIndexForLongEdge(position) : position');
    expect(printer).toContain('Enable two-sided printing and flip on the long edge.');
  });
});
