import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSupplementalCatalog } from '../scripts/generate-tts-supplemental-assets.mjs';

const contract = JSON.parse(readFileSync('config/tts-component-contract.json', 'utf8'));
const generator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const renderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const stager = readFileSync('scripts/stage-tts-release-assets.mjs', 'utf8');
const savePublisher = readFileSync('scripts/generate-tts-save.mjs', 'utf8');
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
    expect(generator).not.toMatch(/readyCount\s*[:=]\s*3|pendingCount\s*[:=]\s*\d+/);
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

  it('fails closed when a ready supplemental family has no exporter', () => {
    expect(generator).toContain('Ready supplemental component ${component.id} has no supported exporter');
    expect(generator).toContain('must be explicitly two-sided before export');
    expect(generator).toContain('is two-sided but has no reverseArtwork');
    expect(generator).toContain('No printable rules were extracted');
  });

  it('stages ready supplemental network assets while leaving save placement deferred', () => {
    expect(stager).toContain("readJson(join(outputRoot, 'supplemental-manifest.json'))");
    expect(stager).toContain("'supplemental-front'");
    expect(stager).toContain("'supplemental-reverse'");
    expect(stager).toContain('_Supplemental_Manifest.json');
    expect(generator).toContain('includedInReviewSave: false');
    expect(savePublisher).not.toContain("readJson(join(outputRoot, 'supplemental-manifest.json'))");
  });

  it('is wired into source checks, package generation, and TTS CI', () => {
    expect(packageJson.scripts['tts:supplementals:check']).toBe('node scripts/generate-tts-supplemental-assets.mjs --check');
    expect(packageJson.scripts['tts:supplementals']).toBe('node scripts/generate-tts-supplemental-assets.mjs');
    expect(packageJson.scripts['tts:check']).toContain('tts:supplementals:check');
    expect(packageJson.scripts['tts:package']).toContain('npm run tts:supplementals');
    expect(workflow).toContain('scripts/generate-tts-supplemental-assets.mjs');
    expect(workflow).toContain('Generate ready supplemental components');
    expect(workflow).toContain('run: npm run tts:supplementals');
  });

  it('accepts the current component contract and authoritative Rite sections end to end', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-supplemental-assets.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS supplemental source check passed');
  });
});
