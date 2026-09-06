import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const contract = currentGame.componentContract;
const validator = readFileSync('scripts/tts-component-contract.mjs', 'utf8');
const supplementalRenderer = readFileSync('card-design/supplemental-card.js', 'utf8');
const referenceRenderer = readFileSync('card-design/reference-card.js', 'utf8');
const deckbuilderComponents = readFileSync('deckbuilder/faction-components.js', 'utf8');
const deckbuilderPrint = readFileSync('deckbuilder/production-print.js', 'utf8');

const components = contract.components as Array<Record<string, any>>;
const sharedComponents = contract.sharedComponents as Array<Record<string, any>>;

function component(id: string) {
  return components.find(item => item.id === id);
}

describe('physical component design maturity', () => {
  it('declares a final production-ready Universal Reference Card for every deck', () => {
    const universal = sharedComponents.find(item => item.id === 'universal-reference');

    expect(universal).toMatchObject({
      name: 'Universal Reference Card',
      family: 'reference-card',
      quantityPerPlayer: 1,
      deckInclusion: 'every-deck',
      cardLike: true,
      designStatus: 'final',
      productionStatus: 'ready',
      backPolicy: 'twoSided',
      copyMode: 'bespoke',
      source: 'card-design/reference-copy/v0.7.0/universal-reference.md',
      authoritySource: 'rulebook/player-facing/current-rulebook.md',
    });
    expect(universal?.referenceFaces?.front?.title).toBe('Turn & Battle');
    expect(universal?.referenceFaces?.reverse?.title).toBe('Results & Control');
    expect(universal?.purpose).toContain('turn procedure');
  });

  it('records all seven faction reference cards as final authored player aids', () => {
    const references = components.filter(item => item.family === 'reference-card');

    expect(references).toHaveLength(7);
    expect(references.every(item => item.productionStatus === 'ready')).toBe(true);
    expect(references.every(item => item.designStatus === 'final')).toBe(true);
    expect(references.every(item => item.copyMode === 'bespoke')).toBe(true);
    expect(references.every(item => item.source.startsWith('card-design/reference-copy/v0.7.0/'))).toBe(true);
    expect(references.every(item => item.authoritySource === 'game-data/current-game.json')).toBe(true);

    expect(references.map(item => item.id).sort()).toEqual([
      'diplomats-reference',
      'financiers-reference',
      'inquisition-doctrine-reference',
      'inquisition-purge-reference',
      'intelligence-mission-reference',
      'intelligence-operations-reference',
      'mystics-reference',
    ]);
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

  it('validates final shared and faction reference design status', () => {
    expect(validator).toContain("const DESIGN_STATUSES = new Set(['final', 'refinement-pending', 'placeholder'])");
    expect(validator).toContain("sharedMap.get('universal-reference')");
    expect(validator).toContain("designStatusFor(universalReference) === 'final'");
    expect(validator).toContain("universalReference.productionStatus === 'ready'");
    expect(validator).toContain("factionReferences.every((component) => designStatusFor(component) === 'final')");
    expect(validator).toContain("factionReferences.every((component) => component.copyMode === 'bespoke')");
    expect(validator).not.toContain('must remain a design-pending placeholder');
  });

  it('shows the finished universal reference in Card Design and every Deckbuilder package', () => {
    expect(supplementalRenderer).toContain('currentGame.sharedComponents');
    expect(supplementalRenderer).toContain("{ faction: 'neutral', factionLabel: 'Universal', cards: sharedCards }");
    expect(supplementalRenderer).toContain("component.referenceFaces?.front && component.referenceFaces?.reverse");
    expect(referenceRenderer).toContain("...(currentGame.sharedComponents || [])");
    expect(referenceRenderer).toContain("faction: component.faction || 'neutral'");

    expect(deckbuilderComponents).toContain('currentGame.sharedComponents');
    expect(deckbuilderComponents).toContain('component.deckInclusion === "every-deck"');
    expect(deckbuilderComponents).toContain('divider.textContent = "Deck components"');
    expect(deckbuilderComponents).toContain('return "Final design"');
  });

  it('keeps final Proposal faces on the production print path while their separate export remains pending', () => {
    expect(deckbuilderPrint).toContain('component.family === "proposal-treaty-card"');
    expect(deckbuilderPrint).toContain('(component.designStatus || "final") === "final"');
    expect(deckbuilderPrint).toContain('component.productionStatus === "export-pending"');
    expect(deckbuilderPrint).not.toContain('component.family === "proposal-treaty-card" && component.productionStatus === "artwork-pending"');
  });
});
