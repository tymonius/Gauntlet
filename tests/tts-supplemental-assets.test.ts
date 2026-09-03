import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSupplementalCatalog } from '../scripts/generate-tts-supplemental-assets.mjs';
import { loadTtsComponentContract } from '../scripts/tts-component-contract.mjs';

const contract = await loadTtsComponentContract();
const generator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const trackerHelper = readFileSync('scripts/tts-sliding-trackers.mjs', 'utf8');
const geometry = readFileSync('scripts/tts-supplemental-geometry.mjs', 'utf8');
const productionSupplementals = readFileSync('card-design/supplemental-card.js', 'utf8');
const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');
const riteDesign = readFileSync('card-design/rite-card.js', 'utf8');
const referenceCss = readFileSync('card-design/reference-card.css', 'utf8');
const referenceDividerCss = readFileSync('card-design/reference-divider-rules.css', 'utf8');
const universalReferenceCss = readFileSync('card-design/universal-reference.css', 'utf8');
const stager = readFileSync('scripts/stage-tts-release-assets.mjs', 'utf8');
const assembler = readFileSync('scripts/assemble-tts-supplemental-save.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function allReferenceComponents() {
  return [
    ...contract.sharedComponents.filter((component: any) => component.family === 'reference-card'),
    ...contract.components.filter((component: any) => component.family === 'reference-card'),
  ];
}

