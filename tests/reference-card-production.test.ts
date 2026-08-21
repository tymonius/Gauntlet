import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const catalogHtml = readFileSync('card-design/index.html', 'utf8');
const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');
const supplementalRefinements = readFileSync('card-design/supplemental-refinements.css', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const referenceCss = readFileSync('card-design/reference-card.css', 'utf8');
const ttsRenderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const ttsRendererHtml = readFileSync('tts/supplemental-renderer/index.html', 'utf8');

describe('production faction reference cards', () => {
  it('renders the complete seven-card contract as fourteen physical faces', () => {
    const references = contract.components.filter((component: any) => component.family === 'reference-card');
    expect(references).toHaveLength(7);
    expect(references.every((component: any) => component.backPolicy === 'twoSided')).toBe(true);
    expect(references.every((component: any) => component.referenceFaces?.front && component.referenceFaces?.reverse)).toBe(true);

    expect(supplemental).toContain("referenceId: component.family === 'reference-card' ? component.id : ''");
    expect(supplemental).toContain("doubleSided: ledger || component.backPolicy === 'twoSided'");
    expect(supplemental).toContain("filter(component => component.faction === faction && supportedFamilies.has(component.family))");
    expect(supplemental).toContain("for (const sideName of ['front', 'reverse'])");
  });

  it('supports bespoke player-aid copy with separate canonical audit sources', () => {
    const references = contract.components.filter((component: any) => component.family === 'reference-card');
    const diplomat = references.find((component: any) => component.id === 'diplomats-reference');
    const financier = references.find((component: any) => component.id === 'financiers-reference');
    const bespoke = references.filter((component: any) => component.copyMode === 'bespoke');
    const inherited = references.filter((component: any) => component.copyMode !== 'bespoke');

    expect(bespoke.map((component: any) => component.id)).toEqual([
      'diplomats-reference',
      'financiers-reference',
    ]);

    expect(diplomat.copyMode).toBe('bespoke');
    expect(diplomat.source).toBe('card-design/reference-copy/v0.6.3/diplomat-reference.md');
    expect(diplomat.authoritySource).toBe('artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md');
    expect(diplomat.auditHeadings).toEqual([
      'Faction Actions',
      'Influence',
      'Offering Terms',
      'Diplomat mirrors',
      'Accepted Terms',
      'Refused Terms',
      'Leverage',
      'Treaty Articles and Peace Treaty',
    ]);

    const diplomatCopy = readFileSync(diplomat.source, 'utf8');
    const diplomatAuthority = readFileSync(diplomat.authoritySource, 'utf8');
    expect(diplomatCopy).toContain('Player-aid copy, not faction-rule authority.');
    expect(diplomatCopy).toContain('## Front — Terms');
    expect(diplomatCopy).toContain('### Offering Terms');
    expect(diplomatCopy).toContain('Discard any previously imposed **Sanctions**.');
    expect(diplomatCopy).toContain('You may impose **Sanctions** *(once per refused Terms)*.');
    expect(diplomatCopy).toContain('if **6 different Proposals** are ratified, you win.');
    expect(diplomatCopy).not.toContain('### Action Reminder');
    for (const heading of diplomat.auditHeadings) expect(diplomatAuthority).toContain(heading);

    expect(financier.copyMode).toBe('bespoke');
    expect(financier.designStatus).toBe('final');
    expect(financier.source).toBe('card-design/reference-copy/v0.6.3/financier-reference.md');
    expect(financier.authoritySource).toBe('artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md');
    expect(financier.referenceFaces.front.title).toBe('Capital & Capacity');
    expect(financier.referenceFaces.reverse.title).toBe('Deeds & Spending');

    const financierCopy = readFileSync(financier.source, 'utf8');
    const financierAuthority = readFileSync(financier.authoritySource, 'utf8');
    expect(financierCopy).toContain('## Front — Capital & Capacity');
    expect(financierCopy).toContain('### Capital Limit');
    expect(financierCopy).toContain('### Financial Capacity');
    expect(financierCopy).toContain('## Reverse — Deeds & Spending');
    expect(financierCopy).toContain('**Base cost:** min(Deeds you own + 1, 6)');
    expect(financierCopy).toContain('### Play the Market');
    expect(financierCopy).toContain('### Subsidize');
    expect(financierCopy).toContain('### Controlling Interest');
    expect(financierCopy).not.toContain('progression continues');
    for (const heading of financier.auditHeadings) expect(financierAuthority).toContain(heading);

    expect(referenceRenderer).toContain("component.copyMode === 'bespoke'");
    expect(referenceRenderer).toContain('parseBespokeReferenceFace');

    // Migration remains incremental: five reference cards still use their
    // guide-derived sources until their own compact player-aid copy is approved.
    expect(inherited).toHaveLength(5);
    expect(inherited.every((component: any) => component.source.includes('/faction-guides/'))).toBe(true);
  });

  it('re-expresses source blocks as card-native information components instead of document prose', () => {
    expect(catalogHtml).toContain('reference-card.css');
    expect(referenceRenderer).toContain('reference-faction-emblem');
    expect(referenceRenderer).toContain('reference-watermark');
    expect(referenceRenderer).toContain('reference-panel');
    expect(referenceRenderer).toContain('reference-callout');
    expect(referenceRenderer).toContain('reference-step-list');
    expect(referenceRenderer).toContain('reference-step-index');
    expect(referenceRenderer).toContain('reference-option-list');
    expect(referenceRenderer).toContain('reference-matrix');
    expect(referenceCss).toContain('.reference-panel');
    expect(referenceCss).toContain('border-left: 0.018in solid var(--reference-accent)');
    expect(referenceCss).toContain('.reference-callout');
    expect(referenceCss).toContain('.reference-step-index');
    expect(referenceCss).toContain('.reference-option-mark');
    expect(referenceCss).toContain('.reference-table-key');
    expect(referenceCss).not.toContain('.reference-step-number');
    expect(supplemental).toContain('Designed · source-driven');
  });

  it('uses the production faction shell, compact player-aid flow, lookup rows, and shared footer', () => {
    expect(referenceCss).toContain('padding: 0.075in');
    expect(referenceCss).toContain('font-family: var(--font-display-historical');
    expect(referenceCss).toContain('.reference-card[data-faction="diplomats"]');
    expect(referenceCss).toContain('.reference-card[data-faction="financiers"]');
    expect(referenceCss).toContain('.reference-card[data-faction="intelligence"]');
    expect(referenceCss).toContain('.reference-card[data-faction="mystics"]');
    expect(referenceCss).toContain('.reference-card[data-faction="inquisition"]');
    expect(referenceRenderer).toContain('DIPLOMAT_REFERENCE_STYLE_ID');
    expect(referenceRenderer).toContain('.reference-card[data-component-id="diplomats-reference"] .reference-body');
    expect(referenceRenderer).toContain('flex-direction: column');
    expect(referenceRenderer).toContain('[data-reference-section="leverage"] .reference-panel-content');
    expect(referenceRenderer).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(referenceRenderer).toContain('[data-reference-side="reverse"] .reference-face-title');

    expect(supplementalRefinements).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-header');
    expect(supplementalRefinements).toContain('content: "Financiers"');
    expect(supplementalRefinements).toContain('.reference-card[data-component-id="financiers-reference"] .reference-body');
    expect(supplementalRefinements).toContain('[data-reference-section="subsidize"] .reference-panel-content');
    expect(supplementalRefinements).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(supplementalRefinements).toContain('.reference-card[data-component-id="financiers-reference"] .reference-matrix');

    expect(referenceRenderer).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(version)}</span></footer>');
    expect(supplemental).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(currentDisplayVersion)}</span></footer>');
    expect(referenceRenderer).not.toContain('reference-card-footer');
    expect(supplemental).not.toContain('reference-card-footer');
    expect(referenceCss).not.toContain('.reference-card-footer');
    expect(referenceCss).not.toContain('--reference-footer-tint');
    expect(referenceRenderer).not.toContain('Reference · Not a Deck Card');
    expect(supplemental).not.toContain('Reference · Not a Deck Card');
  });

  it('grows sparse faces and shrinks dense faces without clipping or crossing the readability floor', () => {
    expect(referenceRenderer).toContain('minimumScale = 0.82');
    expect(referenceRenderer).toContain('maximumScale = 1.40');
    expect(referenceRenderer).toContain('attempts < 48');
    expect(referenceRenderer).toContain('hasClippedPanels');
    expect(referenceRenderer).toContain("--reference-rules-scale");
    expect(referenceRenderer).toContain("--reference-section-gap");
    expect(referenceRenderer).toContain("card.dataset.fitWarning = overflow ? 'true' : 'false'");
    expect(referenceCss).toContain('flex: 0 0 auto');
    expect(supplemental).toContain('Reference-card text cannot fit at the readability floor');
    expect(referenceCss).toContain('.reference-card[data-fit-warning="true"]');
  });

  it('reuses the production renderer, standard card chrome, and production typefaces for TTS', () => {
    expect(ttsRenderer).toContain("from '/card-design/reference-card.js'");
    expect(ttsRenderer).toContain('referenceCardMarkup(record, sideName');
    expect(ttsRenderer).toContain('fitReferenceCard(card)');
    expect(ttsRendererHtml).toContain('/card-design/card-design.css');
    expect(ttsRendererHtml).toContain('/card-design/reference-card.css');
    expect(ttsRendererHtml).toContain('/card-design/supplemental-refinements.css');
    expect(ttsRendererHtml).toContain('https://use.typekit.net/vgm6nwi.css');
  });
});
