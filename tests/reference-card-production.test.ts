import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;
const catalogHtml = readFileSync('card-design/index.html', 'utf8');
const supplemental = readFileSync('card-design/supplemental-card.js', 'utf8');
const supplementalRefinements = readFileSync('card-design/supplemental-refinements.css', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const referenceCss = readFileSync('card-design/reference-card.css', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');
const legacyTtsRendererHtml = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const componentRendererHtml = readFileSync('card-design/component-render.html', 'utf8');

describe('production faction reference cards', () => {
  it('renders the complete seven-card contract as fourteen physical faces', () => {
    const references = contract.components.filter((component: any) => component.family === 'reference-card');
    expect(references).toHaveLength(7);
    expect(references.every((component: any) => component.backPolicy === 'twoSided')).toBe(true);
    expect(references.every((component: any) => component.referenceFaces?.front && component.referenceFaces?.reverse)).toBe(true);
    expect(references.every((component: any) => component.designStatus === 'final')).toBe(true);

    expect(supplemental).toContain("referenceId: hasReferenceFaces ? component.id : ''");
    expect(supplemental).toContain("doubleSided: component.backPolicy === 'twoSided'");
    expect(supplemental).toContain("filter(component => component.faction === faction && supportedFamilies.has(component.family))");
    expect(supplemental).toContain("for (const sideName of ['front', 'reverse'])");
  });

  it('uses authored player-aid copy for every faction reference while retaining canonical audit sources', () => {
    const references = contract.components.filter((component: any) => component.family === 'reference-card');

    expect(references.every((component: any) => component.copyMode === 'bespoke')).toBe(true);
    expect(references.every((component: any) => component.source.startsWith('card-design/reference-copy/v0.7.0/'))).toBe(true);
    expect(references.every((component: any) => component.authoritySource === 'game-data/current-game.json')).toBe(true);

    for (const reference of references) {
      const copy = readFileSync(reference.source, 'utf8');
      expect(copy).toContain('Player-aid copy, not faction-rule authority.');
      expect(copy).toContain('Audit authority: `game-data/current-game.json`.');
      expect(copy).toContain(`## Front — ${reference.referenceFaces.front.title}`);
      expect(copy).toContain(`## Reverse — ${reference.referenceFaces.reverse.title}`);
      for (const face of [reference.referenceFaces.front, reference.referenceFaces.reverse]) {
        for (const section of face.sections) expect(copy).toContain(`### ${section.heading}`);
      }
    }

    const diplomat = references.find((component: any) => component.id === 'diplomats-reference');
    const financier = references.find((component: any) => component.id === 'financiers-reference');
    const mission = references.find((component: any) => component.id === 'intelligence-mission-reference');
    const operations = references.find((component: any) => component.id === 'intelligence-operations-reference');
    const mystics = references.find((component: any) => component.id === 'mystics-reference');
    const doctrine = references.find((component: any) => component.id === 'inquisition-doctrine-reference');
    const purge = references.find((component: any) => component.id === 'inquisition-purge-reference');

    const diplomatCopy = readFileSync(diplomat.source, 'utf8');
    expect(diplomatCopy).toContain('Discard any previously imposed **Sanctions**.');
    expect(diplomatCopy).toContain('You may impose **Sanctions** *(once per refused Terms)*.');
    expect(diplomatCopy).toContain('if **6 different Proposals** are ratified, you win.');

    const financierCopy = readFileSync(financier.source, 'utf8');
    expect(financierCopy).toContain('**Base cost:** min(Deeds you own + 1, 6)');
    expect(financierCopy).toContain('### Play the Market');
    expect(financierCopy).toContain('### Subsidize');

    const missionCopy = readFileSync(mission.source, 'utf8');
    expect(mission.referenceFaces.reverse.title).toBe('Special Operations');
    expect(missionCopy).toContain('| Start Mission | 1 Action · Denouement |');
    expect(missionCopy).toContain('Increment **Operation Progress by 1**.');
    expect(missionCopy).toContain('**Territories currently in the Gauntlet − card value**');

    const operationsCopy = readFileSync(operations.source, 'utf8');
    expect(operations.referenceFaces.reverse.title).toBe('Mirrors & Replacements');
    expect(operationsCopy).toContain('| Gambit Surveillance | No Action · 1 Intel · Once per battle |');
    expect(operationsCopy).toContain('### Intelligence Mirror');
    expect(operationsCopy).toContain('After a replacement, continue the current stage without another Surveillance, Interference, reveal, or response window.');

    const mysticsCopy = readFileSync(mystics.source, 'utf8');
    expect(mystics.referenceFaces.reverse.title).toBe('Ritual of Ascension');
    expect(mysticsCopy).toContain('| Begin a Rite | 1 Action · Denouement |');
    expect(mysticsCopy).toContain('**1st Rite:** Unlock **Invocation**.');
    expect(mysticsCopy).toContain('you may move **1 card from your Graveyard to your Discard Pile**');
    expect(mysticsCopy).toContain('After a **Withdrawal**, the Ritual remains underway.');

    const doctrineCopy = readFileSync(doctrine.source, 'utf8');
    expect(doctrineCopy).toContain('| Condemnation | Automatic · Aftermath |');
    expect(doctrineCopy).toContain('opposing **Tactics go to their owner\'s Graveyard instead of their Discard Pile**');
    expect(doctrineCopy).toContain('### Purification');

    const purgeCopy = readFileSync(purge.source, 'utf8');
    expect(purge.referenceFaces.reverse.title).toBe('Purge Timing & Limits');
    expect(purgeCopy).toContain('| Purge | 1 Action · Opening or Denouement · Once per turn |');
    expect(purgeCopy).toContain('### Direct Purges');
    expect(purgeCopy).not.toContain('Final Judgment');

    expect(referenceRenderer).toContain("component.copyMode === 'bespoke'");
    expect(referenceRenderer).toContain('parseBespokeReferenceFace');
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
    expect(supplemental).toContain('· source-driven');
  });

  it('uses the finalized faction shell and open player-aid grammar on all remaining references', () => {
    expect(referenceCss).toContain('padding: 0.075in');
    expect(referenceCss).toContain('font-family: var(--font-display-historical');
    expect(referenceCss).toContain('.reference-card[data-faction="diplomats"]');
    expect(referenceCss).toContain('.reference-card[data-faction="financiers"]');
    expect(referenceCss).toContain('.reference-card[data-faction="intelligence"]');
    expect(referenceCss).toContain('.reference-card[data-faction="mystics"]');
    expect(referenceCss).toContain('.reference-card[data-faction="inquisition"]');

    expect(referenceRenderer).toContain('DIPLOMAT_REFERENCE_STYLE_ID');
    expect(referenceRenderer).toContain('[data-reference-section="leverage"] .reference-panel-content');
    expect(referenceRenderer).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');

    expect(supplementalRefinements).toContain('.reference-card[data-component-id="financiers-reference"] .reference-card-header');
    expect(supplementalRefinements).toContain('content: "Financiers"');
    expect(supplementalRefinements).toContain('[data-reference-section="subsidize"] .reference-panel-content');
    for (const id of [
      'intelligence-mission-reference',
      'intelligence-operations-reference',
      'mystics-reference',
      'inquisition-doctrine-reference',
      'inquisition-purge-reference',
    ]) {
      expect(supplementalRefinements).toContain(`[data-component-id="${id}"]`);
    }
    expect(supplementalRefinements).toContain('content: "Intelligence"');
    expect(supplementalRefinements).toContain('content: "Mystics"');
    expect(supplementalRefinements).toContain('content: "Inquisition"');
    expect(supplementalRefinements).toContain('open lookup body');

    expect(referenceRenderer).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(version)}</span></footer>');
    expect(supplemental).toContain('<footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(currentDisplayVersion)}</span></footer>');
    expect(referenceRenderer).not.toContain('reference-card-footer');
    expect(supplemental).not.toContain('reference-card-footer');
  });

  it('grows sparse faces and shrinks dense faces without clipping or crossing the readability floor', () => {
    expect(referenceRenderer).toContain('minimumScale = 0.82');
    expect(referenceRenderer).toContain('maximumScale = 1.40');
    expect(referenceRenderer).toContain('attempts < 48');
    expect(referenceRenderer).toContain('hasClippedPanels');
    expect(referenceRenderer).toContain('--reference-rules-scale');
    expect(referenceRenderer).toContain('--reference-section-gap');
    expect(referenceRenderer).toContain("card.dataset.fitWarning = overflow ? 'true' : 'false'");
    expect(referenceCss).toContain('flex: 0 0 auto');
    expect(supplemental).toContain('Reference-card text cannot fit at the readability floor');
    expect(referenceCss).toContain('.reference-card[data-fit-warning="true"]');
  });

  it('reuses the canonical Card Design reference renderer for TTS and every other consumer', () => {
    expect(legacyTtsRendererHtml).toContain('/card-design/component-render.html');
    expect(componentRenderer).toContain('kind === "reference"');
    expect(componentRenderer).toContain('.reference-card[data-component-id=');
    expect(componentRenderer).toContain('validateReferenceVisualContract(card)');
    expect(componentRendererHtml).toContain('/card-design/card-design.css');
    expect(componentRendererHtml).toContain('/card-design/reference-card.css');
    expect(componentRendererHtml).toContain('/card-design/supplemental-refinements.css');
    expect(componentRendererHtml).toContain('https://use.typekit.net/vgm6nwi.css');
  });
});
