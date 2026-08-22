import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const copy = readFileSync('card-design/reference-copy/v0.6.3/universal-reference.md', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const ruleColumns = readFileSync('card-design/card-rule-columns.css', 'utf8');
const universalStyles = readFileSync('card-design/universal-reference.css', 'utf8');
const titleWrapStyles = readFileSync('card-design/reference-title-wrap.css', 'utf8');
const ttsRenderer = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const supplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const deckbuilderComponents = readFileSync('deckbuilder/faction-components.js', 'utf8');

const universal = contract.sharedComponents.find((component: Record<string, any>) => component.id === 'universal-reference');

describe('final Universal Reference and reference-title fitting', () => {
  it('keeps the Universal Reference on the ordinary battle sequence rather than teaching Diplomat Terms', () => {
    expect(universal).toMatchObject({
      family: 'reference-card',
      designStatus: 'final',
      productionStatus: 'ready',
      backPolicy: 'twoSided',
      copyMode: 'bespoke',
      deckInclusion: 'every-deck',
    });

    expect(copy).toContain('### Battle Sequence');
    expect(copy).toContain('When movement creates a pending battle, proceed to **Onset**.');
    expect(copy).toContain('1. **Onset**');
    expect(copy).toContain('2. Set **Gambits**.');
    expect(copy).toContain('8. Resolve the **Aftermath**.');
    expect(copy).not.toMatch(/\bTerms\b/);
    expect(copy).not.toMatch(/\bHeartlands?\b/i);
  });

  it('shrinks, wraps, then shrinks the wrapped reference-face title before failing', () => {
    expect(universalStyles).toContain('@import url("reference-title-wrap.css")');
    expect(referenceRenderer).toContain('const REFERENCE_TITLE_MIN_PT = 8.4');
    expect(referenceRenderer).toContain('while (horizontallyOverflows() && fontSize > minimumPx');
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWrapped = 'false'");
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWrapped = 'true'");
    expect(referenceRenderer).toContain("title.style.fontSize = ''");
    expect(referenceRenderer).toContain('const wrappedOverflows = () => (');
    expect(referenceRenderer).toContain('while (wrappedOverflows() && fontSize > minimumPx');
    expect(referenceRenderer).toContain('title.scrollHeight > title.clientHeight + 0.5');
    expect(referenceRenderer).toContain("card.dataset.referenceTitleWarning = overflow ? 'true' : 'false'");
    expect(referenceRenderer).toContain('titleWrapped: titleFit.wrapped');

    expect(titleWrapStyles).toContain('[data-reference-title-wrapped="true"]');
    expect(titleWrapStyles).toContain('white-space: normal !important');
    expect(titleWrapStyles).toContain('-webkit-line-clamp: 2');
  });

  it('loads the neutral Universal styling on both review and standalone TTS render surfaces', () => {
    expect(ruleColumns).toContain('@import url("universal-reference.css")');
    expect(universalStyles).toContain('.reference-card[data-component-id="universal-reference"]');
    expect(universalStyles).toContain('neutral-parchment-v2.png');
    expect(ttsRenderer).toContain('/card-design/universal-reference.css');
  });

  it('exports and production-prints the ready shared reference instead of leaving it as a placeholder', () => {
    expect(supplementalGenerator).toContain('const sharedSupplementals = (contract.sharedComponents || [])');
    expect(supplementalGenerator).toContain("faction: component.faction || 'neutral'");
    expect(deckbuilderComponents).toContain('bridgeSharedReferencesIntoPrintAuthority(currentGame)');
    expect(deckbuilderComponents).toContain('component.productionStatus === "ready"');
    expect(deckbuilderComponents).toContain('components: Object.freeze([...factionComponents, ...sharedReferences])');
  });
});
