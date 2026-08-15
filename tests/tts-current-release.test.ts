import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubReleaseContract = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const catalogSource = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const territoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const cardRenderer = readFileSync('tts/renderer/index.html', 'utf8');
const territoryRenderer = readFileSync('tts/territory-renderer/index.html', 'utf8');
const backRenderer = readFileSync('tts/back-renderer/index.html', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const readme = readFileSync('tts/README.md', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const supportedPipelineText = [
  catalogSource,
  cardGenerator,
  territoryGenerator,
  cardRenderer,
  territoryRenderer,
  workflow,
].join('\n');

describe('durable current-release TTS pipeline', () => {
  it('resolves current authority from the normal release lifecycle and GitHub release contract', () => {
    const current = lifecycle.current_release;
    expect(current).toBeTruthy();
    expect(lifecycle.releases[current]?.status).toBe('current');
    expect(lifecycle.releases[current]?.public_cutover).toBe(true);
    expect(githubReleaseContract.current_release?.tag).toBe(current);
    expect(githubReleaseContract.current_release?.status).toBe('current');

    const canonical = githubReleaseContract.current_release.assets.find((asset: string) => /_Canonical_Data\.json$/i.test(asset));
    expect(canonical).toBeTruthy();
    expect(existsSync(canonical)).toBe(true);

    expect(catalogSource).toContain("const LIFECYCLE_SOURCE = 'config/release-lifecycle.json'");
    expect(catalogSource).toContain("const GITHUB_RELEASE_CONTRACT_SOURCE = 'config/github-release-contract.json'");
    expect(catalogSource).toContain("assets.find((asset) => /_Canonical_Data\\.json$/i.test(asset))");
    expect(catalogSource).toContain('Release metadata disagrees');
  });

  it('contains no release-number literals in the supported TTS pipeline', () => {
    expect(supportedPipelineText).not.toMatch(/v0\.6\.[0-9]+/);
    expect(packageJson.scripts['tts:check']).toBe('node scripts/generate-tts-card-assets.mjs --check && node scripts/generate-tts-territory-assets.mjs --check');
    expect(packageJson.scripts['tts:catalog']).toBe('node scripts/generate-tts-card-assets.mjs --catalog-only');
    expect(packageJson.scripts['tts:cards']).toBe('node scripts/generate-tts-card-assets.mjs');
    expect(packageJson.scripts['tts:territories']).toBe('node scripts/generate-tts-territory-assets.mjs');
  });

  it('does not duplicate release-specific card or Territory counts', () => {
    expect(catalogSource).not.toContain('EXPECTED_COUNTS');
    expect(catalogSource).not.toContain('neutral: 50');
    expect(cardGenerator).not.toContain('128');
    expect(territoryGenerator).not.toContain('Expected 25 canonical Territories');
    expect(territoryGenerator).not.toContain('Expected four canonical Arenas');
    expect(catalogSource).toContain('counts.playableCards = cardsWithArtwork.length');
    expect(catalogSource).toContain('counts.territories = territories.length');
  });

  it('uses a generated current alias so browser renderers do not need a release-path edit', () => {
    expect(catalogSource).toContain("join(ROOT, 'tts', 'generated', 'current')");
    expect(catalogSource).toContain("writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.js'), catalogJs)");
    expect(cardRenderer).toContain('/tts/generated/current/catalog.js');
    expect(territoryRenderer).toContain('/tts/generated/current/catalog.js');
  });

  it('renders all six production backs from the shared reviewed component', () => {
    for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(catalogSource).toContain(`'${faction}'`);
    }
    expect(cardGenerator).toContain('/tts/back-renderer/?faction=');
    expect(cardGenerator).toContain("const file = `backs/${faction}.png`");
    expect(cardGenerator).toContain('prototypeBack: false');
    expect(cardGenerator).not.toContain('prototypeBackHtml');
    expect(backRenderer).toContain('/card-design/card-back.css');
    expect(backRenderer).toContain('/card-design/card-back.js');
  });

  it('records the player-faction back policy without leaking Neutral-card identity', () => {
    expect(cardGenerator).toContain("assignment: 'player-faction'");
    expect(cardGenerator).toContain('neutralCardsUsePlayerFactionBack: true');
    expect(cardGenerator).toContain('backIsHidden: true');
    expect(cardGenerator).toContain('uniqueBack: false');
    expect(readme).toContain("including Neutral cards");
    expect(readme).toContain("must use that player's faction back");
  });

  it('allows both playable and Territory sheet counts to grow without a release-specific rewrite', () => {
    expect(cardGenerator).toContain('const sheets = chunk(catalog.playableCards, CARDS_PER_SHEET)');
    expect(territoryGenerator).toContain('const sheetGroups = chunk(catalog.territories, TERRITORIES_PER_SHEET)');
    expect(territoryGenerator).toContain('const deckId = FIRST_DECK_ID + sheetIndex');
    expect(readme).toContain('additional sheets/deck IDs created automatically');
  });

  it('keeps CI release-agnostic and watches release authority changes', () => {
    expect(workflow).toContain("'config/release-lifecycle.json'");
    expect(workflow).toContain("'config/github-release-contract.json'");
    expect(workflow).toContain("'releases/**'");
    expect(workflow).toContain('scripts/tts-current-catalog.mjs');
    expect(workflow).toContain('name: gauntlet-current-tts-card-assets');
    expect(workflow).toContain('path: tts/generated/');
    expect(workflow).not.toMatch(/gauntlet-v0?63|v0\.6\.3/);
  });
});