describe('TTS supplemental component exports', () => {
  it('derives ready and pending supplemental inventory from the physical component contract', async () => {
    const { catalog } = await buildSupplementalCatalog(contract);
    const expectedSupplementals = [
      ...contract.sharedComponents.filter((component: any) => component.family === 'reference-card'),
      ...contract.components,
    ];
    const expectedReady = expectedSupplementals.filter((component: any) => component.productionStatus === 'ready');
    const expectedPending = expectedSupplementals.filter((component: any) => component.productionStatus !== 'ready');

    expect(catalog.readyCount).toBe(expectedReady.length);
    expect(catalog.pendingCount).toBe(expectedPending.length);
    expect(catalog.ready.map((component: any) => component.id)).toEqual(expectedReady.map((component: any) => component.id));
    expect(catalog.pending.map((component: any) => component.id)).toEqual(expectedPending.map((component: any) => component.id));
    expect(generator).not.toMatch(/readyCount\s*[:=]\s*\d+|pendingCount\s*[:=]\s*\d+/);
  });

  it('packages the full current Mystics Rite pool and Ritual from physical component authority', async () => {
    const physicalReadyRites = contract.components.filter((component: any) =>
      component.family === 'rite-card' && component.productionStatus === 'ready'
    );
    const ritual = contract.components.find((component: any) => component.family === 'ritual-card');
    expect(currentGame.mystics.rites).toHaveLength(6);
    expect(physicalReadyRites).toHaveLength(currentGame.mystics.rites.length);
    expect(physicalReadyRites.every((component: any) => component.deckInclusion === 'selected-rite')).toBe(true);
    expect(ritual).toMatchObject({
      id: 'mystics-ritual-of-ascension',
      productionStatus: 'ready',
      backPolicy: 'specialBack',
    });

    const { catalog } = await buildSupplementalCatalog(contract);
    expect(catalog.ready.some((component: any) => component.id === ritual.id && component.renderer === 'ritual-card')).toBe(true);
    expect(generator).toContain("['ritual-card', 'ritual-card']");
    expect(generator).toContain("return { kind: 'ritual', id: String(record.id).replace(/^mystics-ritual-of-/, '') }");
  });
  it('exports the ready Mystics Rites as source-driven two-sided cards', async () => {
    const riteCards = contract.components.filter((component: any) => component.family === 'rite-card');
    expect(riteCards).toHaveLength(currentGame.mystics.rites.length);
    expect(riteCards.every((component: any) => component.productionStatus === 'ready')).toBe(true);
    expect(riteCards.every((component: any) => component.backPolicy === 'twoSided')).toBe(true);
    expect(new Set(riteCards.map((component: any) => component.reverseArtwork)).size).toBe(1);

    const { catalog } = await buildSupplementalCatalog(contract);
    const echoes = catalog.ready.find((component: any) => component.name === 'Rite of Echoes');
    const blood = catalog.ready.find((component: any) => component.name === 'Rite of Blood');
    const crossing = catalog.ready.find((component: any) => component.name === 'Rite of Crossing');
    const echoesText = JSON.stringify(echoes?.front?.blocks || []);
    const bloodText = JSON.stringify(blood?.front?.blocks || []);
    const crossingText = JSON.stringify(crossing?.front?.blocks || []);

    expect(echoesText).toContain(currentGame.mystics.rites.find((rite: any) => rite.id === 'echoes').complete);
    expect(bloodText).toContain(currentGame.mystics.rites.find((rite: any) => rite.id === 'blood').complete);
    expect(crossingText).toContain(currentGame.mystics.rites.find((rite: any) => rite.id === 'crossing').begin);
    expect(crossingText).not.toContain('Ritual of Ascendance');
    expect(generator).toContain('/card-design/face-render.html');
    expect(generator).not.toContain('/card-design/component-render.html');
    expect(generator).toContain("return { kind: 'rite', id: String(record.id).replace(/^mystics-rite-/, '') }");
    expect(generator).not.toContain('/tts/supplemental-renderer/');
    expect(riteDesign).toContain('class="rite-faction-emblem"');
    expect(riteDesign).toContain('completedArtwork(rite)');
    expect(componentRenderer).toContain('await loadCanonicalRenderContext()');
    expect(componentRenderer).toContain('window.GAUNTLET_ART_DIRECTION = renderContext.artDirection || {}');
    expect(componentRenderer).toContain('document.body.dataset.productionFontsReady');
    expect(componentRenderer).not.toContain('preloadProductionFonts');
  });

  it('treats every physical reference card as ready public two-sided material', async () => {
    const referenceCards = allReferenceComponents();
    expect(referenceCards).toHaveLength(8);
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
    expect(JSON.stringify(byId.get('universal-reference'))).toContain('Turn Sequence');
    expect(JSON.stringify(byId.get('universal-reference'))).toContain('Battle Sequence');
    expect(JSON.stringify(byId.get('universal-reference'))).not.toContain('Terms');
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

    expect(generator).toContain("return { kind: 'reference', id: record.id }");
    expect(componentRenderer).toContain('"reference"');
    expect(componentRenderer).toContain('versionOverride');
    expect(referenceCss).toContain('.reference-watermark');
    expect(referenceCss).toContain('.reference-table');
    expect(referenceDividerCss).toContain('border-top: 0 !important');
    expect(universalReferenceCss).toContain('.reference-card[data-component-id="universal-reference"] .reference-watermark');
    expect(universalReferenceCss).toContain('mask-image: url("../images/Gauntlet.svg")');
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
    expect(command.trackedValue.maximum).toBe(2);
    expect(capitalLimit.trackedValue.maximum).toBeNull();
    expect(capitalLimit.trackedValue.starting).toBe(3);
    expect(intel.trackedValue.maximum).toBeNull();
    expect(progress.trackedValue.maximum).toBeNull();

    expect(command.presentation?.tracker?.scaleMaximum).toBe(4);
    expect(trackers.find((component: any) => component.id === 'diplomats-influence-tracker')?.presentation?.tracker?.scaleMaximum).toBe(10);
    expect(capitalLimit.presentation?.tracker?.scaleMaximum).toBe(15);
    expect(intel.presentation?.tracker?.scaleMaximum).toBe(12);
    expect(progress.presentation?.tracker?.scaleMaximum).toBe(8);
    expect(trackers.find((component: any) => component.id === 'inquisition-conviction-tracker')?.presentation?.tracker?.scaleMaximum).toBe(4);
    expect(productionSupplementals).toContain('component.presentation?.tracker');
    expect(productionSupplementals).not.toContain('const TRACKER_PRESENTATION');

    const { catalog } = await buildSupplementalCatalog(contract);
    const readyTrackers = catalog.ready.filter((component: any) => component.representation === 'sliding-tracker');
    expect(readyTrackers).toHaveLength(6);
    expect(readyTrackers.every((component: any) => component.renderer === 'sliding-tracker')).toBe(true);
    expect(readyTrackers.every((component: any) => component.renderSource?.componentId)).toBe(true);
    expect(readyTrackers.every((component: any) => component.cover?.kind)).toBe(true);
  });

  it('maps the actual rendered registration lines onto the live tracker collider', () => {
    expect(generator).toContain('captureProductionTracker');
    expect(trackerHelper).toContain('/card-design/face-render.html');
    expect(trackerHelper).not.toContain('/card-design/component-render.html');
    expect(trackerHelper).toContain("url.searchParams.set('kind', 'tracker')");
    expect(trackerHelper).toContain("url.searchParams.set('version', displayVersion)");
    expect(trackerHelper).toContain('.tracker-registration-line');
    expect(trackerHelper).toContain('registrationFraction: rendererTravelPx / rect.height');
    expect(trackerHelper).toContain('{ value: 0, rendererTravelPx: 0, registrationFraction: 0 }');
    expect(trackerHelper).toContain('registration lines are not strictly increasing from the covered position');
    expect(trackerHelper).not.toContain('value / max');
    expect(trackerHelper).not.toContain('PHYSICAL_CARD_HEIGHT /');
    expect(geometry).toContain('self.getBoundsNormalized()');
    expect(geometry).toContain('local localLength = bounds.size.z / scaleZ');
    expect(geometry).toContain('-localLength * registration.fraction');
    expect(geometry).toContain('Wait.condition(');
    expect(geometry).not.toContain('3.06');
    expect(geometry).not.toContain('rendererTravelPx /');
    expect(geometry).not.toContain('physicalTravel');
    expect(geometry).not.toContain('value / max');
  });

  it('declares the nested Intelligence cover chain and distinct tracker layers', () => {
    const byId = new Map(contract.components.map((component: any) => [component.id, component]));
    expect(byId.get('military-command-tracker').cover).toEqual({ kind: 'leader' });
    expect(byId.get('diplomats-influence-tracker').cover).toEqual({ kind: 'leader' });
    expect(byId.get('financiers-capital-limit-tracker').cover).toEqual({ kind: 'leader' });
    expect(byId.get('inquisition-conviction-tracker').cover).toEqual({ kind: 'leader' });
    expect(byId.get('intelligence-intel-tracker').cover).toEqual({ kind: 'leader' });
    expect(byId.get('intelligence-operation-progress-tracker').cover).toEqual({ kind: 'component', componentId: 'intelligence-intel-tracker' });

    const intelligenceTrackers = contract.components.filter((component: any) => component.tts?.assembly === 'intelligence-progress');
    expect(intelligenceTrackers).toHaveLength(2);
    expect(new Set(intelligenceTrackers.map((component: any) => component.tts.snapTag)).size).toBe(2);
    expect(byId.get('intelligence-operation-progress-tracker').tts.layer).toBe(1);
    expect(byId.get('intelligence-intel-tracker').tts.layer).toBe(2);
  });

  it('extracts reference content from declared current-reference headings instead of copied rules strings', () => {
    for (const component of allReferenceComponents()) {
      expect(component.referenceFaces).toBeTruthy();
      expect(JSON.stringify(component.referenceFaces)).not.toMatch(/begin with \d+|maximum \d+|spend \d+|gain \d+/i);
    }
    expect(generator).toContain('parseReferenceSection');
    expect(generator).toContain('headingLines(markdown, heading, depth)');
    expect(generator).toContain('selector.ruleLabel');
    expect(generator).toContain("blocks: parseMarkdownBlocks(lines, `${componentName} — ${heading}`)");
  });

  it('fails closed when a ready supplemental family or required representation input has no exporter', () => {
    expect(generator).toContain('Ready supplemental component ${component.id} has no supported exporter');
    expect(generator).toContain('must declare an intrinsic reverse before card export');
    expect(generator).toContain('is two-sided but has no reverseArtwork');
    expect(generator).toContain('must declare referenceFaces.front and referenceFaces.reverse');
    expect(generator).toContain('reference selector must declare heading and depth');
    expect(generator).toContain('Canonical supplemental source is missing heading');
    expect(generator).toContain('No printable rules were extracted');
    expect(trackerHelper).toContain('must derive snap registration from the production renderer');
    expect(trackerHelper).toContain('expected exactly one');
  });

  it('stages ready supplemental network assets and assembles shared cards plus faction components into starter bags', () => {
    expect(stager).toContain("readJson(join(outputRoot, 'supplemental-manifest.json'))");
    expect(stager).toContain("'supplemental-front'");
    expect(stager).toContain("'supplemental-reverse'");
    expect(stager).toContain("'supplemental-tracker-face'");
    expect(stager).toContain('_Supplemental_Manifest.json');
    expect(assembler).toContain("readFile(join(release.outputRoot, 'supplemental-manifest.json')");
    expect(assembler).toContain('function componentAppliesToStarter');
    expect(assembler).toContain("component?.deckInclusion === 'every-deck'");
    expect(assembler).toContain("component?.family === 'rite-card'");
    expect(assembler).toContain('selectedRites.includes(riteIdFromComponent(component))');
    expect(assembler).toContain('ready.filter(component => componentAppliesToStarter(component, starter))');
    expect(assembler).toContain("component.productionStatus !== 'ready'");
    expect(assembler).toContain('cleanPriorAssembly(save, trackerTags)');
    expect(assembler).toContain('SUPPLEMENTAL_GUID_NOTE_PREFIX');
    expect(assembler).toContain('SUPPLEMENTAL_STACK_NOTE_PREFIX');
    expect(assembler).toContain("Name: 'Custom_Tile'");
    expect(assembler).toContain('const presentation = trackerPresentation(component)');
    expect(assembler).not.toContain('AttachedSnapPoints:');
    expect(assembler).toContain('ImageSecondaryURL: backUrl');
    expect(assembler).toContain('wireTrackerCovers(bag, starter, trackers, trackerTags)');
  });

  it('is wired into source checks, package generation, save assembly, validation, and TTS CI', () => {
    expect(packageJson.scripts['tts:supplementals:check']).toBe('node scripts/generate-tts-supplemental-assets.mjs --check');
    expect(packageJson.scripts['tts:supplementals']).toBe('node scripts/generate-tts-supplemental-assets.mjs');
    expect(packageJson.scripts['tts:save:assemble']).toBe('node scripts/assemble-tts-supplemental-save.mjs');
    expect(packageJson.scripts['tts:check']).toContain('assemble-tts-supplemental-save.mjs --check');
    expect(packageJson.scripts['tts:check']).toContain('tts-supplemental-geometry.mjs');
    expect(packageJson.scripts['tts:package']).toContain('npm run tts:supplementals');
    expect(packageJson.scripts['tts:package']).toContain('npm run tts:save:assemble');
    expect(packageJson.scripts['tts:package']).toContain('validate-current-authoritative-save.mjs');
    expect(workflow).toContain('scripts/generate-tts-supplemental-assets.mjs');
    expect(workflow).toContain('scripts/assemble-tts-supplemental-save.mjs');
    expect(workflow).toContain('scripts/tts-supplemental-geometry.mjs');
    expect(workflow).toContain('Generate ready supplemental components');
    expect(workflow).toContain('Generate finalized Proposal, Ledger, and Deed components');
    expect(workflow).toContain('if [[ "$render_supplementals" == "true" ]]');
    expect(workflow).toContain('render_finalized=true');
    expect(workflow).not.toContain('render_mystics');
    expect(workflow).not.toContain('render-current-mystics-assets.mjs');
    expect(workflow).toContain('Assemble supplemental starter-kit contents');
    expect(workflow).toContain('Validate authoritative current TTS save contract');
    expect(workflow).toContain('run: npm run tts:save:assemble');
  });

  it('accepts the current component contract and authoritative supplemental sections end to end', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-supplemental-assets.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS supplemental source check passed');
  });
});
