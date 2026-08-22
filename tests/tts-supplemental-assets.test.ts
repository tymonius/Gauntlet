import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSupplementalCatalog } from '../scripts/generate-tts-supplemental-assets.mjs';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const renderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const rendererCss = readFileSync('tts/supplemental-renderer/supplemental-renderer.css', 'utf8');
const supplementalRendererHtml = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const hostedAssetClient = readFileSync('scripts/tts-hosted-assets.mjs', 'utf8');
const assetGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const packageScript = readFileSync('scripts/package-tts-release.mjs', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('TTS supplemental component exports', () => {
  it('exports final Diplomat Proposal/Treaty pairs through the dedicated production path', async () => {
    const proposalCards = contract.components.filter((component: any) => component.family === 'proposal-treaty-card');
    expect(proposalCards).toHaveLength(9);
    expect(proposalCards.every((component: any) => component.designStatus === 'final')).toBe(true);
    expect(proposalCards.every((component: any) => component.productionStatus === 'export-pending')).toBe(true);
    expect(proposalCards.every((component: any) => component.backPolicy === 'twoSided')).toBe(true);

    const { catalog } = await buildSupplementalCatalog(contract);
    const proposals = catalog.ready.filter((component: any) => component.family === 'proposal-treaty-card');
    expect(proposals).toHaveLength(9);
    expect(proposals.every((component: any) => component.renderer === 'proposal-card')).toBe(true);
    expect(proposals.every((component: any) => component.faces?.front && component.faces?.reverse)).toBe(true);
  });

  it('exports finalized Financier Ledger and Deed surfaces through their production renderers', async () => {
    const ledger = contract.components.find((component: any) => component.id === 'financiers-capital-ledger');
    const deed = contract.components.find((component: any) => component.id === 'financiers-deed');
    expect(ledger).toMatchObject({ designStatus: 'final', productionStatus: 'export-pending' });
    expect(deed).toMatchObject({ designStatus: 'final', productionStatus: 'export-pending' });

    const { catalog } = await buildSupplementalCatalog(contract);
    const byId = new Map(catalog.ready.map((component: any) => [component.id, component]));
    expect(byId.get('financiers-capital-ledger')).toMatchObject({ renderer: 'capital-ledger' });
    expect(byId.get('financiers-deed')).toMatchObject({ renderer: 'deed-card' });
  });

  it('exports all three completed Rite artworks through their two-sided production card families', async () => {
    const rites = contract.components.filter((component: any) => component.family === 'rite-card');
    expect(rites).toHaveLength(3);
    expect(rites.every((component: any) => component.productionStatus === 'ready')).toBe(true);
    expect(rites.every((component: any) => component.reverseArtwork === 'images/artwork/supplemental/mystics/rite-completed.webp')).toBe(true);

    const { catalog } = await buildSupplementalCatalog(contract);
    const exported = catalog.ready.filter((component: any) => component.family === 'rite-card');
    expect(exported).toHaveLength(3);
    expect(exported.every((component: any) => component.renderer === 'rite-card')).toBe(true);
    expect(renderer).toContain("image.src = `/${String(record.reverseArtwork");
    expect(renderer).toContain("'mystics-rite-echoes': '◉'");
    expect(renderer).toContain("'mystics-rite-blood': '◆'");
    expect(renderer).toContain("'mystics-rite-crossing': '✦'");
  });

  it('treats every physical reference card as ready public two-sided material', async () => {
    const referenceCards = contract.components.filter((component: any) => component.family === 'reference-card');
    expect(referenceCards).toHaveLength(7);
    expect(referenceCards.every((component: any) => component.productionStatus === 'ready')).toBe(true);
    expect(referenceCards.every((component: any) => component.designStatus === 'final')).toBe(true);
    expect(referenceCards.every((component: any) => component.copyMode === 'bespoke')).toBe(true);
    expect(referenceCards.every((component: any) => component.backPolicy === 'twoSided')).toBe(true);
    expect(referenceCards.every((component: any) => component.tts?.representation === 'card')).toBe(true);
    expect(referenceCards.every((component: any) => component.referenceFaces?.front?.sections?.length)).toBe(true);
    expect(referenceCards.every((component: any) => component.referenceFaces?.reverse?.sections?.length)).toBe(true);

    const { catalog } = await buildSupplementalCatalog(contract);
    const references = catalog.ready.filter((component: any) => component.family === 'reference-card');
    expect(references).toHaveLength(referenceCards.length);
    expect(references.every((component: any) => component.renderer === 'reference-card')).toBe(true);
    expect(references.every((component: any) => component.faces?.front?.sections?.length)).toBe(true);
    expect(references.every((component: any) => component.faces?.reverse?.sections?.length)).toBe(true);

    const byId = new Map(references.map((component: any) => [component.id, component]));
    const diplomatReference = JSON.stringify(byId.get('diplomats-reference'));
    expect(diplomatReference).toContain('Treaty Articles');
    expect(diplomatReference).toContain('Peace Treaty');
    expect(JSON.stringify(byId.get('financiers-reference'))).toContain('Play the Market');
    expect(JSON.stringify(byId.get('financiers-reference'))).toContain('Subsidize');
    expect(JSON.stringify(byId.get('intelligence-mission-reference'))).toContain('Special Operations');
    expect(JSON.stringify(byId.get('intelligence-mission-reference'))).toContain('Complete & Win');
    expect(JSON.stringify(byId.get('intelligence-operations-reference'))).toContain('Direct Interference');
    expect(JSON.stringify(byId.get('mystics-reference'))).toContain('Convergence');
    expect(JSON.stringify(byId.get('inquisition-doctrine-reference'))).toContain('Blasphemy');
    expect(JSON.stringify(byId.get('inquisition-purge-reference'))).toContain('Direct Purges');
    expect(JSON.stringify(byId.get('inquisition-purge-reference'))).not.toContain('Final Judgment');

    expect(renderer).toContain("record.renderer === 'reference-card'");
    expect(renderer).toContain('Public supplemental reference · no card value · not part of the Deck');
    expect(rendererCss).toContain('Reference cards are intentionally distinct from playable cards');
    expect(rendererCss).toContain('.reference-table');
  });

  it('exports all six production tracker designs without confusing physical capacity with rules maximum', async () => {
    const trackers = contract.components.filter((component: any) => component.tts?.representation === 'sliding-tracker');
    expect(trackers).toHaveLength(6);
    expect(trackers.every((component: any) => component.productionStatus === 'ready')).toBe(true);
    expect(trackers.every((component: any) => component.backPolicy === 'standardBack')).toBe(true);
    expect(trackers.every((component: any) => component.tts.snapPositions === 'renderer-derived')).toBe(true);
    expect(trackers.every((component: any) => component.tts.stackable === false)).toBe(true);

    const command = trackers.find((component: any) => component.id === 'military-command-tracker');
    const capitalLimit = trackers.find((component: any) => component.id === 'financiers-capital-limit-tracker');
    const intel = trackers.find((component: any) => component.id === 'intelligence-intel-tracker');
    const progress = trackers.find((component: any) => component.id === 'intelligence-operation-progress-tracker');
    const conviction = trackers.find((component: any) => component.id === 'inquisition-conviction-tracker');

    expect(command.trackedValue.maximum).toBe(2);
    expect(capitalLimit.trackedValue.maximum).toBeNull();
    expect(intel.trackedValue.maximum).toBeNull();
    expect(progress.trackedValue.maximum).toBeNull();
    expect(conviction.trackedValue.maximum).toBe(4);

    expect(assetGenerator).toContain('physicalMax');
    expect(assetGenerator).toContain("record.tts?.snapPositions === 'renderer-derived'");
  });

  it('uses the production reference renderer and component refinements in the TTS supplemental render shell', () => {
    expect(supplementalRendererHtml).toContain('/card-design/reference-card.css');
    expect(supplementalRendererHtml).toContain('/card-design/supplemental-refinements.css');
    expect(renderer).toContain("from '/card-design/reference-card.js'");
    expect(renderer).toContain('fitReferenceCard(card)');
  });

  it('keeps public hosted supplemental names versioned and deterministic', () => {
    expect(hostedAssetClient).toContain('supplementalHostedAssetName');
    expect(hostedAssetClient).toContain('encodeURIComponent');
    expect(hostedAssetClient).toContain('releaseTarget.packageVersion');
  });

  it('includes supplemental generation in the normal TTS package path', () => {
    expect(packageJson.scripts['tts:supplementals']).toBeTruthy();
    expect(packageScript).toContain('generate-tts-supplemental-assets.mjs');
  });

  it('preserves the current component contract as the source of physical supplemental identity', () => {
    expect(assetGenerator).toContain("loadTtsComponentContract");
    expect(assetGenerator).toContain('contract.components');
    expect(assetGenerator).not.toContain('hardcodedSupplementals');
  });

  it('does not publish the design-pending Universal Reference as a fake finished supplemental', async () => {
    const universal = contract.sharedComponents.find((component: any) => component.id === 'universal-reference');
    expect(universal).toMatchObject({ designStatus: 'placeholder', productionStatus: 'design-pending' });

    const { catalog } = await buildSupplementalCatalog(contract);
    expect(catalog.ready.some((component: any) => component.id === 'universal-reference')).toBe(false);
  });

  it('keeps hosted file metadata attached to every rendered card-like supplemental', () => {
    expect(assetGenerator).toContain('frontFile');
    expect(assetGenerator).toContain('backFile');
    expect(assetGenerator).toContain('frontUrl');
    expect(assetGenerator).toContain('backUrl');
  });
});
