import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const catalogHtml = readFileSync('card-design/index.html', 'utf8');
const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');
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

  it('supports bespoke player-aid copy with a separate canonical audit source', () => {
    const references = contract.components.filter((component: any) => component.family === 'reference-card');
    const diplomat = references.find((component: any) => component.id === 'diplomats-reference');
    const inherited = references.filter((component: any) => component.id !== 'diplomats-reference');

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

    const copy = readFileSync(diplomat.source, 'utf8');
    const authority = readFileSync(diplomat.authoritySource, 'utf8');
    expect(copy).toContain('Player-aid copy, not faction-rule authority.');
    expect(copy).toContain('## Front — Terms');
    expect(copy).toContain('### Offering Terms');
    expect(copy).toContain('Discard any previously imposed **Sanctions**.');
    expect(copy).toContain('You may impose **Sanctions** *(once per refused Terms)*.');
    expect(copy).toContain('if **6 different Proposals** are ratified, you win.');
    expect(copy).not.toContain('### Action Reminder');
    expect(referenceRenderer).toContain("component.copyMode === 'bespoke'");
    expect(referenceRenderer).toContain('parseBespokeReferenceFace');
    for (const heading of diplomat.auditHeadings) expect(authority).toContain(heading);

    // The migration is intentionally incremental: Diplomat proves the bespoke-copy
    // model while the other six cards remain on their existing guide-derived sources.
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

  it('uses the production faction shell, single-column Terms flow, compact Leverage row, and shared footer', () => {
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
    expect(ttsRendererHtml).toContain('https://use.typekit.net/vgm6nwi.css');
  });
});