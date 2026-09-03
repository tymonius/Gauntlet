import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historical = JSON.parse(readFileSync('docs/v0.6.4-territories.json', 'utf8'));
const reference = readFileSync('docs/v0.6.4-territory-reference.md', 'utf8');
const reviewRenderer = readFileSync('card-design/territory-review-render.js', 'utf8');
const reviewPage = readFileSync('card-design/territory-review-render.html', 'utf8');
const specimen = readFileSync('card-design/territories/index.html', 'utf8');
const renderValidator = readFileSync('scripts/validate-current-territory-render.mjs', 'utf8');
const renderWorkflow = readFileSync('.github/workflows/render-leader-card-specimens.yml', 'utf8');
const currentAuthority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('historical v0.6.4 Territory derivation and current authority propagation', () => {
  it('keeps the accepted v0.6.4 Territory document only as derivation provenance', () => {
    expect(currentAuthority.authority).toBe('current-game');
    expect(currentAuthority.provenance.historicalInputs.territories).toBe('/docs/v0.6.4-territories.json');
    expect(currentAuthority.gameplay.territories).toEqual(historical.territories);
    expect(currentAuthority).not.toHaveProperty('sources');
  });

  it('binds the browser/TTS review renderer directly to current-game authority', () => {
    expect(reviewRenderer).toContain("import { loadRenderContext } from './render-context.mjs'");
    expect(reviewRenderer).toContain('const renderContext = await loadRenderContext()');
    expect(reviewRenderer).toContain('const currentGame = renderContext.game');
    expect(reviewRenderer).toContain('currentGame.findTerritory(territoryId)');
    expect(reviewRenderer).toContain('source: currentGame.authorityUrl');
    expect(reviewRenderer).not.toContain('v0.6.4-territories.json');
    expect(reviewRenderer).not.toContain('EXPECTED_SOURCE_ISSUE');
    expect(reviewRenderer).not.toContain('Gauntlet_v0.6.3_Canonical_Data.json');
    expect(reviewPage).toContain('Gauntlet canonical Territory render');
  });

  it('preserves the accepted High Ground wording in the flattened authority and specimen', () => {
    const highGround = currentAuthority.gameplay.territories.find((territory: any) => territory.id === 'territory-high-ground');
    expect(highGround).toBeDefined();
    expect(highGround.text).toBe(historical.territories.find((territory: any) => territory.id === 'territory-high-ground').text);
    expect(specimen).toContain(highGround.text);
    expect(specimen).not.toContain('The defending player in a battle on High Ground gains advantage.');
  });

  it('keeps the historical reference synchronized as provenance documentation', () => {
    for (const territory of historical.territories) {
      expect(reference).toContain(`### ${territory.number}. ${territory.name}`);
      for (const line of territory.text.split('\n')) expect(reference).toContain(`> ${line}`);
    }
    expect(reference).toContain('Shared battle rules already require a Tiebreak Roll');
  });

  it('runs production-size validation against the complete current authority', () => {
    expect(renderValidator).toContain('loadCurrentGameAuthority');
    expect(renderValidator).toContain('authority.gameplay?.territories');
    expect(renderValidator).toContain('validateCurrentGameAuthority(authority)');
    expect(renderValidator).not.toContain("authority.version !== 'v0.7.0'");
    expect(renderValidator).not.toContain('readCurrentJsonSource');
    expect(renderValidator).not.toContain('source.base_version');
    expect(renderValidator).not.toContain('EXPECTED_SOURCE_ISSUE');
    expect(renderValidator).toContain("surfaceCssPixels('landscape')");
    expect(renderValidator).toContain("surfaceRasterPixels('landscape')");
    expect(renderValidator).toContain("surfaceDeviceScale('landscape')");
    expect(renderValidator).not.toContain('const CSS_WIDTH = 336');
    expect(renderValidator).not.toContain('const OUTPUT_WIDTH = 560');
    expect(renderValidator).toContain("metric.artworkLoaded !== 'true'");
    expect(renderWorkflow).toContain('game-data/**');
    expect(renderWorkflow).toContain('node scripts/validate-current-territory-render.mjs');
    expect(renderWorkflow).toContain('card-design/generated/current-territories/');
  });
});
