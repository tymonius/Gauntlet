import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderer = readFileSync('card-design/capital-ledger.js', 'utf8');
const css = readFileSync('card-design/capital-ledger.css', 'utf8');
const preview = readFileSync('card-design/capital-ledger-preview.html', 'utf8');
const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');

describe('Financiers Capital Ledger production component', () => {
  it('renders the approved ledger content and writable rows', () => {
    expect(renderer).toContain('Capital Ledger');
    expect(renderer).not.toContain('Public Capital Record');
    expect(renderer).toContain('>Entry<');
    expect(renderer).toContain('>±<');
    expect(renderer).toContain('>Balance<');
    expect(renderer).toContain('Opening Balance');
    expect(renderer).toContain('>2<');
    expect(renderer).toContain('>Income<');
    expect(renderer).toContain('>+1<');
    expect(renderer).toContain('>3<');
    expect(renderer).toContain('${ledgerRows(11)}');
    expect(css).toContain('repeat(11, 1fr)');

    // The example demonstrates a gain from the preprinted opening balance of 2 to 3.
    expect(renderer.indexOf('capital-ledger-row--opening')).toBeLessThan(renderer.indexOf('capital-ledger-row--example'));
  });

  it('starts the ledger exactly on the former subheader rule while preserving side padding', () => {
    expect(css).toContain('--capital-ledger-former-subheader-rule-y: 0.3851840278in;');
    expect(css).toContain('grid-template-rows: var(--capital-ledger-former-subheader-rule-y) minmax(0, 1fr) 0.18in;');
    expect(css).toContain('padding: 0 0.068in 0.018in;');
  });

  it('uses the project Declaration Pro flavor face for the faint example entry', () => {
    expect(css).toContain('.capital-ledger-row--example');
    expect(css).toContain('font-family: var(--font-flavor, "p22-declaration-pro", Georgia, serif)');
    expect(css).toContain('font-size: 10pt');
    expect(css).toContain('color: rgba(67, 42, 55, 0.34)');
    expect(css).toContain('font-weight: 400');
    expect(preview).toContain('https://use.typekit.net/vgm6nwi.css');
    expect(preview).toContain('../design-tokens.css');
  });

  it('uses the reference-card shell and ledger metadata footer', () => {
    expect(renderer).toContain('reference-card capital-ledger-card');
    expect(renderer).toContain('data-faction="financiers"');
    expect(renderer).toContain('<footer class="card-footer"><span>Financiers</span><span>Ledger</span><span>${esc(version)}</span></footer>');
    expect(css).toContain('.capital-ledger-card .reference-card-interior');
    expect(css).toContain('var(--parchment-image)');
    expect(css).toContain('.capital-ledger-card .card-footer');
  });

  it('presents the ledger as identical duplex faces in both review surfaces', () => {
    expect(renderer).toContain("const face = capitalLedgerMarkup(version);");
    expect(renderer).toContain('<strong>Front</strong><span>Ledger face</span>');
    expect(renderer).toContain('<strong>Reverse</strong><span>Identical ledger face</span>');
    expect((renderer.match(/\$\{face\}/g) || [])).toHaveLength(2);

    expect(supplemental).toContain("if (component.family === 'ledger') return 'Consumable duplex Capital record with identical ledger faces.';");
    expect(supplemental).toContain("doubleSided: ledger || component.backPolicy === 'twoSided'");
    expect(supplemental).toContain("backPolicy: ledger ? 'twoSided' : component.backPolicy");
    expect(supplemental).toContain('if (component.ledger) return capitalLedgerMarkup(currentDisplayVersion);');
    expect(supplemental).toContain("'Designed · identical duplex ledger'");
    expect(supplemental).toContain("const faceDescription = component.ledger ? 'Identical ledger face' : 'Loading current face';");
  });
});
