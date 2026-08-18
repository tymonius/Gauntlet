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

  it('derives physical reference text from the same current faction-guide selectors as TTS', () => {
    expect(referenceRenderer).toContain("fetch(contractUrl, { cache: 'no-store' })");
    expect(referenceRenderer).toContain("component.family === 'reference-card'");
    expect(referenceRenderer).toContain('parseReferenceFace(markdown, component.referenceFaces.front');
    expect(referenceRenderer).toContain('parseReferenceFace(markdown, component.referenceFaces.reverse');
    expect(referenceRenderer).toContain('Reference source is missing heading');
    expect(referenceRenderer).not.toMatch(/Diplomats begin with 1 Influence|Purge is the Inquisition's only Faction Action|Before dice are rolled in a battle following refused Terms/);
  });

  it('uses a dedicated information-card grammar rather than playable-card placeholders', () => {
    expect(catalogHtml).toContain('reference-card.css');
    expect(referenceRenderer).toContain('reference-faction-emblem');
    expect(referenceRenderer).toContain('reference-watermark');
    expect(referenceRenderer).toContain('Reference · Not a Deck Card');
    expect(referenceCss).toContain('.reference-card[data-faction="diplomats"]');
    expect(referenceCss).toContain('.reference-card[data-faction="financiers"]');
    expect(referenceCss).toContain('.reference-card[data-faction="intelligence"]');
    expect(referenceCss).toContain('.reference-card[data-faction="mystics"]');
    expect(referenceCss).toContain('.reference-card[data-faction="inquisition"]');
    expect(referenceCss).toContain('.reference-table');
    expect(referenceCss).toContain('.reference-card-footer');
    expect(supplemental).toContain('Designed · source-driven');
  });

  it('fits dense faces adaptively and fails visibly below the readability floor', () => {
    expect(referenceRenderer).toContain('minimumScale = 0.82');
    expect(referenceRenderer).toContain("--reference-rules-scale");
    expect(referenceRenderer).toContain("--reference-section-gap");
    expect(referenceRenderer).toContain("card.dataset.fitWarning = overflow ? 'true' : 'false'");
    expect(supplemental).toContain('Reference-card text cannot fit at the readability floor');
    expect(referenceCss).toContain('.reference-card[data-fit-warning="true"]');
  });

  it('reuses the production renderer for TTS instead of maintaining a second visual reference implementation', () => {
    expect(ttsRenderer).toContain("from '/card-design/reference-card.js'");
    expect(ttsRenderer).toContain('referenceCardMarkup(record, sideName');
    expect(ttsRenderer).toContain('fitReferenceCard(card)');
    expect(ttsRendererHtml).toContain('/card-design/reference-card.css');
  });
});
