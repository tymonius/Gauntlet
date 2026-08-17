import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSupplementalCatalog } from '../scripts/generate-tts-supplemental-assets.mjs';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const generator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const renderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const rendererCss = readFileSync('tts/supplemental-renderer/supplemental-renderer.css', 'utf8');
const stager = readFileSync('scripts/stage-tts-release-assets.mjs', 'utf8');
const assembler = readFileSync('scripts/assemble-tts-supplemental-save.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('TTS supplemental component exports', () => {
  it('derives ready and pending supplemental inventory from the physical component contract', async () => {
    const { catalog } = await buildSupplementalCatalog(contract);
    const expectedReady = contract.components.filter((component: any) => component.productionStatus === 'ready');
    const expectedPending = contract.components.filter((component: any) => component.productionStatus !== 'ready');

    expect(catalog.readyCount).toBe(expectedReady.length);
    expect(catalog.pendingCount).toBe(expectedPending.length);
    expect(catalog.ready.map((component: any) => component.id)).toEqual(expectedReady.map((component: any) => component.id));
    expect(catalog.pending.map((component: any) => component.id)).toEqual(expectedPending.map((component: any) => component.id));
    expect(generator).not.toMatch(/readyCount\s*[:=]\s*\d+|pendingCount\s*[:=]\s*\d+/);
  });

  it('exports the ready Mystics Rites as source-driven two-sided cards', async () => {
    const riteCards = contract.components.filter((component: any) => component.family === 'rite-card');
    expect(riteCards).toHaveLength(3);
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

    expect(echoesText).toContain('Gambit, Tactic, or Gambit or Tactic effect');
    expect(bloodText).toContain('without setting a Gambit or choosing a Tactic');
    expect(crossingText).toContain('during Denouement');
    expect(crossingText).not.toContain('Ritual of Ascendance');
    expect(renderer).toContain("image.src = `/${String(record.reverseArtwork");
    expect(renderer).toContain("'mystics-rite-echoes': '◉'");
    expect(renderer).toContain("'mystics-rite-blood': '◆'");
    expect(renderer).toContain("'mystics-rite-crossing': '✦'");
  });

  it('treats every physical reference card as ready public two-sided material', async () => {
    const referenceCards = contract.components.filter((component: any) => component.family === 'reference-card');
    expect(referenceCards).toHaveLength(7);
    expect(referenceCards.every((component: any) => component.productionStatus === 'ready')).toBe(true);
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
    expect(JSON.stringify(byId.get('diplomats-reference'))).toContain('Treaty Articles and Peace Treaty');
    expect(JSON.stringify(byId.get('financiers-reference'))).toContain('Play the Market');
    expect(JSON.stringify(byId.get('financiers-reference'))).toContain('Subsidize');
    expect(JSON.stringify(byId.get('intelligence-mission-reference'))).toContain('Starting a Special Operation');
    expect(JSON.stringify(byId.get('intelligence-operations-reference'))).toContain('Direct Interference');
    expect(JSON.stringify(byId.get('mystics-reference'))).toContain('Convergence');
    expect(JSON.stringify(byId.get('inquisition-doctrine-reference'))).toContain('Blasphemy');
    expect(JSON.stringify(byId.get('inquisition-purge-reference'))).toContain('Final Judgment');

    expect(renderer).toContain("record.renderer === 'reference-card'");
    expect(renderer).toContain('Public supplemental reference · no card value · not part of the Deck');
    expect(rendererCss).toContain('Reference cards are intentionally distinct from playable cards');
    expect(rendererCss).toContain('.reference-table');
  });

  it('extracts reference content from declared current-guide headings instead of copied rules strings', () => {
    for (const component of contract.components.filter((item: any) => item.family === 'reference-card')) {
      expect(component.referenceFaces).toBeTruthy();
      expect(JSON.stringify(component.referenceFaces)).not.toMatch(/begin with \d+|maximum \d+|spend \d+|gain \d+/i);
    }
    expect(generator).toContain('parseReferenceSection');
    expect(generator).toContain('headingLines(markdown, heading, depth)');
    expect(generator).toContain('selector.ruleLabel');
    expect(generator).toContain("blocks: parseMarkdownBlocks(lines, `${componentName} — ${heading}`)");
  });

  it('fails closed when a ready supplemental family or required side has no exporter', () => {
    expect(generator).toContain('Ready supplemental component ${component.id} has no supported exporter');
    expect(generator).toContain('must be explicitly two-sided before export');
    expect(generator).toContain('is two-sided but has no reverseArtwork');
    expect(generator).toContain('must declare referenceFaces.front and referenceFaces.reverse');
    expect(generator).toContain('reference selector must declare heading and depth');
    expect(generator).toContain('Canonical supplemental source is missing heading');
    expect(generator).toContain('No printable rules were extracted');
  });

  it('stages ready supplemental network assets and assembles them by starter faction', () => {
    expect(stager).toContain("readJson(join(outputRoot, 'supplemental-manifest.json'))");
    expect(stager).toContain("'supplemental-front'");
    expect(stager).toContain("'supplemental-reverse'");
    expect(stager).toContain('_Supplemental_Manifest.json');
    expect(assembler).toContain("readFile(join(release.outputRoot, 'supplemental-manifest.json')");
    expect(assembler).toContain('component.faction === starter.factionId');
    expect(assembler).toContain("component.productionStatus !== 'ready'");
    expect(assembler).toContain("object?.GMNotes || '').startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX");
  });

  it('is wired into source checks, package generation, save assembly, and TTS CI', () => {
    expect(packageJson.scripts['tts:supplementals:check']).toBe('node scripts/generate-tts-supplemental-assets.mjs --check');
    expect(packageJson.scripts['tts:supplementals']).toBe('node scripts/generate-tts-supplemental-assets.mjs');
    expect(packageJson.scripts['tts:save:assemble']).toBe('node scripts/assemble-tts-supplemental-save.mjs');
    expect(packageJson.scripts['tts:check']).toContain('assemble-tts-supplemental-save.mjs --check');
    expect(packageJson.scripts['tts:package']).toContain('npm run tts:supplementals');
    expect(packageJson.scripts['tts:package']).toContain('npm run tts:save:assemble');
    expect(workflow).toContain('scripts/generate-tts-supplemental-assets.mjs');
    expect(workflow).toContain('scripts/assemble-tts-supplemental-save.mjs');
    expect(workflow).toContain('Generate ready supplemental components');
    expect(workflow).toContain('Assemble ready supplemental components into review scaffold');
    expect(workflow).toContain('run: npm run tts:save:assemble');
  });

  it('accepts the current component contract and authoritative supplemental sections end to end', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-supplemental-assets.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS supplemental source check passed');
  });
});
