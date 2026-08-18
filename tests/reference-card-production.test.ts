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

    const ids = references.map((component: any) => component.id);
    for (const id of ids) expect(supplemental).toContain(`referenceId: '${id}'`);
    expect((supplemental.match(/referenceId:/g) || [])).toHaveLength(7);
    expect((supplemental.match(/doubleSided: true/g) || [])).toHaveLength(7);
  });

  it('keeps the faction guides authoritative while curating only exact source blocks for the card surface', () => {
    expect(referenceRenderer).toContain("fetch(contractUrl, { cache: 'no-store' })");
    expect(referenceRenderer).toContain("component.family === 'reference-card'");
    expect(referenceRenderer).toContain('parseReferenceFace(markdown, component.referenceFaces.front');
    expect(referenceRenderer).toContain('parseReferenceFace(markdown, component.referenceFaces.reverse');
    expect(referenceRenderer).toContain('REFERENCE_PRESENTATION');
    expect(referenceRenderer).toContain('selectedSectionBlocks');
    expect(referenceRenderer).toContain('typedBlock');
    expect(referenceRenderer).toContain('Reference presentation');
    expect(referenceRenderer).toContain('never replace');
    expect(referenceRenderer).not.toMatch(/Diplomats begin with 1 Influence|Purge is the Inquisition's only Faction Action|Before dice are rolled in a battle following refused Terms/);
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

  it('uses the production faction shell, parallel Terms procedures, and the shared standard footer', () => {
    expect(referenceCss).toContain('padding: 0.075in');
    expect(referenceCss).toContain('font-family: var(--font-display-historical');
    expect(referenceCss).toContain('.reference-card[data-faction="diplomats"]');
    expect(referenceCss).toContain('.reference-card[data-faction="financiers"]');
    expect(referenceCss).toContain('.reference-card[data-faction="intelligence"]');
    expect(referenceCss).toContain('.reference-card[data-faction="mystics"]');
    expect(referenceCss).toContain('.reference-card[data-faction="inquisition"]');
    expect(referenceCss).toContain('[data-component-id="diplomats-reference"][data-reference-side="front"] .reference-body');
    expect(referenceCss).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)');
    expect(referenceRenderer).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(version)}</span></footer>');
    expect(supplemental).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>v0.6.3</span></footer>');
    expect(referenceRenderer).not.toContain('reference-card-footer');
    expect(supplemental).not.toContain('reference-card-footer');
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