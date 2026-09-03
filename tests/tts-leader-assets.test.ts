import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const exporter = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const catalogSource = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('tts/README.md', 'utf8');

describe('TTS Leader assets', () => {
  it('derives the current Leader roster from the current-game authority', () => {
    expect(catalogSource).toContain('export async function loadCurrentLeaders()');
    expect(catalogSource).toContain('resolveCurrentTtsRelease()');
    expect(catalogSource).toContain('const sourceLeaders = Array.isArray(authority.leaders)');
    expect(catalogSource).toContain('for (const leader of sourceLeaders)');
    expect(exporter).toContain('loadCurrentLeaders');
    expect(exporter).not.toMatch(/v0\.6\.[0-9]+/);
  });

  it('captures the shared Card Design Leader surface instead of duplicating Leader rules or crop logic', () => {
    expect(exporter).toContain('/card-design/face-render.html');
    expect(exporter).not.toContain('/card-design/component-render.html');
    expect(exporter).toContain("url.searchParams.set('kind', 'leader')");
    expect(exporter).toContain("url.searchParams.set('version', displayVersion)");
    expect(exporter).toContain("return '#renderTarget > .leader-card'");
    expect(exporter).toContain("metrics.footer.at(-1) !== displayVersion");
    expect(exporter).toContain('fitWarning');
    expect(exporter).not.toContain('GauntletArtworkCrop.apply');
    expect(exporter).not.toContain('GAUNTLET_ART_DIRECTION');
    expect(exporter).not.toContain('Materia Prima');
    expect(exporter).not.toContain('Guardians of the Circle');
    expect(readme).toContain('does not maintain a second copy of Leader rules or layout');
  });

  it('captures exact production-surface Leader rasters without fractional-position inflation', () => {
    expect(exporter).toContain("surfaceRasterPixels('portrait')");
    expect(exporter).toContain("surfaceCssPixels('portrait')");
    expect(exporter).toContain("surfaceDeviceScale('portrait')");
    expect(exporter).not.toContain('const CARD_WIDTH = 400');
    expect(exporter).not.toContain('const CARD_HEIGHT = 560');
    expect(exporter).toContain("scale: 'device'");
    expect(exporter).toContain('width: CSS_CARD_WIDTH');
    expect(exporter).toContain('height: CSS_CARD_HEIGHT');
    expect(exporter).toContain('pngDimensions(await readFile(outputPath))');
    expect(exporter).toContain('Leader raster has unexpected dimensions');
    expect(exporter).toContain("boxShadow: 'none'");
  });

  it('emits deterministic one-card TTS objects with faction-color component backs', () => {
    expect(exporter).toContain('const FIRST_LEADER_DECK_ID = 100');
    expect(exporter).toContain('cardId: deckId * 100');
    expect(exporter).toContain('numWidth: 1');
    expect(exporter).toContain('numHeight: 1');
    expect(exporter).toContain('backIsHidden: true');
    expect(exporter).toContain('uniqueBack: false');
    expect(exporter).toContain('resolveFactionBackFile(componentContract, leader.faction)');
    expect(exporter).toContain("backPolicy: 'factionComponentBack'");
    expect(exporter).toContain("mode: 'faction'");
    expect(exporter).toContain("'leader-manifest.json'");
  });

  it('is wired into source checks, full builds, CI, and review artifacts', () => {
    expect(packageJson.scripts['tts:leaders']).toBe('node scripts/generate-tts-leader-assets.mjs');
    expect(packageJson.scripts['tts:check']).toContain('generate-tts-leader-assets.mjs --check');
    expect(packageJson.scripts['tts:build']).toContain('npm run tts:leaders');
    expect(workflow).toContain('scripts/generate-tts-leader-assets.mjs');
    expect(workflow).toContain('Generate Leader cards');
    expect(workflow).toContain('run: npm run tts:leaders');
    expect(workflow).toContain('path: tts/generated/');
    expect(readme).toContain('## Leader asset contract');
  });

  it('accepts the current Leader source end to end', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-leader-assets.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS Leader source check passed');
  });
});
