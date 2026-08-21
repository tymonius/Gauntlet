import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const validator = readFileSync('scripts/tts-component-contract.mjs', 'utf8');
const supplementalRenderer = readFileSync('card-design/supplemental-card.js', 'utf8');
const deckbuilderComponents = readFileSync('deckbuilder/faction-components.js', 'utf8');
const deckbuilderPrint = readFileSync('deckbuilder/print-duplex-sheet-pairing.js', 'utf8');

const components = contract.components as Array<Record<string, any>>;
const sharedComponents = contract.sharedComponents as Array<Record<string, any>>;

function component(id: string) {
  return components.find(item => item.id === id);
}

describe('physical component design maturity', () => {
  it('declares one design-pending Universal Reference Card for every deck', () => {
    const universal = sharedComponents.find(item => item.id === 'universal-reference');

    expect(universal).toMatchObject({
      name: 'Universal Reference Card',
      family: 'reference-card',
      quantityPerPlayer: 1,
      deckInclusion: 'every-deck',
      cardLike: true,
      designStatus: 'placeholder',
      productionStatus: 'design-pending',
      backPolicy: 'twoSided',
    });
    expect(universal?.purpose).toContain('turn procedure');
    expect(universal?.source).toContain('Rulebook.md');
  });

  it('records the finalized Diplomat reference separately from the six references still awaiting refinement', () => {
    const references = components.filter(item => item.family === 'reference-card');
    const diplomat = component('diplomats-reference');
    const remaining = references.filter(item => item.id !== 'diplomats-reference');

    expect(references).toHaveLength(7);
    expect(references.every(item => item.productionStatus === 'ready')).toBe(true);
    expect(diplomat?.designStatus).toBe('final');
    expect(remaining).toHaveLength(6);
    expect(remaining.every(item => item.designStatus === 'refinement-pending')).toBe(true);
  });

  it('marks completed Proposal, Ledger, and Deed designs as export-pending rather than design/artwork-pending', () => {
    const proposals = components.filter(item => item.family === 'proposal-treaty-card');

    expect(proposals).toHaveLength(9);
    expect(proposals.every(item => item.designStatus === 'final')).toBe(true);
    expect(proposals.every(item => item.productionStatus === 'export-pending')).toBe(true);

    expect(component('financiers-capital-ledger')).toMatchObject({
      designStatus: 'final',
      productionStatus: 'export-pending',
    });
    expect(component('financiers-deed')).toMatchObject({
      designStatus: 'final',
      productionStatus: 'export-pending',
    });
  });

  it('preserves the current nested Intelligence tracker stack while rebasing the component contract', () => {
    expect(component('intelligence-intel-tracker')).toMatchObject({
      cover: { kind: 'leader' },
      tts: { layer: 2 },
    });
    expect(component('intelligence-operation-progress-tracker')).toMatchObject({
      cover: { kind: 'component', componentId: 'intelligence-intel-tracker' },
      tts: { layer: 1 },
    });
  });

  it('validates design status separately from production readiness', () => {
    expect(validator).toContain("const DESIGN_STATUSES = new Set(['final', 'refinement-pending', 'placeholder'])");
    expect(validator).toContain("sharedMap.get('universal-reference')");
    expect(validator).toContain("designStatusFor(universalReference) === 'placeholder'");
    expect(validator).toContain("designStatusFor(diplomatReference) === 'final'");
    expect(validator).toContain("designStatusFor(component) === 'refinement-pending'");
  });

  it('shows the universal placeholder in Card Design and every Deckbuilder package', () => {
    expect(supplementalRenderer).toContain('currentGame.sharedComponents');
    expect(supplementalRenderer).toContain("{ faction: 'neutral', factionLabel: 'Universal', cards: sharedCards }");
    expect(supplementalRenderer).toContain("component.referenceFaces?.front && component.referenceFaces?.reverse");
    expect(supplementalRenderer).toContain("component.designStatus === 'placeholder'");

    expect(deckbuilderComponents).toContain('currentGame.sharedComponents');
    expect(deckbuilderComponents).toContain('component.deckInclusion === "every-deck"');
    expect(deckbuilderComponents).toContain('divider.textContent = "Deck components"');
    expect(deckbuilderComponents).toContain('"Placeholder · design pending"');
  });

  it('keeps final Proposal faces on the production print path while their separate export remains pending', () => {
    expect(deckbuilderPrint).toContain('component.family === "proposal-treaty-card"');
    expect(deckbuilderPrint).toContain('(component.designStatus || "final") === "final"');
    expect(deckbuilderPrint).toContain('component.productionStatus === "export-pending"');
    expect(deckbuilderPrint).not.toContain('component.family === "proposal-treaty-card" && component.productionStatus === "artwork-pending"');
  });
});
