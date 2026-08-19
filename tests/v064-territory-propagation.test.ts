import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = JSON.parse(readFileSync('docs/v0.6.4-territories.json', 'utf8'));
const reference = readFileSync('docs/v0.6.4-territory-reference.md', 'utf8');
const reviewRenderer = readFileSync('card-design/territory-review-render.js', 'utf8');
const reviewPage = readFileSync('card-design/territory-review-render.html', 'utf8');
const specimen = readFileSync('card-design/territories/index.html', 'utf8');
const renderValidator = readFileSync('scripts/validate-v064-territory-render.mjs', 'utf8');
const renderWorkflow = readFileSync('.github/workflows/render-leader-card-specimens.yml', 'utf8');
const currentAuthority = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));

describe('v0.6.4 Territory downstream propagation', () => {
  it('binds the browser/TTS review renderer to the resolved current-game authority', () => {
    expect(currentAuthority.sources.territories).toBe('/docs/v0.6.4-territories.json');
    expect(reviewRenderer).toContain("loadCurrentGame");
    expect(reviewRenderer).toContain('currentGame.findTerritory(territoryId)');
    expect(reviewRenderer).toContain('source: currentGame.authorityUrl');
    expect(reviewRenderer).not.toContain("const CANDIDATE_SOURCE = '/docs/v0.6.4-territories.json'");
    expect(reviewRenderer).not.toContain('EXPECTED_SOURCE_ISSUE');
    expect(reviewRenderer).not.toContain('Gauntlet_v0.6.3_Canonical_Data.json');
    expect(reviewPage).toContain('Gauntlet v0.6.4 Candidate Territory Review Render');
  });

  it('keeps the dedicated High Ground specimen on the approved candidate text', () => {
    const highGround = source.territories.find((territory: any) => territory.id === 'territory-high-ground');
    expect(highGround).toBeDefined();
    expect(specimen).toContain(highGround.text);
    expect(specimen).toContain('v0.6.4 candidate');
    expect(specimen).not.toContain('The defending player in a battle on High Ground gains advantage.');
  });

  it('keeps the candidate reference synchronized with all 25 source entries', () => {
    for (const territory of source.territories) {
      expect(reference).toContain(`### ${territory.number}. ${territory.name}`);
      for (const line of territory.text.split('\n')) expect(reference).toContain(`> ${line}`);
    }
    expect(reference).toContain('Shared battle rules already require a Tiebreak Roll');
  });

  it('runs production-size render validation through the authority-selected Territory source in CI', () => {
    expect(renderValidator).toContain("readCurrentJsonSource('territories')");
    expect(renderValidator).toContain('source.version !== manifest.version');
    expect(renderValidator).toContain('source.base_version !== manifest.baseVersion');
    expect(renderValidator).toContain('const EXPECTED_SOURCE_ISSUE = 738');
    expect(renderValidator).toContain('const CSS_WIDTH = 336');
    expect(renderValidator).toContain('const CSS_HEIGHT = 240');
    expect(renderValidator).toContain('const OUTPUT_WIDTH = 560');
    expect(renderValidator).toContain('const OUTPUT_HEIGHT = 400');
    expect(renderValidator).toContain("metric.artworkLoaded !== 'true'");
    expect(renderWorkflow).toContain('docs/v0.6.4-territories.json');
    expect(renderWorkflow).toContain('node scripts/validate-v064-territory-render.mjs');
    expect(renderWorkflow).toContain('card-design/generated/territories-v064/');
  });
});
